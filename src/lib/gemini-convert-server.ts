const SVG_OUTPUT_RULES =
  "응답에는 어떠한 설명이나 마크다운 기호(```svg 등)도 쓰지 말고, 오직 <svg>로 시작해서 </svg>로 끝나는 순수한 태그 코드만 반환하세요. "
  + "크기는 width='100%' height='100%'로 설정해주세요. 배경을 하얀색이나 특정 색으로 채우지 마세요. "
  + "배경은 반드시 투명(Transparent)하게 처리하세요. SVG 코드 안에 <rect> 태그로 배경색을 지정하는 코드가 들어가지 않도록 주의하세요.";

const BASE_SVG_PROMPT =
  "첨부된 이미지는 사용자가 직접 그린 스케치입니다. 원본 실루엣·비율·위치·개수는 유지하면서, "
  + "고품질 레트로 8비트 픽셀 아트 SVG로 변환하세요. "
  + "SVG는 작은 정사각형 <rect> 픽셀들로만 구성하고, blur/gradient/anti-alias 곡선은 쓰지 마세요. "
  + "선은 계단형(jagged) 도트로 선명하게, 색은 원 그림에서 뽑은 8~24색 팔레트로 제한하세요. "
  + "형태를 이모지·아이콘처럼 새로 창조하지 말고, 픽셀 격자에 맞게만 표현하세요. "
  + "디테일은 픽셀 단위로 깔끔하게 정리해도 되지만, 전체 실루엣은 바꾸지 마세요. "
  + SVG_OUTPUT_RULES;

// flash는 품질은 좋지만 Edge 30초 한도에서 자주 타임아웃(504). lite + PNG/프롬프트로 품질 보완.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 22_000;

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
        "첨부된 이미지는 사용자가 직접 그린 스케치입니다. 재창작 금지. "
        + "윤곽·비율·위치·각도·선 개수·연결 관계를 바꾸지 말고, 원본 실루엣 그대로 레트로 8비트 픽셀(계단형 도트) SVG로 변환하세요. "
        + "선을 매끄럽게 하거나 대칭화·이모지화하지 마세요.\n\n"
        + `[사용자 수정 요청]: "${userText}"\n`
        + "요청과 직접 관련된 부분만 최소 반영하고, 나머지는 원본 형태를 유지하세요.\n\n"
        + SVG_OUTPUT_RULES
      );
    }
    return (
      "첨부된 이미지는 레트로 8비트 픽셀 아트입니다. "
      + "형태·구도·픽셀 배치는 최대한 유지하고, 아래 사용자 수정 요청만 반영하세요. "
      + "완전히 새로운 그림으로 다시 만들지 마세요.\n\n"
      + `[사용자 수정 요청]: "${userText}"\n`
      + "요청과 직접 관련된 부분만 최소 반영하세요.\n\n"
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
    await new Promise((resolve) => setTimeout(resolve, 800));
    return requestGeminiModel(apiKey, model, requestBody, timeoutMs, retry + 1);
  }

  if (response.status === 404 && retry < 2) {
    await new Promise((resolve) => setTimeout(resolve, 400));
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
          { inline_data: { mime_type: "image/png", data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
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
