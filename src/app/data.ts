/* ═══════════════════════════════════════════
   MINI ROOM — Slot-based interior data
   viewBox: 0 0 440 440  (wall ~70%, floor ~30%)
═══════════════════════════════════════════ */

export const ROOM_VIEW_WIDTH = 440;
export const ROOM_VIEW_HEIGHT = 440;
export const ROOM_WALL_HEIGHT = 308;
export const ROOM_FLOOR_Y = 306;

const S = 2;
const LW = 220;
const LH = ROOM_WALL_HEIGHT / S; // legacy wall height
const LFY = ROOM_FLOOR_Y / S; // legacy floor start
const LFH = (ROOM_VIEW_HEIGHT - ROOM_FLOOR_Y) / S; // legacy floor height
const FLOOR_SHIFT = LFY - 100; // offset from original floor line (legacy y=100)

export type RoomCategoryId =
  | "left-wall"
  | "large-furniture"
  | "sofa"
  | "right-wall"
  | "left-prop"
  | "side-table"
  | "misc"
  | "right-prop"
  | "wallpaper"
  | "floor"
  | "rug";

export type PixelRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
};

export type RoomSlot = {
  id: RoomCategoryId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
};

export type RoomInteriorItem = {
  id: string;
  categoryId: RoomCategoryId;
  label: string;
  color: string;
  preview: string;
  layer: number;
  pixels: PixelRect[];
};

export type RoomCategory = {
  id: RoomCategoryId;
  label: string;
  slot: RoomSlot;
  items: RoomInteriorItem[];
};

export type RoomSelections = Record<RoomCategoryId, string | null>;

export const EMPTY_ROOM_SELECTIONS: RoomSelections = {
  "left-wall": null,
  "large-furniture": null,
  sofa: null,
  "right-wall": null,
  "left-prop": null,
  "side-table": null,
  misc: null,
  "right-prop": null,
  wallpaper: null,
  floor: null,
  rug: null,
};

export type TabConfig = {
  id: string;
  label: string;
  color: string;
  active: boolean;
};

export type ProfileField = {
  label: string;
  value: string;
};

export type AvatarItem = {
  id: string;
  cat: string;
  emoji: string;
  label: string;
  color: string;
};

export type Emoticon = {
  id: number;
  icon: string;
  label: string;
  color: string;
  category: string;
};

export type GuestbookEntry = {
  id: number;
  name: string;
  msg: string;
  date: string;
  color: string;
};

export type Privacy = "public" | "private";

export type DiaryEntry = {
  id: number;
  date: string;
  weather: string;
  privacy: Privacy;
  content: string;
  stickers: string[];
};

export type Neighbor = {
  id: number;
  name: string;
  emoji: string;
  color: string;
};

export type VisitMode = "miniroom" | "guest" | "diary";

export type BoardPost = {
  id: number;
  user: string;
  content: string;
  likes: number;
  time: string;
};


const ROOM_STORAGE_KEY = "diary-miniroom-selections";

export function loadRoomSelections(): RoomSelections {
  try {
    const raw = localStorage.getItem(ROOM_STORAGE_KEY);
    if (!raw) return { ...EMPTY_ROOM_SELECTIONS };
    const parsed = JSON.parse(raw) as Partial<RoomSelections>;
    return { ...EMPTY_ROOM_SELECTIONS, ...parsed };
  } catch {
    return { ...EMPTY_ROOM_SELECTIONS };
  }
}

export function saveRoomSelections(selections: RoomSelections) {
  try {
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(selections));
  } catch {
    /* ignore quota errors */
  }
}

/** Legacy-grid rect scaled to viewBox (unit blocks = S px) */
const p = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extra?: Partial<PixelRect>,
): PixelRect => ({ x: x * S, y: y * S, w: w * S, h: h * S, fill, ...extra });

/** Floor-anchored legacy rect (auto-shifted for taller wall) */
const pf = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extra?: Partial<PixelRect>,
): PixelRect => p(x, y + FLOOR_SHIFT, w, h, fill, extra);

/** Full-wall wallpaper fill */
function wallFill(color: string, extra?: Partial<PixelRect>): PixelRect {
  return p(0, 0, LW, LH, color, extra);
}

