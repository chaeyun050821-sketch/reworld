import type { PixelRect, RoomCategory, RoomInteriorItem, RoomSlot } from "./data";

/* ── Room grid helpers (viewBox 440×440) ── */
const S = 2;
const LW = 220;
const LH = 154;
const LFY = 153;
const LFH = 67;
const FLOOR_SHIFT = 53;
const FLOOR_TOP = 306;

const p = (x: number, y: number, w: number, h: number, fill: string, extra?: Partial<PixelRect>): PixelRect =>
  ({ x: x * S, y: y * S, w: w * S, h: h * S, fill, ...extra });

const pf = (x: number, y: number, w: number, h: number, fill: string, extra?: Partial<PixelRect>): PixelRect =>
  p(x, y + FLOOR_SHIFT, w, h, fill, extra);

const f = (x: number, y: number, w: number, h: number, fill: string, extra?: Partial<PixelRect>): PixelRect =>
  ({ x, y, w, h, fill, ...extra });

function sprite(ox: number, oy: number, rows: string[], palette: Record<string, string>, unit = 2): PixelRect[] {
  const out: PixelRect[] = [];
  rows.forEach((row, gy) => {
    [...row].forEach((ch, gx) => {
      if (ch === "." || ch === " ") return;
      const fill = palette[ch];
      if (!fill) return;
      out.push(f(ox + gx * unit, oy + gy * unit, unit, unit, fill));
    });
  });
  return out;
}

function wallFill(color: string, extra?: Partial<PixelRect>): PixelRect {
  return p(0, 0, LW, LH, color, extra);
}

function floorChecker(c1: string, c2: string): PixelRect[] {
  const rows = Math.ceil(LFH / 10);
  return Array.from({ length: 22 }, (_, i) =>
    Array.from({ length: rows }, (_, j) =>
      pf(i * 10, LFY - FLOOR_SHIFT + j * 10, 10, 10, (i + j) % 2 === 0 ? c1 : c2),
    ),
  ).flat();
}

function floorWood(base: string, grain: string, plank: string): PixelRect[] {
  const rows = Math.ceil(LFH / 10);
  return [
    pf(0, LFY - FLOOR_SHIFT, LW, LFH, base),
    ...Array.from({ length: 22 }, (_, i) => pf(i * 10, LFY - FLOOR_SHIFT, 1, LFH, grain, { opacity: 0.28 })),
    ...Array.from({ length: rows }, (_, j) =>
      Array.from({ length: 22 }, (_, i) =>
        pf(i * 10, LFY - FLOOR_SHIFT + j * 10, 10, 5, (i + j) % 2 === 0 ? plank : base, { opacity: 0.22 }),
      ),
    ).flat(),
  ];
}

function floorPlanks(c1: string, c2: string, line: string): PixelRect[] {
  const rows = Math.ceil(LFH / 5);
  return [
    pf(0, LFY - FLOOR_SHIFT, LW, LFH, c1),
    ...Array.from({ length: rows }, (_, j) =>
      pf(0, LFY - FLOOR_SHIFT + j * 5, LW, 1, line, { opacity: 0.35 }),
    ),
  ];
}

function rugBase(x: number, y: number, w: number, h: number, fill: string, border?: string): PixelRect[] {
  const rects: PixelRect[] = [pf(x, y, w, h, fill, { opacity: 0.92 })];
  if (border) rects.push(pf(x + 1, y + 1, w - 2, h - 2, "none", { stroke: border, strokeWidth: 2 }));
  return rects;
}

const MISC_X_SHIFT = 76;

const LEFT_PROP_DX = -8;
const LEFT_PROP_DY = 18;
const RIGHT_PROP_DY = 16;

function shiftLegacyPx(pixels: PixelRect[], dx: number, dy: number): PixelRect[] {
  return pixels.map((r) => ({ ...r, x: r.x + dx * S, y: r.y + dy * S }));
}

function leftPropPlace(pixels: PixelRect[]): PixelRect[] {
  return shiftLegacyPx(pixels, LEFT_PROP_DX, LEFT_PROP_DY);
}

function rightPropPlace(pixels: PixelRect[]): PixelRect[] {
  return shiftLegacyPx(pixels, 0, RIGHT_PROP_DY);
}

function shadow(x: number, y: number, w: number, h: number): PixelRect {
  return pf(x, y, w, h, "#2a2040", { opacity: 0.12 });
}

/** Shift misc items toward the floor area (legacy x offset) */
function miscPlace(pixels: PixelRect[]): PixelRect[] {
  return pixels.map((r) => ({ ...r, x: r.x + MISC_X_SHIFT * S }));
}

/** Floor contact line in legacy pf coords (bottom of object sits here) */
const FLOOR_LINE = 100;

/** Room Y (px) where left-prop items meet the floor — matches cat feet / shadow line. */
export const ROOM_LEFT_PROP_FLOOR_Y = (FLOOR_LINE + 14 + FLOOR_SHIFT + LEFT_PROP_DY) * S;

/** Floor pot — bottom flush with room floor, soil at top */
function floorPot(lx: number, w: number, h: number, body: string, inner: string, soil = "#4a3828"): PixelRect[] {
  const y = FLOOR_LINE - h;
  return [
    pf(lx, y, w, h, body),
    pf(lx + 1, y + 1, w - 2, h - 2, inner),
    pf(lx + 1, y, w - 2, Math.min(2, h - 1), soil),
  ];
}

function monsteraPixels(): PixelRect[] {
  return [
    shadow(22, 98, 14, 2),
    ...floorPot(24, 11, 8, "#c87848", "#a86038"),
    pf(27, 90, 2, 2, "#4a6830"),
    pf(30, 88, 2, 4, "#4a6830"),
    pf(33, 89, 2, 3, "#4a6830"),
    pf(20, 82, 7, 6, "#4a9838"),
    pf(21, 83, 2, 4, "#68b850"),
    pf(23, 84, 2, 2, "#2a5820"),
    pf(34, 80, 8, 7, "#4a9838"),
    pf(35, 81, 2, 5, "#68b850"),
    pf(38, 84, 2, 2, "#2a5820"),
    pf(26, 74, 8, 7, "#58a840"),
    pf(27, 75, 3, 4, "#78c860"),
    pf(30, 78, 2, 2, "#2a5820"),
    pf(31, 72, 6, 5, "#509830"),
    pf(32, 73, 2, 2, "#78c860"),
  ];
}

