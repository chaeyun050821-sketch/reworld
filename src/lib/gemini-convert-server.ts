const SVG_OUTPUT_RULES =
  "설명·마크다운 없이 <svg>…</svg> 코드만 출력하세요. "
  + "viewBox='0 0 48 48' width='100%' height='100%'. 배경은 투명(배경용 <rect> 금지). "
  + "도형은 정수 좌표의 작은 정사각형 <rect>만 사용하고, path/circle/blur/gradient/곡선은 쓰지 마세요. "
  + "결과는 한눈에 알아볼 수 있어야 합니다. 1픽셀짜리 끊긴 선으로 형태를 흩뿌리지 마세요.";

const BASE_SVG_PROMPT =
  "첨부 이미지는 흰 배경 위 손그림입니다. 목표는 '알아보기 쉬운 레트로 도트(픽셀) 스티커'입니다. "
  + "먼저 무엇을 그렸는지 파악하세요(별·하트·얼굴·글자 등). "
  + "별(오각별·한 획으로 이은 별 포함)이면 꼭 별처럼 보이게: 꼭짓점 5개, 가운데가 연결된 별 형태. "
  + "아래쪽 꼭짓점이 길면 그 비율도 유지하세요. "
  + "얇은 선을 듬성듬성 따라가지 말고, 선 두께 2~4픽셀 또는 채워진 실루엣으로 표현하세요. "
  + "색은 원본 선 색을 따르고, 다른 물체로 바꾸거나 이모지로 대체하지 마세요. "
  + "그림이 화면 중앙을 크게 차지하도록 배치하세요. "
  + SVG_OUTPUT_RULES;

// Edge 30초 한도: flash는 타임아웃, lite가 안정적.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 26_000;
const MAX_REFINE_SVG_CHARS = 120_000;

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
  imageBase64?: string;
  svgMarkup?: string;
  customPrompt?: string;
  isCustomRefine?: boolean;
  refineFromSketch?: boolean;
};

function cleanSvgResponse(text: string): string {
  return text.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
}

function extractSvg(text: string): string {
  const cleaned = cleanSvgResponse(text);
  const start = cleaned.indexOf("<svg");
  const end = cleaned.lastIndexOf("</svg>");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Gemini가 올바른 SVG를 반환하지 않았어요.");
  }
  return cleaned.slice(start, end + "</svg>".length);
}

function countRects(svg: string): number {
  return (svg.match(/<rect\b/gi) || []).length;
}