/** Full-floor tile grid */
function floorChecker(c1: string, c2: string): PixelRect[] {
  const rows = Math.ceil(LFH / 10);
  return Array.from({ length: 22 }, (_, i) =>
    Array.from({ length: rows }, (_, j) =>
      pf(i * 10, LFY - FLOOR_SHIFT + j * 10, 10, 10, (i + j) % 2 === 0 ? c1 : c2),
    ),
  ).flat();
}

/** Full-floor wood planks */
function floorWood(): PixelRect[] {
  const rows = Math.ceil(LFH / 10);
  return [
    pf(0, LFY - FLOOR_SHIFT, LW, LFH, "#e8c898"),
    ...Array.from({ length: 22 }, (_, i) => pf(i * 10, LFY - FLOOR_SHIFT, 1, LFH, "#c89860", { opacity: 0.3 })),
    ...Array.from({ length: rows }, (_, j) =>
      Array.from({ length: 22 }, (_, i) =>
        pf(i * 10, LFY - FLOOR_SHIFT + j * 10, 10, 5, (i + j) % 2 === 0 ? "#dcc080" : "#d0b070", { opacity: 0.35 }),
      ),
    ).flat(),
  ];
}

/** Fine 1:1 viewBox pixel */
const f = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  extra?: Partial<PixelRect>,
): PixelRect => ({ x, y, w, h, fill, ...extra });

/** ASCII sprite — each char = `unit` viewBox pixels */
function sprite(
  ox: number,
  oy: number,
  rows: string[],
  palette: Record<string, string>,
  unit = 2,
): PixelRect[] {
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

/* ── Wallpaper (layer 0) ── */
const WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "wp-stripe-lavender",
    categoryId: "wallpaper",
    label: "라벤더 줄무늬",
    color: "#c8b0ff",
    preview: "🟪",
    layer: 0,
    pixels: [
      wallFill("#f0e8ff"),
      ...Array.from({ length: 10 }, (_, i) => p(i * 22, 0, 11, LH, "#e4d8ff", { opacity: 0.45 })),
    ],
  },
  {
    id: "wp-pastel-pink",
    categoryId: "wallpaper",
    label: "파스텔 핑크",
    color: "#ffb0d0",
    preview: "🌸",
    layer: 0,
    pixels: [
      wallFill("#fff0f5"),
      ...Array.from({ length: Math.floor(LH / 9) * 22 }, (_, i) =>
        p((i * 10) % LW, Math.floor(i / 22) * 9, 2, 2, "#ffd0e8", { opacity: 0.55 }),
      ),
    ],
  },
  {
    id: "wp-mint-grid",
    categoryId: "wallpaper",
    label: "민트 그리드",
    color: "#80e0b0",
    preview: "🟩",
    layer: 0,
    pixels: [
      wallFill("#eefaf4"),
      ...Array.from({ length: 22 }, (_, i) => p(i * 10, 0, 1, LH, "#c0ead0", { opacity: 0.35 })),
      ...Array.from({ length: Math.floor(LH / 9) }, (_, i) => p(0, i * 9, LW, 1, "#c0ead0", { opacity: 0.3 })),
    ],
  },
];

/* ── Floor (layer 1) — fills entire floor area dynamically ── */
const FLOOR_ITEMS: RoomInteriorItem[] = [
  {
    id: "fl-wood-warm",
    categoryId: "floor",
    label: "원목 바닥",
    color: "#d4a060",
    preview: "🟫",
    layer: 1,
    pixels: floorWood(),
  },
  {
    id: "fl-tile-checker",
    categoryId: "floor",
    label: "체크 타일",
    color: "#b0b0c8",
    preview: "⬜",
    layer: 1,
    pixels: floorChecker("#e8e8f0", "#d8d8e4"),
  },
  {
    id: "fl-lilac",
    categoryId: "floor",
    label: "라일락 바닥",
    color: "#c8a0ff",
    preview: "💜",
    layer: 1,
    pixels: floorChecker("#e0c8f0", "#d4b8e8"),
  },
];

const FLOOR_TOP = ROOM_FLOOR_Y;