function cactusPixels(): PixelRect[] {
  return [
    shadow(180, 98, 14, 2),
    ...floorPot(182, 11, 8, "#f2f0ec", "#ddd8d0"),
    pf(185, 78, 6, 14, "#3d8830"),
    pf(186, 79, 4, 12, "#58a848"),
    pf(187, 80, 2, 8, "#78c868"),
    pf(183, 84, 2, 5, "#48a038"),
    pf(191, 86, 2, 4, "#48a038"),
    pf(186, 82, 1, 1, "#fffff0", { opacity: 0.55 }),
    pf(188, 88, 1, 1, "#fffff0", { opacity: 0.55 }),
    pf(190, 80, 1, 1, "#fffff0", { opacity: 0.55 }),
    pf(187, 76, 2, 2, "#ff80b0"),
    pf(186, 77, 1, 1, "#ffe060"),
  ];
}

function bonsaiPixels(): PixelRect[] {
  return [
    shadow(98, 98, 16, 2),
    pf(98, 94, 14, 6, "#7a5038"),
    pf(99, 95, 12, 4, "#604030"),
    pf(100, 94, 10, 2, "#3a2818"),
    pf(98, 98, 14, 2, "#5a3828"),
    pf(104, 84, 3, 10, "#6b4423"),
    pf(103, 86, 1, 4, "#5a3818"),
    pf(107, 82, 2, 3, "#5a3818"),
    pf(98, 76, 7, 5, "#3a6830"),
    pf(99, 77, 4, 2, "#4a8840"),
    pf(108, 74, 8, 6, "#3a7830"),
    pf(109, 75, 4, 3, "#5a9850"),
    pf(102, 70, 7, 5, "#2a5828"),
    pf(103, 71, 3, 2, "#4a8840"),
    pf(105, 72, 2, 1, "#6ab860"),
  ];
}

function shelfPlantsPixels(): PixelRect[] {
  return [
    p(20, 22, 44, 3, "#c89860"),
    p(20, 23, 44, 1, "#a07038", { opacity: 0.45 }),
    p(18, 24, 3, 10, "#a07038"),
    p(62, 24, 3, 10, "#a07038"),
    p(24, 20, 7, 5, "#ffb8d0"),
    p(25, 21, 5, 3, "#ff98b8"),
    p(25, 20, 5, 1, "#4a4030"),
    p(26, 15, 3, 3, "#68a848"),
    p(25, 16, 5, 3, "#88c858"),
    p(26, 17, 3, 1, "#a8e878"),
    p(24, 17, 2, 2, "#509838"),
    p(29, 17, 2, 2, "#509838"),
    p(48, 18, 7, 6, "#90c0e8"),
    p(49, 19, 5, 4, "#70a0d0"),
    p(49, 18, 5, 1, "#4a4030"),
    p(51, 13, 2, 5, "#509838"),
    p(50, 12, 3, 2, "#68b850"),
    p(53, 14, 2, 2, "#78c860"),
    p(54, 25, 2, 2, "#408828"),
    p(55, 27, 2, 3, "#509838"),
    p(52, 26, 2, 4, "#509838"),
    p(49, 28, 2, 5, "#408828"),
    p(48, 30, 2, 4, "#509838"),
  ];
}

function tulipVasePixels(): PixelRect[] {
  return [
    shadow(180, 98, 14, 2),
    pf(182, 88, 10, 12, "#d8ecff", { opacity: 0.88 }),
    pf(183, 90, 8, 8, "#c0e0ff", { opacity: 0.75 }),
    pf(184, 96, 6, 4, "#b0d4f0"),
    pf(183, 92, 8, 1, "#ffffff", { opacity: 0.35 }),
    pf(185, 80, 1, 8, "#508838"),
    pf(188, 78, 1, 10, "#508838"),
    pf(191, 81, 1, 7, "#508838"),
    pf(184, 76, 3, 3, "#ff6090"),
    pf(187, 74, 3, 4, "#ff5088"),
    pf(190, 77, 3, 3, "#ff7098"),
    pf(185, 77, 1, 1, "#ffe060"),
    pf(188, 75, 1, 1, "#ffe060"),
  ];
}

function guitarPixels(): PixelRect[] {
  return [
    shadow(24, 98, 14, 2),
    pf(26, 90, 14, 10, "#d4a060"),
    pf(27, 91, 12, 8, "#e8c898"),
    pf(29, 93, 6, 5, "#403020", { opacity: 0.5 }),
    pf(28, 98, 10, 1, "#604020"),
    pf(32, 72, 4, 18, "#b88040"),
    pf(31, 70, 6, 3, "#a07038"),
    pf(30, 70, 2, 2, "#909090"),
    pf(34, 70, 2, 2, "#909090"),
    pf(33, 72, 1, 18, "#c0c0c0", { opacity: 0.45 }),
    pf(33, 74, 1, 14, "#e8e8e8", { opacity: 0.35 }),
  ];
}

function floorLampPixels(): PixelRect[] {
  return [
    shadow(26, 98, 10, 2),
    pf(28, 96, 8, 4, "#686878"),
    pf(29, 97, 6, 2, "#888898"),
    pf(31, 78, 2, 18, "#787888"),
    pf(26, 66, 12, 10, "#ffe878"),
    pf(27, 67, 10, 8, "#fff0a8"),
    pf(28, 68, 8, 6, "#ffe060"),
    pf(27, 76, 10, 2, "#fff8d0", { opacity: 0.5 }),
  ];
}

function catPixels(): PixelRect[] {
  return [
    shadow(22, 112, 14, 2),
    pf(26, 104, 12, 10, "#ffb0d0"),
    pf(27, 105, 10, 8, "#ffc8e0"),
    pf(28, 94, 10, 10, "#ffb0d0"),
    pf(29, 95, 8, 8, "#ffd0e8"),
    pf(28, 92, 3, 3, "#ffb0d0"),
    pf(35, 92, 3, 3, "#ffb0d0"),
    pf(29, 92, 2, 2, "#ff98b8"),
    pf(36, 92, 2, 2, "#ff98b8"),
    pf(30, 99, 2, 2, "#403030"),
    pf(34, 99, 2, 2, "#403030"),
    pf(32, 101, 2, 2, "#604040"),
    pf(31, 102, 4, 2, "#ff8090"),
    pf(24, 106, 3, 2, "#ffb0d0"),
    pf(22, 104, 2, 3, "#ff90c0"),
    pf(27, 112, 3, 2, "#ff98b8"),
    pf(34, 112, 3, 2, "#ff98b8"),
  ];
}