function parseViewBox(svg: string): { w: number; h: number } | null {
  const match = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (!match) return null;
  const w = Number(match[3]);
  const h = Number(match[4]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

function assertRefinePreservesShape(originalSvg: string, refinedSvg: string): void {
  const before = countRects(originalSvg);
  const after = countRects(refinedSvg);
  if (before > 0 && after < Math.max(8, Math.floor(before * 0.45))) {
    throw new Error(
      "AI가 도트 형태를 너무 많이 바꿔서 결과를 취소했어요. "
      + "색 변경처럼 간단한 요청으로 다시 시도하거나, 도트 변환 후 다시 수정해 주세요.",
    );
  }

  const vbBefore = parseViewBox(originalSvg);
  const vbAfter = parseViewBox(refinedSvg);
  if (vbBefore && vbAfter) {
    const ratioBefore = vbBefore.w / vbBefore.h;
    const ratioAfter = vbAfter.w / vbAfter.h;
    if (Math.abs(ratioBefore - ratioAfter) > 0.35) {
      throw new Error("AI가 그림 비율을 너무 바꿔서 결과를 취소했어요. 다시 시도해 주세요.");
    }
    // 48x48처럼 격자를 크게 뭉개는 경우 차단
    if (vbBefore.w >= 80 && vbAfter.w <= 56 && vbAfter.w < vbBefore.w * 0.5) {
      throw new Error("AI가 픽셀을 너무 크게 뭉개서 결과를 취소했어요. 다시 시도해 주세요.");
    }
  }
}

function buildRefinePrompt(userText: string, svgMarkup: string): string {
  const vb = parseViewBox(svgMarkup);
  const vbHint = vb ? `원본 viewBox 크기 roughly ${Math.round(vb.w)}x${Math.round(vb.h)}. ` : "";
  return (
    "당신은 SVG 픽셀아트 편집기입니다. 아래 SVG 코드를 직접 수정하세요.\n"
    + "절대 처음부터 다시 그리지 마세요. 대부분의 <rect> x/y/width/height는 그대로 두고, "
    + "요청과 관련된 속성(주로 fill 색, 필요 시 아주 적은 rect 추가/삭제)만 바꾸세요.\n"
    + `${vbHint}`
    + "viewBox 값과 width/height='100%'는 유지하세요. path/circle/polygon/텍스트 설명 금지.\n"
    + `[수정 요청]: ${userText}\n\n`
    + "원본 SVG:\n"
    + svgMarkup
    + "\n\n수정된 전체 SVG만 출력하세요."
  );
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

  return text;
}

/** 색 변경처럼 명확한 요청은 로컬에서 처리해 형태를 100% 유지 */
export function tryLocalSvgColorRefine(svgMarkup: string, customPrompt: string): string | null {
  const text = customPrompt.trim();
  if (!text) return null;

  const named: Array<[RegExp, string]> = [
    [/빨강|빨간|레드|\bred\b/i, "#e11d48"],
    [/파랑|파란|블루|\bblue\b/i, "#2563eb"],
    [/하늘|하늘색|라이트블루|sky/i, "#38bdf8"],
    [/노랑|노란|옐로|\byellow\b/i, "#eab308"],
    [/초록|그린|\bgreen\b/i, "#16a34a"],
    [/분홍|핑크|\bpink\b/i, "#f472b6"],
    [/보라|퍼플|\bpurple\b|\bviolet\b/i, "#9333ea"],
    [/주황|오렌지|\borange\b/i, "#f97316"],
    [/갈색|브라운|\bbrown\b/i, "#92400e"],
    [/검정|검은|블랙|\bblack\b/i, "#111827"],
    [/흰|하얀|화이트|\bwhite\b/i, "#ffffff"],
    [/회색|그레이|\bgray\b|\bgrey\b/i, "#9ca3af"],
  ];

  const hexMatch = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  let nextColor: string | null = hexMatch ? (hexMatch[0].startsWith("#") ? hexMatch[0] : `#${hexMatch[1]}`) : null;
  if (!nextColor) {
    for (const [re, color] of named) {
      if (re.test(text)) {
        nextColor = color;
        break;
      }
    }
  }
  if (!nextColor) return null;

  // 색 변경 의이 있을 때만 (너무 모호한 요청은 AI로)
  if (!/(색|컬러|colour|color|바꿔|변경|칠해|채워)/i.test(text) && !hexMatch) {
    // "파란색으로" 같은 짧은 요청도 허용
    if (!named.some(([re]) => re.test(text))) return null;
  }

  const fills = svgMarkup.match(/fill\s*=\s*["'][^"']+["']/gi) || [];
  if (fills.length === 0) return null;

  return svgMarkup.replace(/fill\s*=\s*["'][^"']+["']/gi, `fill="${nextColor}"`);
}

export async function convertDrawingWithGemini(payload: GeminiConvertRequest): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const userText = payload.customPrompt?.trim() ?? "";
  const svgMarkup = payload.svgMarkup?.trim() ?? "";

  // 수정하기: SVG 코드 편집 (이미지 재해석 금지)
  if (payload.isCustomRefine && userText) {
    if (!svgMarkup.includes("<svg")) {
      throw new Error("수정할 도트 SVG가 없어요. 먼저 도트 변환을 해 주세요.");
    }
    if (svgMarkup.length > MAX_REFINE_SVG_CHARS) {
      throw new Error("도트 그림이 너무 커서 AI 수정이 어려워요. 더 작게 그린 뒤 다시 도트 변환해 주세요.");
    }

    const local = tryLocalSvgColorRefine(svgMarkup, userText);
    if (local) {
      return local;
    }

    const prompt = buildRefinePrompt(userText, svgMarkup);
    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
      },
    };

    try {
      const raw = await requestGeminiModel(apiKey, model, requestBody, GEMINI_REQUEST_TIMEOUT_MS);
      const refined = extractSvg(raw);
      assertRefinePreservesShape(svgMarkup, refined);
      return refined;
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err instanceof Error && err.status === 408) {
        throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
      }
      throw err instanceof Error ? err : new Error("수정에 실패했어요.");
    }
  }

  const imageBase64 = payload.imageBase64?.trim();
  if (!imageBase64) {
    throw new Error("그림 데이터가 없어요.");
  }

  const requestBody = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: BASE_SVG_PROMPT },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  try {
    const raw = await requestGeminiModel(apiKey, model, requestBody, GEMINI_REQUEST_TIMEOUT_MS);
    return extractSvg(raw);
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err instanceof Error && err.status === 408) {
      throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
    }
    throw err instanceof Error ? err : new Error("변환에 실패했어요.");
  }
}