/* ── Rug (layer 2) ── */
const RUG_ITEMS: RoomInteriorItem[] = [
  { id: "rug-none", categoryId: "rug", label: "없음", color: "#ccc", preview: "✕", layer: 2, pixels: [] },
  {
    id: "rug-heart-pink",
    categoryId: "rug",
    label: "하트 러그",
    color: "#ff99cc",
    preview: "💗",
    layer: 2,
    pixels: [
      pf(52, 114, 96, 34, "#ff99cc", { opacity: 0.5 }),
      pf(56, 118, 88, 26, "none", { stroke: "#ff60b0", strokeWidth: 2 }),
      ...sprite(196, FLOOR_TOP + 42, ["..hh..", ".hHHh.", "hHHHHh", ".hHHh.", "..hh.."], { h: "#ff80c8", H: "#ff99cc" }, 2),
    ],
  },
  {
    id: "rug-round-blue",
    categoryId: "rug",
    label: "원형 러그",
    color: "#80c8ff",
    preview: "🔵",
    layer: 2,
    pixels: [
      pf(58, 116, 84, 28, "#a0d8ff", { opacity: 0.45 }),
      pf(62, 120, 76, 20, "none", { stroke: "#60a8e0", strokeWidth: 2 }),
    ],
  },
  {
    id: "rug-stripe",
    categoryId: "rug",
    label: "스트라이프",
    color: "#ffe080",
    preview: "🟨",
    layer: 2,
    pixels: [
      pf(48, 114, 104, 34, "#ffe8a0", { opacity: 0.4 }),
      pf(48, 118, 104, 3, "#ffd060", { opacity: 0.5 }),
      pf(48, 128, 104, 3, "#ffd060", { opacity: 0.5 }),
      pf(48, 138, 104, 3, "#ffd060", { opacity: 0.5 }),
    ],
  },
];

/* ── Large furniture (layer 3) — lower-left, below wall decor ── */
const LARGE_FURNITURE_ITEMS: RoomInteriorItem[] = [
  {
    id: "lf-bookshelf",
    categoryId: "large-furniture",
    label: "책장",
    color: "#d4a060",
    preview: "📚",
    layer: 3,
    pixels: [
      pf(10, 54, 54, 44, "#d4a060"),
      pf(12, 56, 50, 40, "#c89050"),
      pf(12, 68, 50, 2, "#b88040"),
      pf(12, 80, 50, 2, "#b88040"),
      pf(15, 60, 6, 6, "#ff6060"),
      pf(24, 62, 5, 5, "#6080ff"),
      pf(32, 58, 6, 7, "#60c060"),
      pf(42, 60, 5, 6, "#ffe060"),
      pf(15, 74, 8, 6, "#ffb0d0"),
      pf(28, 72, 6, 7, "#80c8ff"),
      pf(40, 74, 6, 6, "#c8a0ff"),
      pf(10, 94, 54, 2, "#b88040"),
    ],
  },
  {
    id: "lf-wardrobe",
    categoryId: "large-furniture",
    label: "옷장",
    color: "#e8c090",
    preview: "🚪",
    layer: 3,
    pixels: [
      pf(12, 54, 52, 44, "#e8c090"),
      pf(14, 56, 48, 40, "#dcc080"),
      pf(36, 56, 1, 40, "#c8a870"),
      pf(22, 78, 2, 2, "#ffd060"),
      pf(44, 78, 2, 2, "#ffd060"),
      pf(12, 94, 52, 2, "#c89860"),
      pf(14, 58, 20, 36, "#e0c090", { opacity: 0.3 }),
      pf(38, 58, 22, 36, "#d8b880", { opacity: 0.3 }),
    ],
  },
  {
    id: "lf-desk-setup",
    categoryId: "large-furniture",
    label: "책상 세트",
    color: "#9090e0",
    preview: "💻",
    layer: 3,
    pixels: [
      pf(12, 78, 64, 3, "#d4a060"),
      pf(14, 81, 2, 16, "#b88040"),
      pf(72, 81, 2, 16, "#b88040"),
      pf(26, 58, 32, 22, "#e0e0f8"),
      pf(28, 60, 28, 18, "#9090e0"),
      pf(30, 62, 24, 14, "#a0c0ff", { opacity: 0.6 }),
      pf(40, 79, 10, 2, "#d0d0e8"),
      pf(22, 76, 26, 2, "#d8d8e8"),
      pf(30, 86, 22, 10, "#ff80c8"),
      pf(30, 82, 22, 5, "#ff60b8"),
    ],
  },
];