function teddyBearPixels(): PixelRect[] {
  return [
    shadow(180, 112, 14, 2),
    pf(184, 108, 4, 6, "#d4a878"),
    pf(192, 108, 4, 6, "#d4a878"),
    pf(183, 98, 14, 12, "#d4a878"),
    pf(184, 99, 12, 10, "#e8c898"),
    pf(186, 102, 8, 4, "#c89860"),
    pf(181, 100, 3, 8, "#d4a878"),
    pf(196, 100, 3, 8, "#d4a878"),
    pf(185, 86, 10, 12, "#d4a878"),
    pf(186, 87, 8, 10, "#e8c898"),
    pf(184, 84, 4, 4, "#d4a878"),
    pf(192, 84, 4, 4, "#d4a878"),
    pf(185, 85, 2, 2, "#c89860"),
    pf(193, 85, 2, 2, "#c89860"),
    pf(188, 90, 4, 3, "#dcc090"),
    pf(188, 89, 1, 1, "#403020"),
    pf(191, 89, 1, 1, "#403020"),
    pf(189, 91, 1, 1, "#604030"),
    pf(189, 92, 2, 1, "#806050"),
    pf(187, 98, 6, 2, "#ff6080"),
  ];
}

function candleSetPixels(): PixelRect[] {
  return [
    shadow(176, 98, 22, 2),
    pf(176, 94, 24, 6, "#c89860"),
    pf(177, 95, 22, 4, "#b88040"),
    pf(178, 84, 4, 10, "#ffe878"),
    pf(179, 85, 2, 8, "#fff8c0"),
    pf(179, 82, 2, 2, "#ff9040"),
    pf(180, 82, 1, 1, "#ffe060", { opacity: 0.85 }),
    pf(186, 82, 4, 12, "#ffb0d0"),
    pf(187, 83, 2, 10, "#ffc8e0"),
    pf(187, 79, 2, 3, "#ff9040"),
    pf(188, 79, 1, 1, "#ffe060", { opacity: 0.85 }),
    pf(194, 85, 4, 9, "#c8eeff"),
    pf(195, 86, 2, 7, "#e8f4ff"),
    pf(195, 82, 2, 2, "#ff9040"),
    pf(196, 82, 1, 1, "#ffe060", { opacity: 0.85 }),
  ];
}

/* ═══════════════════════════════════════════
   WALLPAPER (5)
═══════════════════════════════════════════ */
const WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "wp-cream-waffle",
    categoryId: "wallpaper",
    label: "크림 와플",
    color: "#f5ebe0",
    preview: "🧇",
    layer: 0,
    pixels: [
      wallFill("#faf6f0"),
      ...Array.from({ length: Math.floor(LH / 8) * 11 }, (_, i) => {
        const gx = (i % 11) * 20;
        const gy = Math.floor(i / 11) * 8;
        return p(gx, gy, 18, 6, "#f0e8dc", { opacity: 0.55 });
      }),
    ],
  },
  {
    id: "wp-lavender-stripe",
    categoryId: "wallpaper",
    label: "라벤더 스트라이프",
    color: "#c8b0ff",
    preview: "💜",
    layer: 0,
    pixels: [
      wallFill("#f4efff"),
      ...Array.from({ length: 11 }, (_, i) => p(i * 20, 0, 10, LH, i % 2 === 0 ? "#e8dcff" : "#ddd0ff", { opacity: 0.7 })),
      ...Array.from({ length: 11 }, (_, i) => p(i * 20 + 10, 0, 1, LH, "#c8b0ff", { opacity: 0.25 })),
    ],
  },
  {
    id: "wp-blush-dots",
    categoryId: "wallpaper",
    label: "블러쉬 도트",
    color: "#ffb0d0",
    preview: "🌸",
    layer: 0,
    pixels: [
      wallFill("#fff5f8"),
      ...Array.from({ length: Math.floor(LH / 12) * 15 }, (_, i) =>
        p(6 + (i % 15) * 14, 4 + Math.floor(i / 15) * 12, 3, 3, "#ffd0e4", { opacity: 0.65 }),
      ),
    ],
  },
  {
    id: "wp-sage-panel",
    categoryId: "wallpaper",
    label: "세이지 패널",
    color: "#9ec4a8",
    preview: "🌿",
    layer: 0,
    pixels: [
      wallFill("#eef6f0"),
      ...Array.from({ length: 22 }, (_, i) => p(i * 10, 0, 1, LH, "#c8ddd0", { opacity: 0.45 })),
      ...Array.from({ length: Math.floor(LH / 18) }, (_, i) => p(0, i * 18, LW, 8, "#dceee4", { opacity: 0.5 })),
    ],
  },
  {
    id: "wp-sky-cloud",
    categoryId: "wallpaper",
    label: "하늘 구름",
    color: "#a8d4ff",
    preview: "☁️",
    layer: 0,
    pixels: [
      wallFill("#eef6ff"),
      ...Array.from({ length: 8 }, (_, i) =>
        p(8 + (i * 27) % LW, 12 + (i * 19) % (LH - 30), 16, 8, "#dceeff", { opacity: 0.75 }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        p(14 + (i * 33) % LW, 40 + (i * 23) % (LH - 50), 12, 6, "#d0e8ff", { opacity: 0.6 }),
      ),
    ],
  },
];

/* ═══════════════════════════════════════════
   FLOOR (5)
═══════════════════════════════════════════ */
const FLOOR_ITEMS: RoomInteriorItem[] = [
  { id: "fl-oak-warm", categoryId: "floor", label: "웜 오크", color: "#c89860", preview: "🪵", layer: 1, pixels: floorWood("#e8c898", "#b88050", "#dcc080") },
  { id: "fl-walnut", categoryId: "floor", label: "월넛", color: "#8b6040", preview: "🟫", layer: 1, pixels: floorWood("#c8a070", "#7a5030", "#b89060") },
  { id: "fl-marble", categoryId: "floor", label: "화이트 마블", color: "#e8e8f0", preview: "⬜", layer: 1, pixels: [
    pf(0, LFY - FLOOR_SHIFT, LW, LFH, "#f4f4f8"),
    ...Array.from({ length: 14 }, (_, i) => pf(4 + (i * 17) % LW, LFY - FLOOR_SHIFT + (i * 9) % LFH, 12, 1, "#dcdce8", { opacity: 0.5 })),
    ...Array.from({ length: 10 }, (_, i) => pf(8 + (i * 21) % LW, LFY - FLOOR_SHIFT + (i * 13) % LFH, 1, 10, "#e0e0ec", { opacity: 0.4 })),
  ] },
  { id: "fl-checker-slate", categoryId: "floor", label: "슬레이트 체크", color: "#b0b8c8", preview: "♟️", layer: 1, pixels: floorChecker("#eceef4", "#d8dce8") },
  { id: "fl-lilac-pastel", categoryId: "floor", label: "파스텔 라일락", color: "#c8a0ff", preview: "💜", layer: 1, pixels: floorChecker("#ede4f8", "#ddd0f0") },
  { id: "fl-terracotta", categoryId: "floor", label: "테라코타", color: "#d08060", preview: "🧱", layer: 1, pixels: floorPlanks("#e8a888", "#d89070", "#c07050") },
];

