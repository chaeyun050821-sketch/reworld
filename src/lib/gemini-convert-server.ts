const SVG_OUTPUT_RULES =
  "설명·마크다운 없이 <svg>…</svg> 코드만 출력하세요. "
  + "viewBox='0 0 48 48' width='100%' height='100%'. 배경은 투명(배경용 <rect> 금지). "
  + "도형은 정수 좌표의 작은 정사각형 <rect>만 사용하고, path/circle/blur/gradient/곡선은 쓰지 마세요.";

const BASE_SVG_PROMPT =
  "첨부 이미지는 흰 배경 위 손그림입니다. 레트로 도트 픽셀 SVG로 변환하세요. "
  + SVG_OUTPUT_RULES;

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_REQUEST_TIMEOUT_MS = 26_000;
const MAX_REFINE_SVG_CHARS = 120_000;

type PixelGrid = {
  width: number;
  height: number;
  // key: "x,y" -> fill color
  cells: Map<string, string>;
};

type RefineOp =
  | { type: "recolor"; color: string }
  | { type: "dilate"; radius?: number }
  | { type: "erode"; radius?: number }
  | { type: "outline"; color?: string }
  | { type: "flip"; axis?: "x" | "y" }
  | { type: "translate"; dx?: number; dy?: number };

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

function parseViewBox(svg: string): { w: number; h: number } | null {
  const match = svg.match(/viewBox\s*=\s*["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (!match) return null;
  const w = Number(match[3]);
  const h = Number(match[4]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parseSvgToGrid(svgMarkup: string): PixelGrid {
  const vb = parseViewBox(svgMarkup);
  const width = Math.max(1, Math.round(vb?.w ?? 160));
  const height = Math.max(1, Math.round(vb?.h ?? 120));
  const cells = new Map<string, string>();
  const simpleRectRe = /<rect\b([^>]*)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = simpleRectRe.exec(svgMarkup)) !== null) {
    const attrs = m[1];
    const get = (name: string) => {
      const am = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))
        || attrs.match(new RegExp(`\\b${name}\\s*=\\s*(-?[\\d.]+)`, "i"));
      return am?.[1];
    };
    const x = Math.round(Number(get("x") ?? NaN));
    const y = Math.round(Number(get("y") ?? NaN));
    const w = Math.max(1, Math.round(Number(get("width") ?? 1)));
    const h = Math.max(1, Math.round(Number(get("height") ?? 1)));
    const fill = (get("fill") || "").trim();
    if (!Number.isFinite(x) || !Number.isFinite(y) || !fill || fill === "none") continue;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = x + dx;
        const cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        cells.set(cellKey(cx, cy), fill);
      }
    }
  }

  if (cells.size === 0) {
    throw new Error("도트 SVG에서 픽셀을 읽지 못했어요. 다시 도트 변환 후 수정해 주세요.");
  }

  return { width, height, cells };
}

function gridToSvg(grid: PixelGrid): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid.width} ${grid.height}" width="100%" height="100%" shape-rendering="crispEdges">`,
  ];

  for (let y = 0; y < grid.height; y++) {
    let runX = -1;
    let runColor = "";
    let runLen = 0;
    const flush = () => {
      if (runLen <= 0) return;
      parts.push(`<rect x="${runX}" y="${y}" width="${runLen}" height="1" fill="${runColor}"/>`);
      runX = -1;
      runColor = "";
      runLen = 0;
    };
    for (let x = 0; x < grid.width; x++) {
      const color = grid.cells.get(cellKey(x, y));
      if (!color) {
        flush();
        continue;
      }
      if (runLen > 0 && color === runColor && x === runX + runLen) {
        runLen += 1;
      } else {
        flush();
        runX = x;
        runColor = color;
        runLen = 1;
      }
    }
    flush();
  }

  parts.push("</svg>");
  return parts.join("");
}

function cloneGrid(grid: PixelGrid): PixelGrid {
  return {
    width: grid.width,
    height: grid.height,
    cells: new Map(grid.cells),
  };
}