/* ── Sofa (layer 4) ── */
const SOFA_ITEMS: RoomInteriorItem[] = [
  {
    id: "sf-pink-loveseat",
    categoryId: "sofa",
    label: "핑크 소파",
    color: "#ff80c8",
    preview: "🛋️",
    layer: 4,
    pixels: [
      pf(60, 92, 80, 20, "#ff80c8"),
      pf(56, 94, 6, 16, "#ff60b8"),
      pf(138, 94, 6, 16, "#ff60b8"),
      pf(60, 88, 80, 6, "#ff60b8"),
      pf(64, 96, 72, 10, "#ff99cc"),
      pf(68, 100, 18, 6, "#ffb0d9"),
      pf(98, 100, 18, 6, "#ffb0d9"),
    ],
  },
  {
    id: "sf-blue-corner",
    categoryId: "sofa",
    label: "블루 코너",
    color: "#80a0ff",
    preview: "💙",
    layer: 4,
    pixels: [
      pf(54, 90, 88, 22, "#80a0ff"),
      pf(50, 92, 8, 18, "#6080e0"),
      pf(138, 92, 8, 18, "#6080e0"),
      pf(54, 86, 88, 6, "#6080e0"),
      pf(138, 86, 24, 24, "#7090f0"),
      pf(58, 96, 76, 10, "#90b0ff"),
    ],
  },
  {
    id: "sf-cream-single",
    categoryId: "sofa",
    label: "크림 1인",
    color: "#ffe8c0",
    preview: "🪑",
    layer: 4,
    pixels: [
      pf(74, 94, 44, 18, "#ffe8c0"),
      pf(70, 96, 5, 14, "#e8c898"),
      pf(116, 96, 5, 14, "#e8c898"),
      pf(74, 90, 44, 5, "#e8c898"),
      pf(78, 98, 36, 8, "#fff0d8"),
    ],
  },
];

/* ── Side table (layer 5) ── */
const SIDE_TABLE_ITEMS: RoomInteriorItem[] = [
  {
    id: "st-round-tea",
    categoryId: "side-table",
    label: "티 테이블",
    color: "#d7a66c",
    preview: "☕",
    layer: 5,
    pixels: [
      pf(144, 100, 28, 2, "#d4a060"),
      pf(156, 102, 2, 14, "#b88040"),
      pf(150, 98, 6, 2, "#ffe060"),
      pf(160, 100, 4, 4, "#ffb0d0"),
    ],
  },
  {
    id: "st-lamp-table",
    categoryId: "side-table",
    label: "램프 협탁",
    color: "#ffe060",
    preview: "💡",
    layer: 5,
    pixels: [
      pf(142, 98, 26, 2, "#d4a060"),
      pf(154, 100, 2, 12, "#b88040"),
      ...sprite(296, FLOOR_TOP + 20, ["..yy..", ".yYYy.", "yYYYYy", ".yYYy.", "..yy.."], { y: "#ffb020", Y: "#ffe060" }, 2),
      pf(148, 96, 14, 2, "#ffd060"),
    ],
  },
  {
    id: "st-crate",
    categoryId: "side-table",
    label: "나무 상자",
    color: "#c89860",
    preview: "📦",
    layer: 5,
    pixels: [
      pf(140, 102, 22, 16, "#c89860"),
      pf(142, 104, 18, 12, "#b88040"),
      pf(140, 110, 22, 1, "#a87030"),
      pf(150, 104, 1, 12, "#a87030"),
    ],
  },
];

