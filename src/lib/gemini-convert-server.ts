const BASE_SVG_PROMPT =
  "첨부된 이미지는 사용자가 직접 그린 스케치입니다. 원본 그림의 형태, 궤적, 비율을 임의로 바꾸지 말고 형태를 최대한 유지하되, 전체적인 아트를 '레트로 8비트 픽셀 아트(Pixelated)' 스타일로 변환해 주세요. 선을 부드럽게 만드는 대신, 작은 사각형 픽셀들이 모여서 만들어진 것처럼 투박하고 계단 현상이 있는 도트 그래픽 느낌이 확실하게 나도록 SVG 코드를 구성해 주세요. 완벽한 대칭이나 기성품 이모지처럼 새로 창조하지 마세요. 응답에는 어떠한 설명이나 마크다운 기호(```svg 등)도 쓰지 말고, 오직 <svg>로 시작해서 </svg>로 끝나는 순수한 태그 코드만 반환하세요. 크기는 width='100%' height='100%'로 설정해주세요. 배경을 하얀색이나 특정 색으로 채우지 마세요. 배경은 반드시 투명(Transparent)하게 처리하세요. SVG 코드 안에 <rect> 태그로 배경색을 지정하는 코드가 들어가지 않도록 주의하세요.";

const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
];
const GEMINI_REQUEST_TIMEOUT_MS = 45_000;

function formatGeminiError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("high demand") || lower.includes("overloaded") || lower.includes("unavailable")) {
    return "Gemini 서버가 잠시 붐벼요. 다른 모델로도 실패했어요. 1~2분 뒤 다시 시도해 주세요.";
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted")) {
    const retryMatch = message.match(/retry in ([\d.]+)s/i);
    const waitSec = retryMatch ? Math.ceil(Number(retryMatch[1])) : 60;
    return `Gemini 무료 한도에 걸렸어요. 새 API 키를 만들어도 같은 Google 계정이면 한도가 같아요. ${waitSec}초 후 다시 시도하거나, 다른 Google 계정으로 키를 만들거나 Google AI Studio에서 결제(유료)를 켜 주세요. (AQ. 키는 정상 형식이에요)`;
  }
  if (lower.includes("invalid authentication") || lower.includes("api key not valid")) {
    return "Gemini API 키가 올바르지 않아요. Vercel GEMINI_API_KEY 값에 따옴표 없이 AQ. 키 전체를 넣고 재배포해 주세요.";
  }
  if (lower.includes("no longer available")) {
    return "사용 중인 Gemini 모델을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";
  }
  return message;
}

function shouldTryNextModel(error: Error & { status?: number }): boolean {
  if (error.status === 404) return true;
  if (error.status === 429) return true;
  if (error.status === 503) return true;
  const lower = error.message.toLowerCase();
  return (
    lower.includes("quota")
    || lower.includes("rate limit")
    || lower.includes("resource_exhausted")
    || lower.includes("no longer available")
    || lower.includes("not found")
    || lower.includes("high demand")
    || lower.includes("overloaded")
    || lower.includes("unavailable")
  );
}

export type GeminiConvertRequest = {
  imageBase64: string;
  customPrompt?: string;
  isCustomRefine?: boolean;
};

function cleanSvgResponse(text: string): string {
  return text.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
}

function buildPrompt(customPrompt?: string, isCustomRefine?: boolean): string {
  if (isCustomRefine && (customPrompt?.trim() ?? "") !== "") {
    const userText = customPrompt!.trim();
    return (
      "첨부된 이미지는 이미 완성된 레트로 8비트 픽셀 아트입니다. "
      + "원본의 전체적인 형태·구도·픽셀 스타일은 최대한 유지하면서, 사용자의 수정 요청만 반영해 주세요. "
      + "완전히 새로운 그림으로 다시 만들지 마세요. "
      + "응답에는 설명이나 마크다운 없이 오직 <svg>...</svg>만 반환하세요. "
      + "크기는 width='100%' height='100%', 배경은 투명하게 유지하세요.\n\n"
      + `[사용자 수정 요청사항]: "${userText}"\n`
      + "위 요청사항을 반드시 최우선으로 반영해 주세요."
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
  retry = 0,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);

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
      throw new Error("Gemini 응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    promptFeedback?: { blockReason?: string };
  };

  if (response.status === 503 && retry < 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return requestGeminiModel(apiKey, model, requestBody, retry + 1);
  }

  if (!response.ok) {
    const apiMessage = data?.error?.message || `HTTP ${response.status}`;
    const err = new Error(formatGeminiError(apiMessage)) as Error & { status?: number };
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
  const finalPrompt = buildPrompt(payload.customPrompt, payload.isCustomRefine);
  const requestBody = {
    contents: [
      {
        parts: [
          { text: finalPrompt },
          { inline_data: { mime_type: "image/png", data: imageBase64 } },
        ],
      },
    ],
  };

  let lastError: (Error & { status?: number }) | null = null;
  for (const model of GEMINI_MODELS) {
    try {
      return await requestGeminiModel(apiKey, model, requestBody);
    } catch (error) {
      lastError = error instanceof Error ? (error as Error & { status?: number }) : new Error("변환에 실패했어요.");
      if (!shouldTryNextModel(lastError)) {
        break;
      }
    }
  }

  throw lastError ?? new Error("변환에 실패했어요.");
}