function normalizeColor(input: string): string {
  const named: Record<string, string> = {
    red: "#e11d48",
    빨강: "#e11d48",
    빨간: "#e11d48",
    레드: "#e11d48",
    blue: "#2563eb",
    파랑: "#2563eb",
    파란: "#2563eb",
    블루: "#2563eb",
    sky: "#38bdf8",
    하늘: "#38bdf8",
    yellow: "#eab308",
    노랑: "#eab308",
    노란: "#eab308",
    green: "#16a34a",
    초록: "#16a34a",
    그린: "#16a34a",
    pink: "#f472b6",
    분홍: "#f472b6",
    핑크: "#f472b6",
    purple: "#9333ea",
    보라: "#9333ea",
    퍼플: "#9333ea",
    orange: "#f97316",
    주황: "#f97316",
    오렌지: "#f97316",
    brown: "#92400e",
    갈색: "#92400e",
    black: "#111827",
    검정: "#111827",
    검은: "#111827",
    white: "#ffffff",
    흰: "#ffffff",
    하얀: "#ffffff",
    gray: "#9ca3af",
    grey: "#9ca3af",
    회색: "#9ca3af",
  };
  const t = input.trim();
  const hex = t.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (hex) return hex[0].startsWith("#") ? hex[0] : `#${hex[1]}`;
  for (const [key, value] of Object.entries(named)) {
    if (t.toLowerCase().includes(key.toLowerCase()) || t.includes(key)) return value;
  }
  return t.startsWith("#") ? t : "#111827";
}

function applyOps(grid: PixelGrid, ops: RefineOp[]): PixelGrid {
  let current = cloneGrid(grid);

  for (const op of ops) {
    if (op.type === "recolor") {
      const color = normalizeColor(op.color);
      const next = cloneGrid(current);
      for (const [key] of current.cells) next.cells.set(key, color);
      current = next;
      continue;
    }

    if (op.type === "dilate") {
      const radius = Math.max(1, Math.min(3, Math.round(op.radius ?? 1)));
      const next = cloneGrid(current);
      for (const [key, color] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy > radius * radius) continue;
            const x = x0 + dx;
            const y = y0 + dy;
            if (x < 0 || y < 0 || x >= current.width || y >= current.height) continue;
            if (!next.cells.has(cellKey(x, y))) next.cells.set(cellKey(x, y), color);
          }
        }
      }
      current = next;
      continue;
    }

    if (op.type === "erode") {
      const radius = Math.max(1, Math.min(2, Math.round(op.radius ?? 1)));
      const next: PixelGrid = { width: current.width, height: current.height, cells: new Map() };
      for (const [key, color] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        let keep = true;
        for (let dy = -radius; dy <= radius && keep; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
            if (!current.cells.has(cellKey(x0 + dx, y0 + dy))) {
              keep = false;
              break;
            }
          }
        }
        // simpler erode: keep only if all 4-neighbors exist
        const neighbors = [
          cellKey(x0 + 1, y0),
          cellKey(x0 - 1, y0),
          cellKey(x0, y0 + 1),
          cellKey(x0, y0 - 1),
        ];
        if (neighbors.every((n) => current.cells.has(n))) {
          next.cells.set(key, color);
        }
      }
      if (next.cells.size > 0) current = next;
      continue;
    }

    if (op.type === "outline") {
      const color = normalizeColor(op.color || "#111827");
      const next = cloneGrid(current);
      for (const [key] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const x = x0 + dx;
          const y = y0 + dy;
          if (x < 0 || y < 0 || x >= current.width || y >= current.height) continue;
          const k = cellKey(x, y);
          if (!current.cells.has(k)) next.cells.set(k, color);
        }
      }
      current = next;
      continue;
    }

    if (op.type === "flip") {
      const axis = op.axis === "y" ? "y" : "x";
      const next: PixelGrid = { width: current.width, height: current.height, cells: new Map() };
      for (const [key, color] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        const x = axis === "x" ? (current.width - 1 - x0) : x0;
        const y = axis === "y" ? (current.height - 1 - y0) : y0;
        next.cells.set(cellKey(x, y), color);
      }
      current = next;
      continue;
    }

    if (op.type === "translate") {
      const dx = Math.round(op.dx ?? 0);
      const dy = Math.round(op.dy ?? 0);
      const next: PixelGrid = { width: current.width, height: current.height, cells: new Map() };
      for (const [key, color] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= current.width || y >= current.height) continue;
        next.cells.set(cellKey(x, y), color);
      }
      if (next.cells.size > 0) current = next;
    }
  }

  return current;
}