/* ── Left wall decor (layer 6) — upper wall only, no overlap with furniture ── */
const LEFT_WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "lw-window",
    categoryId: "left-wall",
    label: "창문",
    color: "#c8eeff",
    preview: "🪟",
    layer: 6,
    pixels: [
      p(22, 10, 40, 32, "#c8eeff"),
      p(22, 10, 40, 32, "none", { stroke: "#a0b8d8", strokeWidth: 2 }),
      p(40, 10, 1, 32, "#a0b8d8"),
      p(22, 25, 40, 1, "#a0b8d8"),
      p(20, 8, 10, 36, "#ffb3d9", { opacity: 0.55 }),
      p(54, 8, 10, 36, "#ffb3d9", { opacity: 0.55 }),
      p(26, 14, 12, 10, "#b8e0ff"),
      p(42, 14, 16, 10, "#c0eaff"),
      p(28, 16, 4, 6, "#80c060", { opacity: 0.6 }),
    ],
  },
  {
    id: "lw-poster",
    categoryId: "left-wall",
    label: "포스터",
    color: "#ff80a0",
    preview: "🖼️",
    layer: 6,
    pixels: [
      p(24, 12, 32, 24, "#fff"),
      p(26, 14, 28, 20, "#ff80a0"),
      p(30, 18, 10, 6, "#ffe060"),
      p(42, 20, 8, 8, "#80c8ff"),
      p(28, 28, 16, 3, "#ffb0d0"),
    ],
  },
  {
    id: "lw-clock",
    categoryId: "left-wall",
    label: "벽시계",
    color: "#c8a0ff",
    preview: "🕰️",
    layer: 6,
    pixels: [
      p(30, 14, 20, 20, "#fff"),
      p(32, 16, 16, 16, "#f0e8ff"),
      p(38, 18, 1, 8, "#6040a0"),
      p(38, 26, 6, 1, "#6040a0"),
      p(36, 28, 4, 4, "#c8a0ff"),
    ],
  },
];

/* ── Right wall decor (layer 6) ── */
const RIGHT_WALL_ITEMS: RoomInteriorItem[] = [
  {
    id: "rw-window",
    categoryId: "right-wall",
    label: "우측 창문",
    color: "#c8eeff",
    preview: "🪟",
    layer: 6,
    pixels: [
      p(158, 10, 40, 32, "#c8eeff"),
      p(158, 10, 40, 32, "none", { stroke: "#a0b8d8", strokeWidth: 2 }),
      p(176, 10, 1, 32, "#a0b8d8"),
      p(158, 25, 40, 1, "#a0b8d8"),
      p(156, 8, 10, 36, "#ffb3d9", { opacity: 0.55 }),
      p(190, 8, 10, 36, "#ffb3d9", { opacity: 0.55 }),
      p(162, 14, 12, 10, "#b8e0ff"),
      p(178, 14, 16, 10, "#c0eaff"),
    ],
  },
  {
    id: "rw-shelf",
    categoryId: "right-wall",
    label: "벽 선반",
    color: "#d4a060",
    preview: "📐",
    layer: 6,
    pixels: [
      p(160, 18, 44, 2, "#d4a060"),
      p(158, 20, 2, 12, "#b88040"),
      p(200, 20, 2, 12, "#b88040"),
      p(164, 12, 6, 6, "#ffe060"),
      p(176, 10, 8, 8, "#ff6060"),
      p(188, 12, 6, 6, "#60c060"),
    ],
  },
  {
    id: "rw-mirror",
    categoryId: "right-wall",
    label: "거울",
    color: "#a0d8ff",
    preview: "🪞",
    layer: 6,
    pixels: [
      p(166, 12, 28, 28, "#fff"),
      p(168, 14, 24, 24, "#c8eeff", { opacity: 0.7 }),
      p(172, 18, 16, 16, "#e0f4ff", { opacity: 0.5 }),
      p(176, 22, 6, 8, "#fff", { opacity: 0.45 }),
    ],
  },
];

/* ── Left prop (layer 7) ── */
const LEFT_PROP_ITEMS: RoomInteriorItem[] = [
  {
    id: "lp-plant",
    categoryId: "left-prop",
    label: "화분",
    color: "#7bd8a3",
    preview: "🪴",
    layer: 7,
    pixels: [
      ...sprite(48, FLOOR_TOP + 6, ["..ll..", ".lLLl.", "lLlLlL", "..lL.."], { l: "#60a040", L: "#80c060" }, 2),
      pf(24, 118, 10, 4, "#d4a060"),
      pf(26, 120, 6, 2, "#b88040"),
    ],
  },
  {
    id: "lp-guitar",
    categoryId: "left-prop",
    label: "기타",
    color: "#d4a060",
    preview: "🎸",
    layer: 7,
    pixels: [
      pf(30, 106, 8, 16, "#d4a060"),
      pf(32, 104, 4, 2, "#b88040"),
      pf(28, 110, 12, 6, "#e8c898"),
      pf(34, 112, 1, 8, "#6040a0"),
      pf(26, 114, 16, 1, "#b88040"),
    ],
  },
];

