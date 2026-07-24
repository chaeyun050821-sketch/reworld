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
  imageSrc?: string;
  imageBounds?: { x: number; y: number; w: number; h: number };
};

export function roomItemHasVisual(item: RoomInteriorItem): boolean {
  return item.pixels.length > 0 || !!item.imageSrc;
}

export function itemVisualBounds(item: RoomInteriorItem): { x: number; y: number; w: number; h: number } | null {
  if (item.imageBounds) return item.imageBounds;
  return itemPixelBounds(item.pixels);
}

export type RoomCategory = {
  id: RoomCategoryId;
  label: string;
  slot: RoomSlot;
  items: RoomInteriorItem[];
};

export type RoomSelections = Record<RoomCategoryId, string | null>;

export type RoomItemOffset = { x: number; y: number };

export type RoomAvatarPosition = { x: number };

export const INVENTORY_DECOR_SIZE = 88;

export type InventoryPlacement = {
  itemId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MiniroomData = {
  selections: RoomSelections;
  offsets: Partial<Record<RoomCategoryId, RoomItemOffset>>;
  avatarPosition: RoomAvatarPosition;
  inventoryPlacements: InventoryPlacement[];
};

export const ROOM_NON_DRAGGABLE: RoomCategoryId[] = ["wallpaper", "floor"];

/** Always rendered behind movable furniture (rug stays draggable). */
export const ROOM_BACK_LAYER: RoomCategoryId[] = ["wallpaper", "floor", "rug"];

const ROOM_BACK_LAYER_ORDER: Record<RoomCategoryId, number> = {
  wallpaper: 0,
  floor: 1,
  rug: 2,
  "left-wall": 99,
  "large-furniture": 99,
  sofa: 99,
  "right-wall": 99,
  "left-prop": 99,
  "side-table": 99,
  misc: 99,
  "right-prop": 99,
};

export const DEFAULT_ROOM_AVATAR_POSITION: RoomAvatarPosition = { x: 234 };

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

export const EMPTY_MINIROOM_DATA: MiniroomData = {
  selections: { ...EMPTY_ROOM_SELECTIONS },
  offsets: {},
  avatarPosition: { ...DEFAULT_ROOM_AVATAR_POSITION },
  inventoryPlacements: [],
};

const INVENTORY_SELECTION_PREFIX = "inv:";

export function defaultInventoryPlacement(itemId: string, index = 0): InventoryPlacement {
  return {
    itemId,
    x: 16 + index * 20,
    y: ROOM_LEFT_PROP_FLOOR_Y - INVENTORY_DECOR_SIZE,
    w: INVENTORY_DECOR_SIZE,
    h: INVENTORY_DECOR_SIZE,
  };
}

export function migrateMiniroomInventory(data: MiniroomData): MiniroomData {
  const placements = [...(data.inventoryPlacements ?? [])];
  const selections = { ...data.selections };
  const offsets = { ...data.offsets };

  for (const categoryId of Object.keys(selections) as RoomCategoryId[]) {
    const selectedId = selections[categoryId];
    if (!selectedId?.startsWith(INVENTORY_SELECTION_PREFIX)) continue;
    const itemId = selectedId.slice(INVENTORY_SELECTION_PREFIX.length);
    if (!placements.some(placement => placement.itemId === itemId)) {
      try {
        placements.push(defaultInventoryPlacement(itemId, placements.length));
      } catch {
        placements.push({
          itemId,
          x: 16 + placements.length * 20,
          y: 24,
          w: INVENTORY_DECOR_SIZE,
          h: INVENTORY_DECOR_SIZE,
        });
      }
    }
    selections[categoryId] = null;
    delete offsets[categoryId];
  }

  return {
    ...data,
    selections,
    offsets,
    inventoryPlacements: placements,
  };
}

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
  id: string;
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

export type VisitMode = "miniroom" | "guest" | "diary" | "photo";

export type BoardPost = {
  id: number;
  user: string;
  content: string;
  likes: number;
  time: string;
};


const ROOM_STORAGE_KEY_PREFIX = "reworld_miniroom_";
const LEGACY_ROOM_STORAGE_KEY = "diary-miniroom-selections";

function roomStorageKey(userId?: string): string {
  return userId ? `${ROOM_STORAGE_KEY_PREFIX}${userId}` : LEGACY_ROOM_STORAGE_KEY;
}

export function loadRoomSelections(userId?: string): RoomSelections {
  return loadMiniroomData(userId).selections;
}

export function hasMiniroomSelections(data: MiniroomData): boolean {
  if (Object.values(data.selections).some((id) => typeof id === "string" && id.length > 0)) return true;
  if ((data.inventoryPlacements ?? []).length > 0) return true;
  if (Object.keys(data.offsets ?? {}).length > 0) return true;
  if (data.avatarPosition.x !== DEFAULT_ROOM_AVATAR_POSITION.x) return true;
  return false;
}

export function mergeMiniroomData(local: MiniroomData, remote: MiniroomData | null): MiniroomData {
  const localHas = hasMiniroomSelections(local);
  const remoteHas = remote ? hasMiniroomSelections(remote) : false;
  if (remoteHas && remote) return remote;
  if (localHas) return local;
  return { ...EMPTY_MINIROOM_DATA };
}

function isLegacyRoomSelections(value: unknown): value is Partial<RoomSelections> {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(value).filter((key) => key !== "offsets" && key !== "avatarPosition");
  if (keys.length === 0) return false;
  return keys.every((key) => key in EMPTY_ROOM_SELECTIONS);
}

export function loadMiniroomData(userId?: string): MiniroomData {
  try {
    const key = roomStorageKey(userId);
    const raw = localStorage.getItem(key);
    const parseStored = (text: string): MiniroomData => {
      const parsed = JSON.parse(text) as Partial<MiniroomData> & Partial<RoomSelections>;
      let base: MiniroomData;
      if (parsed.selections && typeof parsed.selections === "object") {
        base = {
          selections: { ...EMPTY_ROOM_SELECTIONS, ...parsed.selections },
          offsets: parsed.offsets ?? {},
          avatarPosition: parsed.avatarPosition ?? { ...DEFAULT_ROOM_AVATAR_POSITION },
          inventoryPlacements: parsed.inventoryPlacements ?? [],
        };
      } else if (isLegacyRoomSelections(parsed)) {
        base = {
          selections: { ...EMPTY_ROOM_SELECTIONS, ...parsed },
          offsets: {},
          avatarPosition: { ...DEFAULT_ROOM_AVATAR_POSITION },
          inventoryPlacements: [],
        };
      } else {
        return { ...EMPTY_MINIROOM_DATA };
      }
      try {
        return migrateMiniroomInventory(base);
      } catch {
        return base;
      }
    };

    if (!raw && userId) {
      const legacy = localStorage.getItem(LEGACY_ROOM_STORAGE_KEY);
      if (legacy) return parseStored(legacy);
    }
    if (!raw) return { ...EMPTY_MINIROOM_DATA };
    return parseStored(raw);
  } catch {
    return { ...EMPTY_MINIROOM_DATA };
  }
}

export function saveMiniroomData(data: MiniroomData, userId?: string) {
  try {
    localStorage.setItem(roomStorageKey(userId), JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

export function saveRoomSelections(selections: RoomSelections, userId?: string) {
  const current = loadMiniroomData(userId);
  saveMiniroomData({ ...current, selections }, userId);
}

import { ROOM_CATEGORIES, ALL_ROOM_ITEMS, ROOM_LEFT_PROP_FLOOR_Y } from "./room-items";
export { ROOM_SLOTS, ROOM_CATEGORIES, ALL_ROOM_ITEMS, ROOM_LEFT_PROP_FLOOR_Y } from "./room-items";

export function getItemsByCategory(categoryId: RoomCategoryId): RoomInteriorItem[] {
  return ROOM_CATEGORIES.find((c) => c.id === categoryId)?.items ?? [];
}

export function getItemById(itemId: string): RoomInteriorItem | undefined {
  return ALL_ROOM_ITEMS.find((i) => i.id === itemId);
}

export type RoomItemLookup = (itemId: string) => RoomInteriorItem | undefined;

export function getSelectedItems(
  selections: RoomSelections,
  lookup: RoomItemLookup = getItemById,
): RoomInteriorItem[] {
  return Object.values(selections)
    .filter((id): id is string => id !== null)
    .map((id) => lookup(id))
    .filter((item): item is RoomInteriorItem => !!item && roomItemHasVisual(item))
    .sort((a, b) => a.layer - b.layer);
}

export function getPlacedRoomItems(
  selections: RoomSelections,
  lookup: RoomItemLookup = getItemById,
): Array<{ categoryId: RoomCategoryId; item: RoomInteriorItem }> {
  return (Object.keys(selections) as RoomCategoryId[])
    .map((categoryId) => {
      const id = selections[categoryId];
      if (!id) return null;
      const item = lookup(id);
      if (!item || !roomItemHasVisual(item)) return null;
      return { categoryId, item };
    })
    .filter((entry): entry is { categoryId: RoomCategoryId; item: RoomInteriorItem } => !!entry)
    .sort((a, b) => a.item.layer - b.item.layer);
}

export function placedItemDepth(item: RoomInteriorItem, offset: RoomItemOffset = { x: 0, y: 0 }): number {
  const bounds = itemVisualBounds(item);
  if (!bounds) return 0;
  return bounds.y + bounds.h + offset.y;
}

export function getPlacedRoomItemsByDepth(
  selections: RoomSelections,
  offsets: Partial<Record<RoomCategoryId, RoomItemOffset>> = {},
  lookup: RoomItemLookup = getItemById,
): Array<{ categoryId: RoomCategoryId; item: RoomInteriorItem; depth: number }> {
  const placed = getPlacedRoomItems(selections, lookup);
  const back = placed
    .filter(({ categoryId }) => ROOM_BACK_LAYER.includes(categoryId))
    .sort((a, b) => ROOM_BACK_LAYER_ORDER[a.categoryId] - ROOM_BACK_LAYER_ORDER[b.categoryId]);
  const movable = placed
    .filter(({ categoryId }) => !ROOM_BACK_LAYER.includes(categoryId))
    .map((entry) => ({
      ...entry,
      depth: placedItemDepth(entry.item, offsets[entry.categoryId]),
    }))
    .sort((a, b) => a.depth - b.depth);

  return [
    ...back.map((entry) => ({ ...entry, depth: -1 })),
    ...movable,
  ];
}

export function itemPixelBounds(pixels: PixelRect[]): { x: number; y: number; w: number; h: number } | null {
  if (pixels.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pixels) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}


/* ── App constants ── */
export const TABS: TabConfig[] = [
  { id: "home", label: "홈", color: "#ff80c8", active: true },
  { id: "profile", label: "아바타", color: "#c8a0ff", active: false },
  { id: "diary", label: "일기", color: "#80c8ff", active: false },
  { id: "miniroom", label: "미니룸", color: "#80e0b0", active: false },
  { id: "photo", label: "사진첩", color: "#ffe080", active: false },
  { id: "guest", label: "방명록", color: "#ffa880", active: false },
  { id: "shop", label: "상점", color: "#ff80a0", active: false },
];

export const INIT_FIELDS: ProfileField[] = [
  { label: "이름", value: "Re:world ✦" },
  { label: "생일", value: "2000.00.00 🎂" },
  { label: "지역", value: "서울 ☁️" },
  { label: "관심사", value: "음악, 일러스트" },
];

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: "hair-basic", cat: "헤어", emoji: "", label: "기본 머리", color: "#6b4a34" },
  { id: "hair-bob", cat: "헤어", emoji: "", label: "브라운 단발", color: "#7a4a2a" },
  { id: "hair-twintail", cat: "헤어", emoji: "", label: "트윈테일", color: "#4b342b" },
  { id: "hair-wave", cat: "헤어", emoji: "", label: "웨이브 헤어", color: "#3f3848" },
  { id: "face-blush", cat: "얼굴", emoji: "", label: "블러셔", color: "#d99a86" },
  { id: "face-glasses", cat: "얼굴", emoji: "", label: "픽셀 안경", color: "#5b4b2d" },
  { id: "face-freckle", cat: "얼굴", emoji: "", label: "주근깨", color: "#9b6a3c" },
  { id: "face-mask", cat: "얼굴", emoji: "", label: "마스크", color: "#f7efd9" },
  { id: "outfit-whitetee", cat: "의상", emoji: "", label: "흰 티셔츠", color: "#f4f4f4" },
  { id: "outfit-cardigan", cat: "의상", emoji: "", label: "아이보리 가디건", color: "#ead8b5" },
  { id: "outfit-sage", cat: "의상", emoji: "", label: "세이지 니트", color: "#b8c0a0" },
  { id: "outfit-ribbon", cat: "의상", emoji: "", label: "리본 타이", color: "#b08a4a" },
  { id: "outfit-pinktee", cat: "의상", emoji: "", label: "핑크 티셔츠", color: "#e58aa8" },
  { id: "outfit-denim", cat: "의상", emoji: "", label: "데님 멜빵", color: "#6f8fb8" },
  { id: "pants-whiteshorts", cat: "의상", emoji: "", label: "흰 반바지", color: "#f0f0f0" },
  { id: "pants-denim", cat: "의상", emoji: "", label: "청바지", color: "#5a7a9e" },
  { id: "pants-black", cat: "의상", emoji: "", label: "블랙 슬랙스", color: "#3a3a42" },
  { id: "pants-beige", cat: "의상", emoji: "", label: "베이지 팬츠", color: "#cbb892" },
  { id: "pants-shorts", cat: "의상", emoji: "", label: "데님 숏팬츠", color: "#7a9bb8" },
  { id: "skirt-pleat", cat: "의상", emoji: "", label: "네이비 플리츠", color: "#4a5a78" },
  { id: "skirt-pink", cat: "의상", emoji: "", label: "핑크 미니스커트", color: "#e8a0b8" },
  { id: "skirt-check", cat: "의상", emoji: "", label: "체크 스커트", color: "#8b6b5c" },
  { id: "skirt-long", cat: "의상", emoji: "", label: "세이지 롱스커트", color: "#6b7a5a" },
  { id: "emote-heart", cat: "기타", emoji: "", label: "하트 픽셀", color: "#d8a878" },
  { id: "emote-sparkle", cat: "기타", emoji: "", label: "반짝 픽셀", color: "#e4d4a8" },
  { id: "emote-note", cat: "기타", emoji: "", label: "음표 픽셀", color: "#8b9a72" },
  { id: "other-sneakers", cat: "기타", emoji: "", label: "스니커즈", color: "#f7efd9" },
  { id: "other-ribbon", cat: "악세사리", emoji: "", label: "머리 리본", color: "#d86f86" },
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

export const WEATHER_OPTIONS = ["맑음", "맑지만 구름", "구름많음", "바람", "비옴", "천둥침", "무지개", "눈옴"];
export const STICKER_OPTIONS = ["🌸", "⭐", "💖", "🎀", "✨", "🦋", "🍀", "🌙", "💫", "🎵", "🌺", "💝"];

export const INIT_ENTRIES: DiaryEntry[] = [];

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