const COLOR_PATTERNS: Array<[RegExp, string]> = [
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

function detectLocalOps(userText: string): RefineOp[] {
  const text = userText.trim();
  const ops: RefineOp[] = [];

  if (/(굵|두껍|thick|dilate|팽창)/i.test(text) || /선\s*더\s*굵/i.test(text)) {
    const radius = /(많이|더더|아주|매우)/i.test(text) ? 2 : 1;
    ops.push({ type: "dilate", radius });
  }
  if (/(얇|가늘|thin|erode|침식)/i.test(text)) {
    ops.push({ type: "erode", radius: 1 });
  }
  if (/(테두리|외곽|outline|올라인|윤곽)/i.test(text)) {
    let outlineColor = "#111827";
    for (const [re, color] of COLOR_PATTERNS) {
      if (re.test(text)) {
        outlineColor = color;
        break;
      }
    }
    const hex = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
    if (hex) outlineColor = hex[0];
    ops.push({ type: "outline", color: outlineColor });
  }
  if (/(좌우|가로).*(반전|뒤집)|flip\s*x|mirror/i.test(text)) {
    ops.push({ type: "flip", axis: "x" });
  } else if (/(상하|세로).*(반전|뒤집)|flip\s*y/i.test(text)) {
    ops.push({ type: "flip", axis: "y" });
  } else if (/(반전|뒤집)/i.test(text)) {
    ops.push({ type: "flip", axis: "x" });
  }

  // 색 변경: 테두리 요청에 색이 같이 있으면 recolor는 넣지 않음(outline 색만)
  const wantsRecolor = /(색|컬러|colour|color|바꿔|변경|칠해|채워|으로\s*해)/i.test(text)
    || COLOR_PATTERNS.some(([re]) => re.test(text));
  const onlyOutlineColor = ops.some((o) => o.type === "outline")
    && !/(전체|다|전부|속|안|채우)/i.test(text);
  if (wantsRecolor && !onlyOutlineColor) {
    let color: string | null = null;
    const hex = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
    if (hex) color = hex[0];
    if (!color) {
      for (const [re, c] of COLOR_PATTERNS) {
        if (re.test(text)) {
          color = c;
          break;
        }
      }
    }
    if (color) ops.push({ type: "recolor", color });
  }

  return ops;
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
    throw new Error(blockReason ? `요청이 차단됐어요: ${blockReason}` : "Gemini가 응답하지 않았어요.");
  }

  return text;
}

function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("수정 의도를 이해하지 못했어요. 예: '더 굵게', '테두리 추가', '파란색으로'");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizeOpsFromModel(raw: unknown): RefineOp[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as { ops?: unknown; unsupported?: unknown };
  if (!Array.isArray(obj.ops)) return [];
  const ops: RefineOp[] = [];
  for (const item of obj.ops) {
    if (!item || typeof item !== "object") continue;
    const type = String((item as { type?: string }).type || "").toLowerCase();
    if (type === "recolor") {
      const color = String((item as { color?: string }).color || "").trim();
      if (color) ops.push({ type: "recolor", color });
    } else if (type === "dilate" || type === "thicken") {
      ops.push({ type: "dilate", radius: Number((item as { radius?: number }).radius ?? 1) });
    } else if (type === "erode" || type === "thin") {
      ops.push({ type: "erode", radius: Number((item as { radius?: number }).radius ?? 1) });
    } else if (type === "outline") {
      ops.push({ type: "outline", color: String((item as { color?: string }).color || "#111827") });
    } else if (type === "flip") {
      const axis = String((item as { axis?: string }).axis || "x").toLowerCase() === "y" ? "y" : "x";
      ops.push({ type: "flip", axis });
    } else if (type === "translate") {
      ops.push({
        type: "translate",
        dx: Number((item as { dx?: number }).dx ?? 0),
        dy: Number((item as { dy?: number }).dy ?? 0),
      });
    }
  }
  return ops;
}