/* ── Right prop (layer 7) ── */
const RIGHT_PROP_ITEMS: RoomInteriorItem[] = [
  {
    id: "rp-radio",
    categoryId: "right-prop",
    label: "라디오",
    color: "#a8d9ff",
    preview: "📻",
    layer: 7,
    pixels: [
      pf(178, 114, 20, 12, "#a8d9ff"),
      pf(180, 116, 16, 6, "#80c8ff"),
      pf(184, 118, 4, 2, "#ffe060"),
      pf(190, 118, 2, 2, "#ff6060"),
      pf(182, 114, 12, 1, "#6090c0"),
    ],
  },
  {
    id: "rp-vase",
    categoryId: "right-prop",
    label: "꽃병",
    color: "#ffb7d9",
    preview: "🌸",
    layer: 7,
    pixels: [
      ...sprite(364, FLOOR_TOP + 6, ["..pp..", ".pPPp.", "pPffPp", "..pp.."], { p: "#ffb0d0", P: "#ff80a0", f: "#ffe060" }, 2),
      pf(182, 122, 10, 3, "#d4a060"),
    ],
  },
  {
    id: "rp-cactus",
    categoryId: "right-prop",
    label: "선인장",
    color: "#60a040",
    preview: "🌵",
    layer: 7,
    pixels: [
      ...sprite(368, FLOOR_TOP + 8, ["..cc.", ".cCCc", "cCcCc", "cCCCc", "..cc."], { c: "#508030", C: "#60a040" }, 2),
      pf(184, 124, 10, 3, "#d4a060"),
    ],
  },
];

