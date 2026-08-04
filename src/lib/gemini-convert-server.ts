const SVG_OUTPUT_RULES =
  "설명·마크다운 없이 <svg>…</svg> 코드만 출력하세요. "
  + "width='100%' height='100%', 배경 투명(배경용 rect 금지). "
  + "도형은 정수 좌표 <rect> 픽셀만 사용하고 path/circle/blur/gradient는 금지하세요.";

const BASE_SVG_PROMPT =
  "첨부 이미지는 흰 배경 위 손그림입니다. 레트로 도트 픽셀 SVG로 변환하세요. "
  + "viewBox는 내용에 맞게 잡되 너무 뭉개지지 않게 하세요(대략 64~128 격자). "
  + SVG_OUTPUT_RULES;

// 현재 배포 기본 모델 (Vercel GEMINI_MODEL로 덮어쓸 수 있음)
export const ACTIVE_GEMINI_MODEL_DEFAULT = "gemini-3.5-flash";
const DEFAULT_GEMINI_MODEL = ACTIVE_GEMINI_MODEL_DEFAULT;
// flash는 lite보다 느림. Edge 30초 한도 안에서 끝나도록 여유 있게 설정.
const GEMINI_REQUEST_TIMEOUT_MS = 28_000;
const MAX_REFINE_SVG_CHARS = 120_000;

type PixelGrid = {
  width: number;
  height: number;
  cells: Map<string, string>;
};

type RefineOp =
  | { type: "recolor"; color: string }
  | { type: "fill"; color: string }
  | { type: "gradient"; style?: "shine" | "vertical" | "radial" }
  | { type: "cleanup" }
  | { type: "dilate"; radius?: number }
  | { type: "erode"; radius?: number }
  | { type: "outline"; color?: string }
  | { type: "flip"; axis?: "x" | "y" }
  | { type: "translate"; dx?: number; dy?: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const u = Math.max(0, Math.min(1, t));
  return rgbToHex(
    ca.r + (cb.r - ca.r) * u,
    ca.g + (cb.g - ca.g) * u,
    ca.b + (cb.b - ca.b) * u,
  );
}

function samplePalette(palette: string[], t: number): string {
  if (palette.length === 0) return "#fbbf24";
  if (palette.length === 1) return palette[0];
  const u = Math.max(0, Math.min(1, t)) * (palette.length - 1);
  const i = Math.floor(u);
  const j = Math.min(palette.length - 1, i + 1);
  return lerpColor(palette[i], palette[j], u - i);
}