async function inferOpsWithGemini(apiKey: string, model: string, userText: string): Promise<RefineOp[]> {
  const prompt =
    "사용자의 도트(픽셀) 그림 수정 요청을 아래 JSON 한 개로만 변환하세요. 설명 금지.\n"
    + '형식: {"ops":[{"type":"recolor|dilate|erode|outline|flip|translate","color?":"#rrggbb","radius?":1,"axis?":"x|y","dx?":0,"dy?":0}]}\n'
    + "지원 의미:\n"
    + "- recolor: 전체 색 변경\n"
    + "- dilate: 선/도형 굵게\n"
    + "- erode: 선/도형 얇게\n"
    + "- outline: 테두리 추가\n"
    + "- flip: 반전\n"
    + "- translate: 이동\n"
    + "형태를 완전히 새로 그리거나 다른 물체로 바꾸는 요청이면 {\"ops\":[],\"unsupported\":true}\n"
    + `요청: ${userText}`;

  const raw = await requestGeminiModel(
    apiKey,
    model,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
      },
    },
    15_000,
  );

  const parsed = extractJsonObject(raw);
  return normalizeOpsFromModel(parsed);
}

export async function convertDrawingWithGemini(payload: GeminiConvertRequest): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const userText = payload.customPrompt?.trim() ?? "";
  const svgMarkup = payload.svgMarkup?.trim() ?? "";

  // 수정하기: 픽셀 격자에 연산을 적용 (형태 유지). Gemini는 의도 JSON만 추론.
  if (payload.isCustomRefine && userText) {
    if (!svgMarkup.includes("<svg")) {
      throw new Error("수정할 도트 SVG가 없어요. 먼저 도트 변환을 해 주세요.");
    }
    if (svgMarkup.length > MAX_REFINE_SVG_CHARS) {
      throw new Error("도트 그림이 너무 커서 수정이 어려워요. 더 작게 그린 뒤 다시 도트 변환해 주세요.");
    }

    const grid = parseSvgToGrid(svgMarkup);
    let ops = detectLocalOps(userText);

    if (ops.length === 0) {
      try {
        ops = await inferOpsWithGemini(apiKey, model, userText);
      } catch (error) {
        const err = error as Error & { status?: number };
        if (err instanceof Error && err.status === 408) {
          throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
        }
        throw err instanceof Error ? err : new Error("수정 요청을 이해하지 못했어요.");
      }
    }

    if (ops.length === 0) {
      throw new Error(
        "그 수정은 아직 지원하지 않아요. "
        + "예: '파란색으로', '더 굵게', '더 얇게', '검은 테두리', '좌우 반전'",
      );
    }

    const next = applyOps(grid, ops);
    return gridToSvg(next);
  }

  const imageBase64 = payload.imageBase64?.trim();
  if (!imageBase64) {
    throw new Error("그림 데이터가 없어요.");
  }

  try {
    const raw = await requestGeminiModel(
      apiKey,
      model,
      {
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
      },
      GEMINI_REQUEST_TIMEOUT_MS,
    );
    return extractSvg(raw);
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err instanceof Error && err.status === 408) {
      throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
    }
    throw err instanceof Error ? err : new Error("변환에 실패했어요.");
  }
}
