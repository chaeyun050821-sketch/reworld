const SVG_OUTPUT_RULES =
  "설명·마크다운 없이 <svg>…</svg> 코드만 출력. width='100%' height='100%'. 배경 투명(배경 rect 금지).";

const BASE_SVG_PROMPT =
  "스케치를 레트로 8비트 픽셀 아트 SVG로 변환. 실루엣·비율·위치 유지, 새로 창조 금지. "
  + "작은 <rect>로 32×32 이하 격자만 사용. blur/곡선/gradient 금지. "
  + SVG_OUTPUT_RULES;

// flash는 Edge 30초 한도에서 타임아웃. lite + 작은 SVG 출력이 가장 안정적.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 50_000;

function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (configured) return configured;
  return DEFAULT_GEMINI_MODEL;
}

function parseRetryAfterSeconds(message: string): number | null {
  const retryMatch = message.match(/retry in ([\d.]+)s/i);
  if (!retryMatch) return null;
  return Math.ceil(Number(retryMatch[1]));
}

function formatGeminiError(message: string, status?: number): string {
  const lower = message.toLowerCase();
  if (lower.includes("high demand") || lower.includes("overloaded") || lower.includes("unavailable")) {
    return "Gemini 서버가 잠시 붐벼요. 1~2분 뒤 다시 시도해 주세요.";
  }
  if (
    status === 429
    || lower.includes("quota")
    || lower.includes("rate limit")
    || lower.includes("resource_exhausted")
  ) {
    const waitSec = parseRetryAfterSeconds(message) ?? 30;
    return (
      `Gemini API 요청 한도에 걸렸어요. (유료 키여도 분당 요청·이미지 처리 한도는 있습니다.) `
      + `${waitSec}초 정도 기다린 뒤 다시 시도해 주세요. `
      + `여러 사람이 동시에 변환하면 같은 키 한도를 나눠 써서 더 자주 걸릴 수 있어요.`
    );
  }
  if (lower.includes("invalid authentication") || lower.includes("api key not valid")) {
    return "Gemini API 키가 올바르지 않아요. Vercel GEMINI_API_KEY 값에 따옴표 없이 AQ. 키 전체를 넣고 재배포해 주세요.";
  }
  if (lower.includes("no longer available") || (status === 404 && lower.includes("not found"))) {
    return `사용 중인 Gemini 모델(${getGeminiModel()})을 쓸 수 없어요. AI Studio에서 사용 가능한 모델로 바꿔 주세요.`;
  }
  return message;
}

export type GeminiConvertRequest = {
  imageBase64: string;
  customPrompt?: string;
  isCustomRefine?: boolean;
  refineFromSketch?: boolean;
};

function cleanSvgResponse(text: string): string {
  return text.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
}

function buildPrompt(customPrompt?: string, isCustomRefine?: boolean, refineFromSketch?: boolean): string {
  const userText = customPrompt?.trim() ?? "";
  if (isCustomRefine && userText !== "") {
    if (refineFromSketch) {
      return (
        "스케치를 8비트 픽셀 SVG로 변환. 실루엣 유지, 32×32 이하 격자.\n"
        + `[수정]: "${userText}"\n`
        + SVG_OUTPUT_RULES
      );
    }
    return (
      "픽셀 SVG 유지, 아래 수정만 반영.\n"
      + `[수정]: "${userText}"\n`
      + SVG_OUTPUT_RULES
    );
  }
  return BASE_SVG_PROMPT;
}

function getGeminiApiKey(): string {
  let key = process.env.GEMINI_API_KEY?.trim() ?? "";
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
  if (!key || key === "YOUR_API_KEY") {
    throw new Error("서버에 Gemini API 키가 설정되지 않았어요.");
  }
  return key;
}

function buildGeminiAuthHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey,
  };
}

async function requestGeminiModel(
  apiKey: string,
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs: number,
  retry = 0,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: buildGeminiAuthHeaders(apiKey),
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const err = new Error("Gemini 응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.") as Error & { status?: number };
      err.status = 408;
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    promptFeedback?: { blockReason?: string };
  };

  if (response.status === 503 && retry < 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return requestGeminiModel(apiKey, model, requestBody, timeoutMs, retry + 1);
  }

  if (response.status === 404 && retry < 1) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return requestGeminiModel(apiKey, model, requestBody, timeoutMs, retry + 1);
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(formatGeminiError(apiMessage, response.status)) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `요청이 차단됐어요: ${blockReason}` : "Gemini가 SVG를 반환하지 않았어요.");
  }

  return cleanSvgResponse(text);
}

export async function convertDrawingWithGemini(payload: GeminiConvertRequest): Promise<string> {
  const imageBase64 = payload.imageBase64?.trim();
  if (!imageBase64) {
    throw new Error("그림 데이터가 없어요.");
  }

  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const finalPrompt = buildPrompt(payload.customPrompt, payload.isCustomRefine, payload.refineFromSketch);
  const requestBody = {
    contents: [
      {
        parts: [
          { text: finalPrompt },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: 2048,
    },
  };

  try {
    return await requestGeminiModel(apiKey, model, requestBody, GEMINI_REQUEST_TIMEOUT_MS);
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err instanceof Error && err.status === 408) {
      throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
    }
    throw err instanceof Error ? err : new Error("변환에 실패했어요.");
  }
}