/* ═══════════════════════════════════════════
   RUG (5 + none)
═══════════════════════════════════════════ */
const RUG_ITEMS: RoomInteriorItem[] = [
  { id: "rug-none", categoryId: "rug", label: "없음", color: "#ccc", preview: "✕", layer: 2, pixels: [] },
  {
    id: "rug-round-cream",
    categoryId: "rug",
    label: "크림 원형",
    color: "#ffe8c8",
    preview: "⭕",
    layer: 2,
    pixels: [
      shadow(62, 118, 72, 6),
      ...rugBase(56, 112, 88, 32, "#ffe8c8", "#e8c898"),
      pf(68, 120, 64, 16, "#fff4e0", { opacity: 0.55 }),
      ...sprite(188, FLOOR_TOP + 38, ["....aa....", "...aAAa...", "..aAAAAa..", ".aAAAAAAa.", "..aAAAAa..", "...aAAa..."], { a: "#f0dcc0", A: "#ffe8c8" }, 2),
    ],
  },
  {
    id: "rug-heart-pink",
    categoryId: "rug",
    label: "하트 핑크",
    color: "#ff99cc",
    preview: "💗",
    layer: 2,
    pixels: [
      shadow(58, 118, 80, 6),
      ...rugBase(52, 110, 96, 36, "#ffd0e8", "#ff80b8"),
      ...sprite(192, FLOOR_TOP + 40, ["..hh..", ".hHHh.", "hHHHHh", "hHHHHh", ".hHHh.", "..hh.."], { h: "#ff90c0", H: "#ffb8d8" }, 2),
    ],
  },
  {
    id: "rug-stripe-pastel",
    categoryId: "rug",
    label: "파스텔 줄무늬",
    color: "#ffe080",
    preview: "🌈",
    layer: 2,
    pixels: [
      shadow(50, 118, 88, 6),
      ...rugBase(48, 110, 104, 36, "#fff8e8", "#e8d8b0"),
      pf(48, 114, 104, 5, "#ffd0e8", { opacity: 0.55 }),
      pf(48, 122, 104, 5, "#c8eeff", { opacity: 0.55 }),
      pf(48, 130, 104, 5, "#d8f0c8", { opacity: 0.55 }),
      pf(48, 138, 104, 5, "#ffe8a0", { opacity: 0.55 }),
    ],
  },
  {
    id: "rug-geometric-blue",
    categoryId: "rug",
    label: "지오 블루",
    color: "#80c8ff",
    preview: "🔷",
    layer: 2,
    pixels: [
      shadow(54, 118, 84, 6),
      ...rugBase(50, 110, 92, 34, "#d0e8ff", "#80b8e8"),
      ...Array.from({ length: 5 }, (_, i) => pf(54 + i * 16, 114 + (i % 2) * 8, 12, 12, i % 2 === 0 ? "#a8d4ff" : "#c8e8ff", { opacity: 0.65 })),
    ],
  },
  {
    id: "rug-floral-vintage",
    categoryId: "rug",
    label: "빈티지 플로럴",
    color: "#d8a878",
    preview: "🌺",
    layer: 2,
    pixels: [
      shadow(52, 118, 88, 6),
      ...rugBase(50, 110, 96, 34, "#f0e0c8", "#c8a878"),
      ...sprite(188, FLOOR_TOP + 42, ["..ff..", ".fFFf.", "fFpPfF", ".fFFf.", "..ff.."], { f: "#e8c898", F: "#f0dcc0", p: "#ffb0d0" }, 2),
      ...sprite(220, FLOOR_TOP + 52, ["..ff..", ".fFFf.", "fFpPfF", ".fFFf.", "..ff.."], { f: "#e8c898", F: "#f0dcc0", p: "#c8eeff" }, 2),
    ],
  },
];

