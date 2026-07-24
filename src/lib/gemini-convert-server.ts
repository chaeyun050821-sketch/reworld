const BASE_SVG_PROMPT =
  "첨부 스케치를 레트로 8비트 픽셀 아트 SVG로 변환하세요. 형태·비율 유지. 설명 없이 <svg>...</svg>만. width='100%' height='100%'. 배경 투명.";

const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.0-flash-lite",
];
const GEMINI_REQUEST_TIMEOUT_MS = 45_000;

function formatGeminiError(message: string): string {
  const lower = message.toLowerCase();
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
  const lower = error.message.toLowerCase();
  return (
    lower.includes("quota")
    || lower.includes("rate limit")
    || lower.includes("resource_exhausted")
    || lower.includes("no longer available")
    || lower.includes("not found")
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
  let finalPrompt = BASE_SVG_PROMPT;
  const userText = customPrompt?.trim() ?? "";

  if (isCustomRefine && userText !== "") {
    finalPrompt += `\n\n[사용자 추가 요청사항]: "${userText}"\n위 추가 요청사항을 '반드시' 최우선으로 반영해서 스타일이나 색상 등을 조정해 줘.`;
  }

  return finalPrompt;
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
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
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
