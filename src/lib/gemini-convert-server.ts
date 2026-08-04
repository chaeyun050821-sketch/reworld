const SVG_OUTPUT_RULES =
  "설명·마크다운 없이 <svg>…</svg> 코드만 출력하세요. "
  + "viewBox='0 0 48 48' width='100%' height='100%'. 배경은 투명(배경용 <rect> 금지). "
  + "도형은 정수 좌표의 작은 정사각형 <rect>만 사용하고, path/circle/blur/gradient/곡선은 쓰지 마세요.";

const BASE_SVG_PROMPT =
  "첨부 이미지는 사용자가 손으로 그린 스케치입니다. "
  + "역할을 '픽셀화'로 한정하세요. 새 그림을 상상하거나 다른 물체로 바꾸지 마세요. "
  + "별이면 별(꼭짓점 개수·방향·비율 동일), 하트면 하트, 얼굴이면 얼굴처럼 "
  + "원본에서 보이는 실루엣·위치·개수·색을 그대로 따르세요. "
  + "둥글게 뭉개거나 이모지/아이콘으로 대체하지 말고, "
  + "스케치 윤곽을 48×48 격자 위의 채워진 픽셀 덩어리로 옮기세요. "
  + "선이 얇으면 1~2픽셀 두께로만 두껍게 해도 되지만 형태는 유지하세요. "
  + SVG_OUTPUT_RULES;

// Edge 30초 한도: flash는 타임아웃, lite + 명확한 형태 유지 프롬프트로 품질/속도 균형.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 26_000;

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
        "첨부 스케치를 레트로 8비트 픽셀 SVG로 변환하세요. "
        + "원본 실루엣·꼭짓점·비율·위치를 유지하고 다른 물체로 바꾸지 마세요.\n"
        + `[사용자 수정]: "${userText}"\n`
        + "수정과 직접 관련된 부분만 최소 반영하세요.\n"
        + SVG_OUTPUT_RULES
      );
    }
    return (
      "첨부 픽셀 아트의 형태는 유지하고, 아래 수정만 반영하세요. 새 그림으로 바꾸지 마세요.\n"
      + `[사용자 수정]: "${userText}"\n`
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
          // 이미지를 먼저 두어 형태를 읽게 한 뒤 변환 규칙을 적용
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: finalPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
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