/* ── Misc (layer 8) ── */
const MISC_ITEMS: RoomInteriorItem[] = [
  { id: "mc-none", categoryId: "misc", label: "없음", color: "#ccc", preview: "✕", layer: 8, pixels: [] },
  {
    id: "mc-boxes",
    categoryId: "misc",
    label: "상자 더미",
    color: "#c89860",
    preview: "📦",
    layer: 8,
    pixels: [
      pf(94, 118, 14, 10, "#c89860"),
      pf(108, 120, 12, 8, "#b88040"),
      pf(96, 114, 10, 5, "#d4a060"),
      pf(108, 114, 1, 6, "#a87030"),
    ],
  },
  {
    id: "mc-bonsai",
    categoryId: "misc",
    label: "분재",
    color: "#60a040",
    preview: "🌳",
    layer: 8,
    pixels: [
      ...sprite(204, FLOOR_TOP + 2, ["..gg..", ".gGGg.", "gGgGgg", "gGGGGg", "..gg.."], { g: "#508030", G: "#60a040" }, 2),
      pf(102, 124, 8, 3, "#8b4513"),
    ],
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
  { id: "left-prop", label: "좌측 소품", x: 32, y: 314, width: 72, height: 64, layer: 7 },
  { id: "right-prop", label: "우측 소품", x: 340, y: 314, width: 72, height: 64, layer: 7 },
  { id: "misc", label: "잡동사니", x: 176, y: 322, width: 88, height: 56, layer: 8 },
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

export function getItemsByCategory(categoryId: RoomCategoryId): RoomInteriorItem[] {
  return ROOM_CATEGORIES.find((c) => c.id === categoryId)?.items ?? [];
}

export function getItemById(itemId: string): RoomInteriorItem | undefined {
  return ALL_ROOM_ITEMS.find((i) => i.id === itemId);
}

export function getSelectedItems(selections: RoomSelections): RoomInteriorItem[] {
  return Object.values(selections)
    .filter((id): id is string => id !== null)
    .map((id) => getItemById(id))
    .filter((item): item is RoomInteriorItem => !!item && item.pixels.length > 0)
    .sort((a, b) => a.layer - b.layer);
}


/* ── App constants ── */
export const TABS: TabConfig[] = [
  { id: "home", label: "홈", color: "#ff80c8", active: true },
  { id: "profile", label: "아바타", color: "#c8a0ff", active: false },
  { id: "diary", label: "다이어리", color: "#80c8ff", active: false },
  { id: "miniroom", label: "미니룸", color: "#80e0b0", active: false },
  { id: "photo", label: "사진첩", color: "#ffe080", active: false },
  { id: "guest", label: "방명록", color: "#ffa880", active: false },
  { id: "emoticon", label: "이모티콘룸", color: "#ff80a0", active: false },
];

export const INIT_FIELDS: ProfileField[] = [
  { label: "이름", value: "Re:world ✦" },
  { label: "생일", value: "2000.00.00 🎂" },
  { label: "지역", value: "서울 ☁️" },
  { label: "관심사", value: "음악, 일러스트" },
];

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: "face-blush", cat: "얼굴", emoji: "", label: "블러셔", color: "#d99a86" },
  { id: "face-glasses", cat: "얼굴", emoji: "", label: "픽셀 안경", color: "#5b4b2d" },
  { id: "face-freckle", cat: "얼굴", emoji: "", label: "주근깨", color: "#9b6a3c" },
  { id: "face-mask", cat: "얼굴", emoji: "", label: "마스크", color: "#f7efd9" },
  { id: "outfit-cardigan", cat: "의상", emoji: "", label: "아이보리 가디건", color: "#ead8b5" },
  { id: "outfit-sage", cat: "의상", emoji: "", label: "세이지 니트", color: "#b8c0a0" },
  { id: "outfit-ribbon", cat: "의상", emoji: "", label: "리본 타이", color: "#b08a4a" },
  { id: "outfit-pinktee", cat: "의상", emoji: "", label: "핑크 티셔츠", color: "#e58aa8" },
  { id: "outfit-denim", cat: "의상", emoji: "", label: "데님 멜빵", color: "#6f8fb8" },
  { id: "emote-heart", cat: "기타", emoji: "", label: "하트 픽셀", color: "#d8a878" },
  { id: "emote-sparkle", cat: "기타", emoji: "", label: "반짝 픽셀", color: "#e4d4a8" },
  { id: "emote-note", cat: "기타", emoji: "", label: "음표 픽셀", color: "#8b9a72" },
  { id: "other-sneakers", cat: "기타", emoji: "", label: "스니커즈", color: "#f7efd9" },
  { id: "other-crown", cat: "악세사리", emoji: "", label: "크라운", color: "#d4b45f" },
  { id: "other-flower", cat: "악세사리", emoji: "", label: "꽃핀", color: "#d8c49b" },
  { id: "other-bag", cat: "악세사리", emoji: "", label: "미니백", color: "#c9a878" },
  { id: "other-headband", cat: "악세사리", emoji: "", label: "헤어밴드", color: "#d8a878" },
  { id: "other-scarf", cat: "악세사리", emoji: "", label: "스카프", color: "#8b9a72" },
];

export const PIXEL_COLS = 32;
export const PIXEL_ROWS = 48;

export const PALETTE = [
  "#ffffff",
  "#f8fafc",
  "#e5e7eb",
  "#9ca3af",
  "#111827",
  "#2d1a00",
  "#7f1d1d",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#fde047",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f9a8d4",
  "#fecdd3",
  "#fed7aa",
  "#fde68a",
  "#bbf7d0",
  "#bae6fd",
  "#ddd6fe",
  "#b08a4a",
  "#8b9a72",
  "#d8c49b",
  "#e4d4a8",
  "#f7efd9",
  "#c8d0b0",
  "#ead3a1",
  "#c9b27f",
  "#b8ab89",
];