/* ═══════════════════════════════════════════
   LARGE FURNITURE (5)
═══════════════════════════════════════════ */
const LARGE_FURNITURE_ITEMS: RoomInteriorItem[] = [
  {
    id: "lf-bookshelf-oak",
    categoryId: "large-furniture",
    label: "오크 책장",
    color: "#c89860",
    preview: "📚",
    layer: 3,
    pixels: [
      shadow(8, 96, 56, 4),
      pf(8, 48, 56, 52, "#c89860"),
      pf(10, 50, 52, 48, "#b88048"),
      pf(10, 62, 52, 2, "#a07038"),
      pf(10, 76, 52, 2, "#a07038"),
      pf(10, 90, 52, 2, "#a07038"),
      pf(12, 54, 8, 6, "#ff7070"), pf(22, 56, 7, 5, "#6080ff"), pf(32, 52, 8, 7, "#60c070"),
      pf(42, 55, 6, 6, "#ffe060"), pf(14, 68, 9, 6, "#ffb0d8"), pf(28, 66, 7, 7, "#90c8ff"),
      pf(40, 68, 8, 6, "#c8a0ff"), pf(16, 80, 10, 5, "#80e0b0"), pf(34, 82, 6, 8, "#ffa880"),
      pf(8, 98, 56, 3, "#a07038"),
    ],
  },
  {
    id: "lf-wardrobe-white",
    categoryId: "large-furniture",
    label: "화이트 옷장",
    color: "#f0eef8",
    preview: "🚪",
    layer: 3,
    pixels: [
      shadow(10, 96, 52, 4),
      pf(10, 50, 52, 50, "#f0eef8"),
      pf(12, 52, 48, 46, "#e8e6f0"),
      pf(34, 52, 2, 46, "#d0cee0"),
      pf(20, 74, 3, 3, "#ffd060"), pf(42, 74, 3, 3, "#ffd060"),
      pf(12, 54, 20, 42, "#f4f2fa", { opacity: 0.5 }),
      pf(36, 54, 22, 42, "#eceaf4", { opacity: 0.5 }),
      pf(10, 98, 52, 2, "#c8c6d8"),
    ],
  },
  {
    id: "lf-desk-pc",
    categoryId: "large-furniture",
    label: "PC 데스크",
    color: "#9090e0",
    preview: "💻",
    layer: 3,
    pixels: [
      shadow(10, 96, 68, 4),
      pf(10, 82, 68, 3, "#c89860"),
      pf(12, 85, 3, 14, "#a07038"), pf(72, 85, 3, 14, "#a07038"),
      pf(24, 54, 36, 28, "#e8e8f8"),
      pf(26, 56, 32, 24, "#9090e0"),
      pf(28, 58, 28, 18, "#b0c8ff", { opacity: 0.65 }),
      pf(36, 80, 12, 2, "#d0d0e8"),
      pf(20, 78, 28, 2, "#d8d8e8"),
      pf(28, 88, 24, 12, "#ff90c8"),
      pf(28, 84, 24, 5, "#ff70b8"),
      pf(30, 90, 8, 4, "#ffe060"),
    ],
  },
  {
    id: "lf-dresser-pink",
    categoryId: "large-furniture",
    label: "핑크 서랍장",
    color: "#ffb0d0",
    preview: "🎀",
    layer: 3,
    pixels: [
      shadow(12, 96, 48, 4),
      pf(12, 68, 48, 32, "#ffb0d0"),
      pf(14, 70, 44, 28, "#ffa0c8"),
      pf(14, 78, 44, 2, "#ff88b8"),
      pf(14, 86, 44, 2, "#ff88b8"),
      pf(32, 74, 4, 2, "#ffd060"), pf(32, 82, 4, 2, "#ffd060"),
      pf(16, 72, 10, 4, "#ffe8f4", { opacity: 0.5 }),
      ...sprite(52, FLOOR_TOP - 8, ["..mm..", ".mMMm.", "mMffMm", ".mMMm.", "..mm.."], { m: "#ffb0d0", M: "#ffc8e0", f: "#ffe060" }, 2),
    ],
  },
  {
    id: "lf-tv-stand",
    categoryId: "large-furniture",
    label: "TV 스탠드",
    color: "#606080",
    preview: "📺",
    layer: 3,
    pixels: [
      shadow(8, 96, 60, 4),
      pf(8, 78, 60, 22, "#606080"),
      pf(10, 80, 56, 18, "#505070"),
      pf(14, 58, 48, 22, "#303050"),
      pf(16, 60, 44, 18, "#8090c0", { opacity: 0.75 }),
      pf(20, 64, 36, 10, "#a0b8e8", { opacity: 0.5 }),
      pf(30, 82, 16, 2, "#404060"),
      pf(12, 98, 4, 2, "#404060"), pf(60, 98, 4, 2, "#404060"),
    ],
  },
];

/* ═══════════════════════════════════════════
   SOFA (5)
═══════════════════════════════════════════ */
const SOFA_ITEMS: RoomInteriorItem[] = [
  {
    id: "sf-blush-loveseat",
    categoryId: "sofa",
    label: "블러쉬 2인",
    color: "#ff90c8",
    preview: "🛋️",
    layer: 4,
    pixels: [
      shadow(58, 108, 84, 5),
      pf(58, 88, 84, 22, "#ff90c8"),
      pf(54, 90, 6, 18, "#ff70b8"), pf(140, 90, 6, 18, "#ff70b8"),
      pf(58, 84, 84, 6, "#ff70b8"),
      pf(62, 92, 76, 12, "#ffa8d8"),
      pf(66, 96, 20, 6, "#ffc0e4"), pf(96, 96, 20, 6, "#ffc0e4"),
      pf(62, 94, 76, 2, "#ff80b8", { opacity: 0.4 }),
    ],
  },
  {
    id: "sf-sky-corner",
    categoryId: "sofa",
    label: "스카이 코너",
    color: "#80b0ff",
    preview: "💙",
    layer: 4,
    pixels: [
      shadow(52, 108, 90, 5),
      pf(52, 86, 90, 24, "#80b0ff"),
      pf(48, 88, 8, 20, "#6090e0"), pf(138, 88, 8, 20, "#6090e0"),
      pf(52, 82, 90, 6, "#6090e0"),
      pf(138, 82, 28, 28, "#7098f0"),
      pf(56, 90, 78, 14, "#98c0ff"),
      pf(60, 94, 24, 6, "#b0d0ff"), pf(92, 94, 24, 6, "#b0d0ff"),
    ],
  },
  {
    id: "sf-cream-armchair",
    categoryId: "sofa",
    label: "크림 1인",
    color: "#ffe8c0",
    preview: "🪑",
    layer: 4,
    pixels: [
      shadow(76, 108, 48, 5),
      pf(76, 90, 48, 20, "#ffe8c0"),
      pf(72, 92, 5, 16, "#e8c898"), pf(122, 92, 5, 16, "#e8c898"),
      pf(76, 86, 48, 5, "#e8c898"),
      pf(80, 94, 40, 10, "#fff4e0"),
      pf(84, 98, 32, 4, "#f0dcc0", { opacity: 0.6 }),
    ],
  },
  {
    id: "sf-sage-modular",
    categoryId: "sofa",
    label: "세이지 모듈",
    color: "#98b898",
    preview: "🍃",
    layer: 4,
    pixels: [
      shadow(54, 108, 88, 5),
      pf(54, 88, 88, 22, "#98b898"),
      pf(50, 90, 6, 18, "#789878"), pf(140, 90, 6, 18, "#789878"),
      pf(54, 84, 88, 6, "#789878"),
      pf(58, 92, 40, 12, "#a8c8a8"), pf(100, 92, 38, 12, "#b0d0b0"),
      pf(96, 90, 2, 14, "#789878"),
    ],
  },
  {
    id: "sf-lilac-daybed",
    categoryId: "sofa",
    label: "라일락 데이베드",
    color: "#c8a0ff",
    preview: "💜",
    layer: 4,
    pixels: [
      shadow(56, 108, 86, 5),
      pf(56, 90, 86, 20, "#c8a0ff"),
      pf(52, 92, 5, 16, "#a880e8"), pf(142, 92, 5, 16, "#a880e8"),
      pf(56, 86, 86, 5, "#a880e8"),
      pf(60, 94, 78, 10, "#d8b8ff"),
      pf(64, 98, 16, 6, "#e8d0ff"), pf(88, 98, 16, 6, "#e8d0ff"), pf(112, 98, 16, 6, "#e8d0ff"),
      pf(60, 92, 78, 2, "#b890f0", { opacity: 0.35 }),
    ],
  },
];