/** 기존 픽셀 위치는 그대로 두고 색만 그라데이션/반짝임 적용 */
function applyGradientKeepShape(grid: PixelGrid, style: "shine" | "vertical" | "radial" = "shine"): PixelGrid {
  let minX = grid.width;
  let minY = grid.height;
  let maxX = -1;
  let maxY = -1;
  for (const key of grid.cells.keys()) {
    const [x, y] = key.split(",").map(Number);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (maxX < 0) return cloneGrid(grid);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const maxDist = Math.max(1, Math.hypot(maxX - minX, maxY - minY) / 2);
  // 별이 빛나 보이게: 중심 밝은 크림 → 중간 골드 → 끝 진한 앰버 (노란 오줌톤 단색 금지)
  const shinePalette = ["#fff7d6", "#ffe566", "#fbbf24", "#f59e0b", "#d97706"];
  const next = cloneGrid(grid);

  for (const key of grid.cells.keys()) {
    const [x, y] = key.split(",").map(Number);
    let t = 0;
    if (style === "vertical") {
      t = (y - minY) / Math.max(1, maxY - minY);
    } else {
      // radial / shine: 중심이 밝고 바깥이 깊게
      t = Math.min(1, Math.hypot(x - cx, y - cy) / maxDist);
      if (style === "shine") {
        // 위쪽이 조금 더 밝게
        const topBias = (y - minY) / Math.max(1, maxY - minY);
        t = Math.min(1, t * 0.75 + topBias * 0.25);
      }
    }
    next.cells.set(key, samplePalette(shinePalette, t));
  }
  return next;
}

/** Gemini가 형태를 망가뜨렸을 때: 원본 실루엣에 결과 색만 입힘 */
function remapColorsOntoMask(original: PixelGrid, refined: PixelGrid): PixelGrid {
  const next = cloneGrid(original);
  if (refined.cells.size === 0) return next;

  let rMinX = refined.width;
  let rMinY = refined.height;
  let rMaxX = -1;
  let rMaxY = -1;
  for (const key of refined.cells.keys()) {
    const [x, y] = key.split(",").map(Number);
    if (x < rMinX) rMinX = x;
    if (y < rMinY) rMinY = y;
    if (x > rMaxX) rMaxX = x;
    if (y > rMaxY) rMaxY = y;
  }
  let oMinX = original.width;
  let oMinY = original.height;
  let oMaxX = -1;
  let oMaxY = -1;
  for (const key of original.cells.keys()) {
    const [x, y] = key.split(",").map(Number);
    if (x < oMinX) oMinX = x;
    if (y < oMinY) oMinY = y;
    if (x > oMaxX) oMaxX = x;
    if (y > oMaxY) oMaxY = y;
  }
  const oW = Math.max(1, oMaxX - oMinX);
  const oH = Math.max(1, oMaxY - oMinY);
  const rW = Math.max(1, rMaxX - rMinX);
  const rH = Math.max(1, rMaxY - rMinY);

  for (const key of original.cells.keys()) {
    const [x, y] = key.split(",").map(Number);
    const nx = (x - oMinX) / oW;
    const ny = (y - oMinY) / oH;
    const sx = Math.round(rMinX + nx * rW);
    const sy = Math.round(rMinY + ny * rH);
    let color = refined.cells.get(cellKey(sx, sy));
    if (!color) {
      // 근처 색 탐색
      outer: for (let d = 1; d <= 3; d++) {
        for (let dy = -d; dy <= d; dy++) {
          for (let dx = -d; dx <= d; dx++) {
            color = refined.cells.get(cellKey(sx + dx, sy + dy));
            if (color) break outer;
          }
        }
      }
    }
    if (color) next.cells.set(key, color);
  }
  return next;
}

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
      if (runLen > 0 && color === runColor && x === runX + runLen) runLen += 1;
      else {
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
  return { width: grid.width, height: grid.height, cells: new Map(grid.cells) };
}

function normalizeColor(input: string): string {
  return pickColorFromText(input) || (input.startsWith("#") ? input : "#111827");
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

function pickColorFromText(text: string): string | null {
  const hex = text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (hex) return hex[0];
  for (const [re, color] of COLOR_PATTERNS) {
    if (re.test(text)) return color;
  }
  return null;
}

function countNeighbors(grid: PixelGrid, x: number, y: number): number {
  let n = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    if (grid.cells.has(cellKey(x + dx, y + dy))) n += 1;
  }
  return n;
}

function dilateGrid(grid: PixelGrid, radius = 1): PixelGrid {
  const next = cloneGrid(grid);
  for (const [key, color] of grid.cells) {
    const [x0, y0] = key.split(",").map(Number);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
        if (!next.cells.has(cellKey(x, y))) next.cells.set(cellKey(x, y), color);
      }
    }
  }
  return next;
}

function erodeGrid(grid: PixelGrid): PixelGrid {
  const next: PixelGrid = { width: grid.width, height: grid.height, cells: new Map() };
  for (const [key, color] of grid.cells) {
    const [x0, y0] = key.split(",").map(Number);
    const neighbors = [
      cellKey(x0 + 1, y0),
      cellKey(x0 - 1, y0),
      cellKey(x0, y0 + 1),
      cellKey(x0, y0 - 1),
    ];
    if (neighbors.every((n) => grid.cells.has(n))) next.cells.set(key, color);
  }
  return next.cells.size > 0 ? next : grid;
}

function gridsEqual(a: PixelGrid, b: PixelGrid): boolean {
  if (a.cells.size !== b.cells.size) return false;
  for (const [key, color] of a.cells) {
    if (b.cells.get(key) !== color) return false;
  }
  return true;
}

function majoritySmooth(grid: PixelGrid): PixelGrid {
  const next = cloneGrid(grid);
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      const key = cellKey(x, y);
      const counts = new Map<string, number>();
      let ink = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const c = grid.cells.get(cellKey(x + dx, y + dy));
          if (!c) continue;
          ink += 1;
          counts.set(c, (counts.get(c) || 0) + 1);
        }
      }
      let best = "";
      let bestN = 0;
      for (const [c, n] of counts) {
        if (n > bestN) {
          best = c;
          bestN = n;
        }
      }
      // 움푹 들어간 톱니 메우기
      if (!grid.cells.has(key) && ink >= 5 && best) {
        next.cells.set(key, best);
      }
      // 혼자 튀어나온 점 제거
      if (grid.cells.has(key) && ink <= 1) {
        next.cells.delete(key);
      }
    }
  }
  return next;
}