export const SAMPLE_EMOTICONS: Emoticon[] = [
  { id: 1, icon: "cool-face", label: "쿨픽셀", color: "#8b9a72", category: "감정" },
  { id: 2, icon: "teary-face", label: "눈물톡", color: "#80c8ff", category: "감정" },
  { id: 3, icon: "sparkle-face", label: "반짝눈", color: "#d8c49b", category: "감정" },
  { id: 4, icon: "angry-face", label: "으쌰!", color: "#d99a86", category: "감정" },
  { id: 5, icon: "ribbon-hat", label: "리본모자", color: "#d8a878", category: "모자" },
  { id: 6, icon: "crown-hat", label: "왕관", color: "#d4b45f", category: "모자" },
  { id: 7, icon: "cardigan", label: "가디건", color: "#ead8b5", category: "의상" },
  { id: 8, icon: "sailor-outfit", label: "스쿨룩", color: "#8b9a72", category: "의상" },
  { id: 9, icon: "pixel-glasses", label: "안경", color: "#5b4b2d", category: "악세사리" },
  { id: 10, icon: "mini-bag", label: "미니백", color: "#c9a878", category: "악세사리" },
  { id: 11, icon: "love-heart", label: "하트톡", color: "#d86f86", category: "하트" },
  { id: 12, icon: "double-heart", label: "두근", color: "#e58aa8", category: "하트" },
];

export const PHOTO_BOOTH_GRADIENTS = [
  "linear-gradient(135deg,#fff8e8,#d8c49b)",
  "linear-gradient(135deg,#f7efd9,#b8c0a0)",
  "linear-gradient(135deg,#f5e7c7,#c9a878)",
  "linear-gradient(135deg,#fffaf0,#e4d4a8)",
  "linear-gradient(135deg,#ead3a1,#b08a4a)",
];

export const INITIAL_ENTRIES: GuestbookEntry[] = [
  { id: 1, name: "별빛소녀✨", msg: "다이어리 너무 예뻐요!! 자주 올게요 🌸", date: "2026.06.22", color: "#d8c49b" },
  { id: 2, name: "하늘이💙", msg: "오늘도 행복한 하루 보내요~~ 또 놀러올게용", date: "2026.06.21", color: "#80c8ff" },
  { id: 3, name: "민트초코🍃", msg: "Y2K 감성 너무 좋다!! bgm도 최고야 ㅠㅠ💜", date: "2026.06.20", color: "#80e0b0" },
];

export const GUESTBOOK_COLORS = ["#d8c49b", "#c9b27f", "#b8ab89", "#aeb79b", "#e4d4a8", "#c9a878"];

export const WEATHER_OPTIONS = ["☀️", "🌤️", "⛅", "🌧️", "⛈️", "❄️", "🌈", "🌙"];
export const STICKER_OPTIONS = ["🌸", "⭐", "💖", "🎀", "✨", "🦋", "🍀", "🌙", "💫", "🎵", "🌺", "💝"];

export const INIT_ENTRIES: DiaryEntry[] = [
  { id: 1, date: "2026-06-22", weather: "🌸", privacy: "public", content: "오늘은 날씨가 너무 좋았다. 카페에서 라떼 마시면서 음악 들었는데 너무 행복했어 ☕✨", stickers: ["💖", "🎵"] },
  { id: 2, date: "2026-06-19", weather: "🌧️", privacy: "private", content: "비 오는 날엔 괜히 감성적이 돼. 창밖 빗소리 들으면서 일기 썼다. 이런 날이 오히려 좋아.", stickers: ["🌙"] },
  { id: 3, date: "2026-06-15", weather: "☀️", privacy: "public", content: "친구들이랑 한강 나갔다! 사진도 많이 찍고 웃음이 넘쳤던 하루였어 🌻💛", stickers: ["✨", "🌸", "💖"] },
];

export const NEIGHBORS: Neighbor[] = [
  { id: 1, name: "별빛소녀", emoji: "🌟", color: "#ffe060" },
  { id: 2, name: "하늘이", emoji: "💙", color: "#80c8ff" },
  { id: 3, name: "민트초코", emoji: "🍃", color: "#80e0b0" },
  { id: 4, name: "크림몽", emoji: "🎀", color: "#d8c49b" },
];

export const BOARD_POSTS: BoardPost[] = [
  { id: 1, user: "별빛소녀✨", content: "오늘 새로 산 픽셀 캐릭터 어때요?? 💖", likes: 24, time: "5분 전" },
  { id: 2, user: "민트초코🍃", content: "Re:world 다이어리 테마 너무 예쁘다ㅠ 저도 써보고 싶어요!", likes: 18, time: "12분 전" },
  { id: 3, user: "하늘이💙", content: "오늘 날씨 너무 좋아서 기분 최고 ☀️ 모두 좋은 하루 보내요~", likes: 31, time: "28분 전" },
];