/* ═══════════════════════════════════════════
   SIDE TABLE (5)
═══════════════════════════════════════════ */
const SIDE_TABLE_ITEMS: RoomInteriorItem[] = [
  {
    id: "st-marble-round",
    categoryId: "side-table",
    label: "마블 라운드",
    color: "#e8e8f0",
    preview: "☕",
    layer: 5,
    pixels: [
      shadow(142, 112, 32, 4),
      pf(142, 98, 32, 3, "#f0f0f8"),
      pf(142, 99, 32, 1, "#d8d8e8"),
      pf(156, 101, 3, 14, "#c89860"),
      pf(150, 96, 8, 3, "#ffe060"),
      pf(158, 100, 5, 5, "#ffb0d0"),
    ],
  },
  {
    id: "st-lamp-night",
    categoryId: "side-table",
    label: "나이트 램프",
    color: "#ffe060",
    preview: "💡",
    layer: 5,
    pixels: [
      shadow(140, 112, 30, 4),
      pf(140, 100, 30, 2, "#c89860"),
      pf(154, 102, 2, 12, "#a07038"),
      pf(146, 96, 18, 2, "#ffd060"),
      ...sprite(294, FLOOR_TOP + 18, ["..yy..", ".yYYy.", "yYYYYy", "yYYYYy", ".yYYy.", "..yy.."], { y: "#ffb020", Y: "#ffe878" }, 2),
      pf(152, 98, 6, 2, "#fff8d0", { opacity: 0.7 }),
    ],
  },
  {
    id: "st-vintage-crate",
    categoryId: "side-table",
    label: "빈티지 상자",
    color: "#b88050",
    preview: "📦",
    layer: 5,
    pixels: [
      shadow(138, 112, 28, 4),
      pf(138, 100, 28, 16, "#b88050"),
      pf(140, 102, 24, 12, "#a07040"),
      pf(138, 108, 28, 2, "#906030"),
      pf(150, 102, 2, 12, "#906030"),
      pf(140, 104, 8, 4, "#ffe060"),
    ],
  },
  {
    id: "st-glass-side",
    categoryId: "side-table",
    label: "글래스 사이드",
    color: "#a8d4ff",
    preview: "🫧",
    layer: 5,
    pixels: [
      shadow(140, 112, 32, 4),
      pf(140, 98, 32, 2, "#c8e8ff", { opacity: 0.85 }),
      pf(140, 99, 32, 1, "#90c8f0"),
      pf(154, 101, 3, 14, "#8090a0"),
      pf(148, 96, 6, 4, "#ffb0d0", { opacity: 0.8 }),
      pf(158, 98, 4, 4, "#ffe060", { opacity: 0.8 }),
    ],
  },
  {
    id: "st-record-player",
    categoryId: "side-table",
    label: "레코드",
    color: "#606080",
    preview: "🎵",
    layer: 5,
    pixels: [
      shadow(138, 112, 34, 4),
      pf(138, 100, 34, 14, "#606080"),
      pf(140, 102, 30, 10, "#505070"),
      pf(148, 96, 14, 14, "#303040"),
      pf(150, 98, 10, 10, "#404060"),
      pf(152, 100, 6, 6, "#ff6060"),
      pf(142, 104, 26, 2, "#ffd060"),
    ],
  },
];

/* ═══════════════════════════════════════════
   LEFT WALL (5)
═══════════════════════════════════════════ */
const LEFT_WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "lw-window-sunny",
    categoryId: "left-wall",
    label: "햇살 창문",
    color: "#c8eeff",
    preview: "🪟",
    layer: 6,
    pixels: [
      p(18, 8, 48, 38, "#c8eeff"),
      p(18, 8, 48, 38, "none", { stroke: "#90a8c8", strokeWidth: 2 }),
      p(40, 8, 2, 38, "#90a8c8"),
      p(18, 26, 48, 2, "#90a8c8"),
      p(14, 6, 12, 42, "#ffd0e8", { opacity: 0.45 }),
      p(58, 6, 12, 42, "#ffd0e8", { opacity: 0.45 }),
      p(24, 14, 14, 10, "#b8e8ff"), p(42, 14, 18, 10, "#d0f0ff"),
      p(26, 16, 5, 7, "#70b050", { opacity: 0.65 }),
      p(22, 10, 38, 30, "#fff8e0", { opacity: 0.15 }),
    ],
  },
  {
    id: "lw-poster-retro",
    categoryId: "left-wall",
    label: "레트로 포스터",
    color: "#ff80a0",
    preview: "🖼️",
    layer: 6,
    pixels: [
      p(22, 10, 36, 28, "#fff"),
      p(22, 10, 36, 28, "none", { stroke: "#d0c0b0", strokeWidth: 2 }),
      p(24, 12, 32, 24, "#ff80a0"),
      p(28, 16, 12, 8, "#ffe060"),
      p(42, 18, 10, 10, "#80c8ff"),
      p(28, 28, 18, 4, "#ffb0d0"),
      p(26, 14, 4, 4, "#fff", { opacity: 0.35 }),
    ],
  },
  {
    id: "lw-clock-round",
    categoryId: "left-wall",
    label: "라운드 시계",
    color: "#c8a0ff",
    preview: "🕰️",
    layer: 6,
    pixels: [
      p(28, 10, 24, 24, "#fff"),
      p(28, 10, 24, 24, "none", { stroke: "#c8a0ff", strokeWidth: 2 }),
      p(30, 12, 20, 20, "#f0e8ff"),
      p(38, 14, 2, 10, "#6040a0"),
      p(38, 24, 8, 2, "#6040a0"),
      p(36, 26, 4, 4, "#c8a0ff"),
      ...Array.from({ length: 4 }, (_, i) => p(38 + (i % 2) * 8, 12 + Math.floor(i / 2) * 18, 2, 2, "#9080c0")),
    ],
  },
  {
    id: "lw-shelf-plants",
    categoryId: "left-wall",
    label: "플랜트 선반",
    color: "#80c070",
    preview: "🪴",
    layer: 6,
    pixels: shelfPlantsPixels(),
  },
  {
    id: "lw-moon-light",
    categoryId: "left-wall",
    label: "문라이트",
    color: "#ffe878",
    preview: "🌙",
    layer: 6,
    pixels: [
      p(26, 12, 28, 28, "#fff"),
      p(28, 14, 24, 24, "#1a2040"),
      p(32, 16, 18, 20, "#ffe878", { opacity: 0.85 }),
      p(34, 18, 14, 16, "#fff8c0", { opacity: 0.4 }),
      p(28, 14, 24, 24, "none", { stroke: "#ffd060", strokeWidth: 2 }),
    ],
  },
];