/** 테두리 다듬기: 톱니 메우기 + 살짝 두껍게 정리 (눈에 띄게) */
function applyCleanup(grid: PixelGrid): PixelGrid {
  let current = majoritySmooth(grid);
  current = majoritySmooth(current);
  // closing으로 끊긴 선 연결
  current = erodeGrid(dilateGrid(current, 1));
  // 다듬기 체감이 있도록 한 픽셀 보강
  current = dilateGrid(current, 1);
  if (gridsEqual(grid, current)) {
    current = dilateGrid(grid, 1);
  }
  return current;
}

function fillInterior(grid: PixelGrid, color: string): PixelGrid {
  const exterior = new Set<string>();
  const queue: Array<[number, number]> = [];
  for (let x = 0; x < grid.width; x++) {
    queue.push([x, 0], [x, grid.height - 1]);
  }
  for (let y = 0; y < grid.height; y++) {
    queue.push([0, y], [grid.width - 1, y]);
  }
  while (queue.length) {
    const [x, y] = queue.pop()!;
    if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) continue;
    const k = cellKey(x, y);
    if (exterior.has(k) || grid.cells.has(k)) continue;
    exterior.add(k);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  const next = cloneGrid(grid);
  let filled = 0;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const k = cellKey(x, y);
      if (!grid.cells.has(k) && !exterior.has(k)) {
        next.cells.set(k, color);
        filled += 1;
      }
    }
  }
  // 닫히지 않은 도형이면 내부를 못 찾을 수 있음 → 실패로 두지 않고 원본 유지 후 AI로 넘기도록 null 신호 대신 그대로 반환
  void filled;
  return next;
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
    if (op.type === "fill") {
      current = fillInterior(current, normalizeColor(op.color));
      continue;
    }
    if (op.type === "gradient") {
      current = applyGradientKeepShape(current, op.style || "shine");
      continue;
    }
    if (op.type === "cleanup") {
      current = applyCleanup(current);
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
      const next: PixelGrid = { width: current.width, height: current.height, cells: new Map() };
      for (const [key, color] of current.cells) {
        const [x0, y0] = key.split(",").map(Number);
        const neighbors = [
          cellKey(x0 + 1, y0),
          cellKey(x0 - 1, y0),
          cellKey(x0, y0 + 1),
          cellKey(x0, y0 - 1),
        ];
        if (neighbors.every((n) => current.cells.has(n))) next.cells.set(key, color);
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
        const x = axis === "x" ? current.width - 1 - x0 : x0;
        const y = axis === "y" ? current.height - 1 - y0 : y0;
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

function detectLocalOps(userText: string): RefineOp[] {
  const text = userText.trim();
  const ops: RefineOp[] = [];

  // 그라데이션/반짝임: 형태 고정, 색만 변경
  if (/(그라데이션|그라디언트|gradient|빛나|반짝|샤인|shine|하이라이트)/i.test(text)) {
    const style = /(세로|위아래|vertical)/i.test(text) ? "vertical" : "shine";
    ops.push({ type: "gradient", style });
    return ops;
  }

  // 테두리 다듬기/정리: Gemini에 맡기면 형태가 붕괴됨 → 로컬 cleanup
  if (
    /(다듬|깔끔|정리|매끄럽)/i.test(text)
    || (/(테두리|외곽|윤곽|outline)/i.test(text) && /(다듬|깔끔|정리|매끄|고쳐|보정)/i.test(text))
  ) {
    ops.push({ type: "cleanup" });
    return ops;
  }

  if (/(굵|두껍|thick|dilate|팽창)/i.test(text) || /선\s*더\s*굵/i.test(text)) {
    ops.push({ type: "dilate", radius: /(많이|더더|아주|매우)/i.test(text) ? 2 : 1 });
  }
  if (/(얇|가늘|thin|erode|침식)/i.test(text)) {
    ops.push({ type: "erode", radius: 1 });
  }
  // 테두리 추가는 "검은 테두리"처럼 색/추가 의미가 있을 때만
  if (/(테두리|외곽|outline|윤곽)/i.test(text) && /(추가|넣어|그려|검정|검은|black|색)/i.test(text)) {
    ops.push({ type: "outline", color: pickColorFromText(text) || "#111827" });
  }
  if (/(좌우|가로).*(반전|뒤집)|flip\s*x|mirror/i.test(text)) {
    ops.push({ type: "flip", axis: "x" });
  } else if (/(상하|세로).*(반전|뒤집)|flip\s*y/i.test(text)) {
    ops.push({ type: "flip", axis: "y" });
  } else if (/(반전|뒤집)/i.test(text)) {
    ops.push({ type: "flip", axis: "x" });
  }

  const wantsFill = /(채우|색칠|내부|안쪽|안을|속을)/i.test(text);
  if (wantsFill) {
    ops.push({ type: "fill", color: pickColorFromText(text) || "#f472b6" });
  }

  const wantsRecolor = /(색|컬러|colour|color|바꿔|변경|칠해)/i.test(text)
    || COLOR_PATTERNS.some(([re]) => re.test(text));
  const onlyFillOrOutline = wantsFill || ops.some((o) => o.type === "outline");
  if (wantsRecolor && !onlyFillOrOutline) {
    const color = pickColorFromText(text);
    if (color) ops.push({ type: "recolor", color });
  } else if (wantsRecolor && wantsFill && /(전체|선도|테두리도|밖도)/i.test(text)) {
    const color = pickColorFromText(text);
    if (color) ops.push({ type: "recolor", color });
  }

  return ops;
}

/** Gemini가 실루엣을 깨도 되는 요청(부위 추가 등)만 true */
function allowSilhouetteBreak(userText: string): boolean {
  return /(추가|그려|만들어|귀|눈|입|다리|팔|새로 그려|완전히 다시)/i.test(userText);
}

/** 단순 편집만이면 로컬, 그 외만 Gemini */
function needsGeminiRefine(_userText: string, localOps: RefineOp[]): boolean {
  if (localOps.some((o) => o.type === "gradient" || o.type === "cleanup")) return false;
  if (localOps.length === 0) return true;
  // 로컬로 처리 가능한 ops가 있으면 Gemini로 안 보냄
  return false;
}

function buildCreativeRefinePrompt(userText: string): string {
  return (
    "당신은 픽셀 아트 편집자입니다. 첨부 이미지는 사용자가 도트 변환으로 만든 결과물입니다.\n"
    + "이 이미지를 보고, 아래 수정 요청을 반영한 개선된 도트 SVG를 만드세요.\n\n"
    + "반드시 지킬 것:\n"
    + "- 첨부 그림이 무엇인지(별·하트·캐릭터 등) 먼저 파악하고, 같은 대상으로 남기세요.\n"
    + "- 전체 실루엣·비율·방향·위치감은 유지하면서 요청만 반영하세요.\n"
    + "- 그라데이션/빛남/색칠/테두리 다듬기/선 교정 요청이면, 그 효과를 첨부 도형 위에 적용하세요.\n"
    + "- 다른 물체·똥·얼룩·무작위 덩어리로 바꾸지 마세요.\n"
    + "- 결과는 한눈에 원래 그림으로 알아볼 수 있어야 합니다.\n"
    + "- 픽셀은 연결감 있게, viewBox는 약 72~112 격자, width/height='100%', 배경 투명, <rect>만 사용.\n"
    + "- 설명 없이 <svg>…</svg>만 출력하세요.\n\n"
    + `[수정 요청]: ${userText}`
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
    throw new Error(blockReason ? `요청이 차단됐어요: ${blockReason}` : "Gemini가 응답하지 않았어요.");
  }
  return text;
}

export async function convertDrawingWithGemini(payload: GeminiConvertRequest): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const userText = payload.customPrompt?.trim() ?? "";
  const svgMarkup = payload.svgMarkup?.trim() ?? "";
  const imageBase64 = payload.imageBase64?.trim() ?? "";

  // 수정하기: 로컬 규칙 없이 Gemini flash가 도트 이미지+요청을 보고 직접 수정
  if (payload.isCustomRefine && userText) {
    if (!imageBase64) {
      throw new Error("AI 수정을 위해 도트 그림이 필요해요. 먼저 ✨ 도트 변환을 해 주세요.");
    }

    const prompt = buildCreativeRefinePrompt(userText);
    try {
      const raw = await requestGeminiModel(
        apiKey,
        model,
        {
          contents: [
            {
              parts: [
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 8192,
          },
        },
        GEMINI_REQUEST_TIMEOUT_MS,
      );
      const refined = extractSvg(raw);

      // 완전 붕괴(픽셀 수가 비정상)일 때만 원본 실루엣에 색을 입혀 응급 복구
      if (svgMarkup.includes("<svg") && !allowSilhouetteBreak(userText)) {
        try {
          const originalGrid = parseSvgToGrid(svgMarkup);
          const refinedGrid = parseSvgToGrid(refined);
          const before = originalGrid.cells.size;
          const after = refinedGrid.cells.size;
          if (before > 0 && (after < before * 0.35 || after > before * 4)) {
            return gridToSvg(remapColorsOntoMask(originalGrid, refinedGrid));
          }
        } catch {
          // refined 그대로 사용
        }
      }
      return refined;
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err instanceof Error && err.status === 408) {
        throw new Error("Gemini 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.");
      }
      throw err instanceof Error ? err : new Error("수정에 실패했어요.");
    }
  }

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
      Math.min(GEMINI_REQUEST_TIMEOUT_MS, 28_000),
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