/* ═══════════════════════════════════════════
   RIGHT WALL (5)
═══════════════════════════════════════════ */
const RIGHT_WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "rw-window-evening",
    categoryId: "right-wall",
    label: "저녁 창문",
    color: "#a8c8ff",
    preview: "🌆",
    layer: 6,
    pixels: [
      p(154, 8, 48, 38, "#6888c8"),
      p(154, 8, 48, 38, "none", { stroke: "#506890", strokeWidth: 2 }),
      p(176, 8, 2, 38, "#506890"),
      p(154, 26, 48, 2, "#506890"),
      p(150, 6, 12, 42, "#ffb0d8", { opacity: 0.35 }),
      p(194, 6, 12, 42, "#ffb0d8", { opacity: 0.35 }),
      p(160, 14, 14, 10, "#8098d0"), p(178, 14, 18, 8, "#ffa878", { opacity: 0.7 }),
      p(158, 12, 40, 28, "#ffd0a0", { opacity: 0.12 }),
    ],
  },
  {
    id: "rw-mirror-arc",
    categoryId: "right-wall",
    label: "아치 거울",
    color: "#d0e8ff",
    preview: "🪞",
    layer: 6,
    pixels: [
      p(162, 10, 32, 32, "#fff"),
      p(162, 10, 32, 32, "none", { stroke: "#c8b898", strokeWidth: 2 }),
      p(164, 12, 28, 28, "#d0e8ff", { opacity: 0.75 }),
      p(168, 16, 20, 20, "#e8f4ff", { opacity: 0.55 }),
      p(174, 20, 8, 10, "#fff", { opacity: 0.5 }),
      p(164, 12, 28, 10, "#f0e8ff", { opacity: 0.3 }),
    ],
  },
  {
    id: "rw-floating-shelf",
    categoryId: "right-wall",
    label: "플로팅 선반",
    color: "#d4a060",
    preview: "📐",
    layer: 6,
    pixels: [
      p(158, 18, 44, 3, "#d4a060"),
      p(156, 20, 3, 12, "#b88040"), p(200, 20, 3, 12, "#b88040"),
      p(162, 10, 8, 8, "#ffe060"), p(174, 8, 10, 10, "#ff7070"),
      p(188, 12, 8, 8, "#70c080"), p(178, 14, 6, 6, "#c8a0ff"),
      p(160, 18, 44, 1, "#ffe8c0", { opacity: 0.4 }),
    ],
  },
  {
    id: "rw-gallery-frame",
    categoryId: "right-wall",
    label: "갤러리 액자",
    color: "#ffb0d0",
    preview: "🎨",
    layer: 6,
    pixels: [
      p(160, 10, 40, 30, "#fff"),
      p(160, 10, 40, 30, "none", { stroke: "#c8b898", strokeWidth: 2 }),
      p(164, 14, 16, 22, "#ffb0d0"), p(182, 14, 14, 22, "#c8eeff"),
      p(166, 16, 12, 8, "#ffe060"), p(184, 18, 10, 10, "#80c070"),
      p(166, 26, 12, 8, "#c8a0ff"), p(184, 28, 10, 6, "#ffa880"),
    ],
  },
  {
    id: "rw-star-garland",
    categoryId: "right-wall",
    label: "별 가랜드",
    color: "#ffe878",
    preview: "✨",
    layer: 6,
    pixels: [
      p(158, 14, 44, 1, "#ffd060", { opacity: 0.6 }),
      ...Array.from({ length: 6 }, (_, i) => {
        const lx = 162 + i * 7;
        return p(lx, 16 + (i % 2) * 4, 4, 4, "#ffe878");
      }),
      ...Array.from({ length: 6 }, (_, i) => {
        const lx = 163 + i * 7;
        return p(lx, 17 + (i % 2) * 4, 2, 2, "#fff8c0", { opacity: 0.7 });
      }),
    ],
  },
];

/* ═══════════════════════════════════════════
   LEFT PROP (5)
═══════════════════════════════════════════ */
const LEFT_PROP_ITEMS: RoomInteriorItem[] = [
  {
    id: "lp-monstera",
    categoryId: "left-prop",
    label: "몬스테라",
    color: "#70b850",
    preview: "🪴",
    layer: 7,
    pixels: leftPropPlace(monsteraPixels()),
  },
  {
    id: "lp-guitar-vintage",
    categoryId: "left-prop",
    label: "빈티지 기타",
    color: "#d4a060",
    preview: "🎸",
    layer: 7,
    pixels: leftPropPlace(guitarPixels()),
  },
  {
    id: "lp-floor-lamp",
    categoryId: "left-prop",
    label: "플로어 램프",
    color: "#ffe878",
    preview: "💡",
    layer: 7,
    pixels: leftPropPlace(floorLampPixels()),
  },
  {
    id: "lp-skateboard",
    categoryId: "left-prop",
    label: "스케이트보드",
    color: "#ff80a0",
    preview: "🛹",
    layer: 7,
    pixels: leftPropPlace([
      shadow(20, 112, 20, 2),
      pf(22, 108, 20, 3, "#ff80a0"),
      pf(24, 109, 16, 1, "#ffb0d0"),
      pf(24, 110, 3, 3, "#606080"), pf(36, 110, 3, 3, "#606080"),
      pf(26, 106, 12, 2, "#c89860"),
    ]),
  },
  {
    id: "lp-cat",
    categoryId: "left-prop",
    label: "고양이",
    color: "#ffb0d0",
    preview: "🐱",
    layer: 7,
    pixels: leftPropPlace(catPixels()),
  },
];

/* ═══════════════════════════════════════════
   RIGHT PROP (5)
═══════════════════════════════════════════ */
const RIGHT_PROP_ITEMS: RoomInteriorItem[] = [
  {
    id: "rp-retro-radio",
    categoryId: "right-prop",
    label: "레트로 라디오",
    color: "#a8d4ff",
    preview: "📻",
    layer: 7,
    pixels: rightPropPlace([
      shadow(176, 112, 24, 2),
      pf(176, 98, 24, 14, "#a8d4ff"),
      pf(178, 100, 20, 10, "#80b8f0"),
      pf(182, 102, 6, 3, "#ffe060"),
      pf(190, 102, 3, 3, "#ff6060"),
      pf(180, 98, 16, 2, "#6090c0"),
      pf(184, 104, 8, 2, "#506080", { opacity: 0.4 }),
    ]),
  },
  {
    id: "rp-tulip-vase",
    categoryId: "right-prop",
    label: "튤립 꽃병",
    color: "#ffb0d0",
    preview: "🌷",
    layer: 7,
    pixels: rightPropPlace(tulipVasePixels()),
  },
  {
    id: "rp-cactus-pot",
    categoryId: "right-prop",
    label: "선인장",
    color: "#70a850",
    preview: "🌵",
    layer: 7,
    pixels: rightPropPlace(cactusPixels()),
  },
  {
    id: "rp-candle-set",
    categoryId: "right-prop",
    label: "캔들 세트",
    color: "#ffe878",
    preview: "🕯️",
    layer: 7,
    pixels: rightPropPlace(candleSetPixels()),
  },
  {
    id: "rp-teddy-bear",
    categoryId: "right-prop",
    label: "곰돌이",
    color: "#d4a878",
    preview: "🧸",
    layer: 7,
    pixels: rightPropPlace(teddyBearPixels()),
  },
];

/* ═══════════════════════════════════════════
   MISC (5 + none)
═══════════════════════════════════════════ */
const MISC_ITEMS: RoomInteriorItem[] = [
  { id: "mc-none", categoryId: "misc", label: "없음", color: "#ccc", preview: "✕", layer: 8, pixels: [] },
  {
    id: "mc-magazine-stack",
    categoryId: "misc",
    label: "잡지 더미",
    color: "#ff80a0",
    preview: "📰",
    layer: 8,
    pixels: miscPlace([
      shadow(94, 98, 20, 2),
      pf(94, 92, 16, 8, "#ff80a0"), pf(96, 90, 14, 3, "#ffb0d0"),
      pf(108, 94, 14, 6, "#80c8ff"), pf(110, 92, 12, 3, "#a8d4ff"),
      pf(98, 92, 10, 1, "#fff", { opacity: 0.35 }),
    ]),
  },
  {
    id: "mc-bonsai-tree",
    categoryId: "misc",
    label: "분재",
    color: "#70a850",
    preview: "🌳",
    layer: 8,
    pixels: miscPlace(bonsaiPixels()),
  },
  {
    id: "mc-game-console",
    categoryId: "misc",
    label: "게임기",
    color: "#8090c0",
    preview: "🎮",
    layer: 8,
    pixels: miscPlace([
      shadow(94, 98, 22, 2),
      pf(94, 92, 22, 8, "#8090c0"),
      pf(96, 94, 18, 4, "#606890"),
      pf(98, 95, 4, 2, "#ff6060"), pf(106, 95, 4, 2, "#60c070"),
      pf(112, 95, 2, 2, "#ffe060"),
    ]),
  },
  {
    id: "mc-yarn-basket",
    categoryId: "misc",
    label: "실 바구니",
    color: "#ffb0d0",
    preview: "🧶",
    layer: 8,
    pixels: miscPlace([
      shadow(96, 98, 16, 2),
      pf(96, 92, 16, 8, "#d4a878"),
      pf(98, 90, 12, 4, "#ffb0d0"), pf(102, 88, 8, 3, "#c8eeff"),
      pf(100, 94, 8, 4, "#ffe878"),
    ]),
  },
  {
    id: "mc-slippers",
    categoryId: "misc",
    label: "슬리퍼",
    color: "#ffb0d0",
    preview: "🥿",
    layer: 8,
    pixels: miscPlace([
      shadow(96, 99, 18, 2),
      pf(96, 94, 8, 4, "#ffb0d0"), pf(106, 94, 8, 4, "#c8eeff"),
      pf(98, 95, 4, 2, "#ff80a0"), pf(108, 95, 4, 2, "#80b8f0"),
    ]),
  },
];

export const ROOM_SLOTS: RoomSlot[] = [
  { id: "wallpaper", label: "벽지", x: 0, y: 0, width: 440, height: 308, layer: 0 },
  { id: "floor", label: "바닥재", x: 0, y: 306, width: 440, height: 134, layer: 1 },
  { id: "rug", label: "러그", x: 96, y: 334, width: 208, height: 72, layer: 2 },
  { id: "large-furniture", label: "대형 가구", x: 24, y: 160, width: 144, height: 88, layer: 3 },
  { id: "sofa", label: "소파", x: 96, y: 278, width: 192, height: 60, layer: 4 },
  { id: "side-table", label: "협탁", x: 272, y: 262, width: 80, height: 84, layer: 5 },
  { id: "left-wall", label: "좌측 벽", x: 40, y: 16, width: 120, height: 88, layer: 6 },
  { id: "right-wall", label: "우측 벽", x: 296, y: 16, width: 120, height: 88, layer: 6 },
  { id: "left-prop", label: "좌측 소품", x: 20, y: 348, width: 80, height: 72, layer: 7 },
  { id: "right-prop", label: "우측 소품", x: 328, y: 352, width: 88, height: 72, layer: 7 },
  { id: "misc", label: "잡동사니", x: 264, y: 328, width: 96, height: 72, layer: 8 },
];

export const ROOM_CATEGORIES: RoomCategory[] = [
  { id: "left-wall", label: "좌측 벽", slot: ROOM_SLOTS[6], items: LEFT_WALL_ITEMS },
  { id: "large-furniture", label: "대형 가구", slot: ROOM_SLOTS[3], items: LARGE_FURNITURE_ITEMS },
  { id: "sofa", label: "소파", slot: ROOM_SLOTS[4], items: SOFA_ITEMS },
  { id: "right-wall", label: "우측 벽", slot: ROOM_SLOTS[7], items: RIGHT_WALL_ITEMS },
  { id: "left-prop", label: "좌측 소품", slot: ROOM_SLOTS[8], items: LEFT_PROP_ITEMS },
  { id: "side-table", label: "협탁", slot: ROOM_SLOTS[5], items: SIDE_TABLE_ITEMS },
  { id: "misc", label: "잡동사니", slot: ROOM_SLOTS[10], items: MISC_ITEMS },
  { id: "right-prop", label: "우측 소품", slot: ROOM_SLOTS[9], items: RIGHT_PROP_ITEMS },
  { id: "wallpaper", label: "벽지", slot: ROOM_SLOTS[0], items: WALL_ITEMS },
  { id: "floor", label: "바닥재", slot: ROOM_SLOTS[1], items: FLOOR_ITEMS },
  { id: "rug", label: "러그", slot: ROOM_SLOTS[2], items: RUG_ITEMS },
];

export const ALL_ROOM_ITEMS: RoomInteriorItem[] = ROOM_CATEGORIES.flatMap((c) => c.items);

export { FLOOR_TOP };
