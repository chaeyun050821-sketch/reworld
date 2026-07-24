import {
  FULL_IMAGE_CONTENT_BOUNDS,
  isFullImageContentBounds,
  measureImageContentBounds,
  type HandMadeItemContentBounds,
} from "./image-content-bounds";
import heartBalloonImg from "../assets/shop-heart-balloon.png";
import miniroomCatImg from "../assets/miniroom-cat.png";
import {
  getItemById,
  NEIGHBORS,
  ROOM_LEFT_PROP_FLOOR_Y,
  type RoomCategoryId,
  type RoomInteriorItem,
} from "../app/data";

export type HandMadeItemPlacement = {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation?: number;
  /** Avatar preview width (px) when offset was recorded. */
  referenceWidth?: number;
  /** Avatar preview height (px) when offset was recorded. */
  referenceHeight?: number;
  /** front = above avatar (default), back = behind avatar (e.g. wings). */
  layer?: "front" | "back";
};

export const AVATAR_STUDIO_PREVIEW_WIDTH = 84;
export const AVATAR_DECOR_SIZE_RATIO = 0.32;
/** Min/max scale when resizing handmade avatar items in item creator. */
export const MIN_ITEM_SCALE = 0.15;
export const MAX_ITEM_SCALE = 16;
export const ITEM_CREATOR_AVATAR_WIDTH = Math.round(AVATAR_STUDIO_PREVIEW_WIDTH * 3.15);
/** Full studio viewBox height / width (PIXEL_ROWS + top/bottom margin over PIXEL_COLS). */
export const AVATAR_PREVIEW_HEIGHT_RATIO = (48 + 5 * 2) / 32;

export function avatarPreviewHeightForWidth(width: number): number {
  return Math.round(width * AVATAR_PREVIEW_HEIGHT_RATIO);
}

export function clampItemScale(scale: number): number {
  return Math.round(Math.max(MIN_ITEM_SCALE, Math.min(MAX_ITEM_SCALE, scale)) * 100) / 100;
}

export const DEFAULT_ITEM_PLACEMENT: HandMadeItemPlacement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  referenceWidth: ITEM_CREATOR_AVATAR_WIDTH,
  referenceHeight: Math.round(ITEM_CREATOR_AVATAR_WIDTH * AVATAR_PREVIEW_HEIGHT_RATIO),
};

export function normalizeItemPlacement(placement?: HandMadeItemPlacement | null): HandMadeItemPlacement {
  const referenceWidth = placement?.referenceWidth ?? ITEM_CREATOR_AVATAR_WIDTH;
  const referenceHeight = placement?.referenceHeight
    ?? Math.round(referenceWidth * AVATAR_PREVIEW_HEIGHT_RATIO);

  return {
    scale: placement?.scale ?? DEFAULT_ITEM_PLACEMENT.scale,
    offsetX: placement?.offsetX ?? DEFAULT_ITEM_PLACEMENT.offsetX,
    offsetY: placement?.offsetY ?? DEFAULT_ITEM_PLACEMENT.offsetY,
    rotation: placement?.rotation ?? DEFAULT_ITEM_PLACEMENT.rotation ?? 0,
    referenceWidth,
    referenceHeight,
    layer: placement?.layer === "back" ? "back" : "front",
  };
}

function computeDecorDisplaySize(
  targetMaxDim: number,
  contentBounds?: HandMadeItemContentBounds | null,
): { itemWidth: number; itemHeight: number } {
  if (isFullImageContentBounds(contentBounds)) {
    return { itemWidth: targetMaxDim, itemHeight: targetMaxDim };
  }

  const bounds = contentBounds!;
  const aspect = bounds.w / Math.max(bounds.h, 0.001);
  if (aspect >= 1) {
    return {
      itemWidth: targetMaxDim,
      itemHeight: Math.max(8, Math.round(targetMaxDim / aspect)),
    };
  }
  return {
    itemWidth: Math.max(8, Math.round(targetMaxDim * aspect)),
    itemHeight: targetMaxDim,
  };
}

/** Map stored placement to pixels for a target avatar preview size (uniform scale from width). */
export function resolveDecorPlacement(
  placement: HandMadeItemPlacement | undefined | null,
  displayWidth: number,
  _displayHeight?: number,
  contentBounds?: HandMadeItemContentBounds | null,
) {
  const p = normalizeItemPlacement(placement);
  const refW = p.referenceWidth ?? displayWidth;
  const refScale = displayWidth / refW;
  const targetMaxDim = Math.max(8, Math.round(displayWidth * AVATAR_DECOR_SIZE_RATIO * p.scale));
  const { itemWidth, itemHeight } = computeDecorDisplaySize(targetMaxDim, contentBounds);

  return {
    offsetX: p.offsetX * refScale,
    offsetY: p.offsetY * refScale,
    scale: p.scale,
    rotation: p.rotation ?? 0,
    itemSize: targetMaxDim,
    itemWidth,
    itemHeight,
  };
}

export function resolveDecorPlacementForItem(
  item: HandMadeItem,
  displayWidth: number,
  displayHeight?: number,
) {
  return resolveDecorPlacement(item.placement, displayWidth, displayHeight, item.contentBounds);
}

export function withPlacementReference(
  placement: HandMadeItemPlacement,
  referenceWidth: number,
  referenceHeight: number,
): HandMadeItemPlacement {
  const p = normalizeItemPlacement(placement);
  const oldW = p.referenceWidth ?? referenceWidth;
  const oldH = p.referenceHeight ?? referenceHeight;

  if (oldW === referenceWidth && oldH === referenceHeight) {
    return { ...p, referenceWidth, referenceHeight };
  }

  const uniformScale = referenceWidth / oldW;

  return {
    ...p,
    offsetX: p.offsetX * uniformScale,
    offsetY: p.offsetY * uniformScale,
    referenceWidth,
    referenceHeight,
  };
}

export type HandMadeItemSource = "handmade" | "purchased";

export type HandMadeItem = {
  id: string;
  type: "avatar" | "emoticon" | "room" | "companion";
  label: string;
  cat: string;
  color: string;
  source?: HandMadeItemSource;
  templateId?: string;
  icon?: string;
  roomCategory?: RoomCategoryId;
  placement?: HandMadeItemPlacement;
  /** Tight bounds of non-transparent pixels in imageDataUrl (0–1). */
  contentBounds?: HandMadeItemContentBounds;
  /** True after the user places the item in item creator and saves. */
  avatarPlaced?: boolean;
  imageDataUrl?: string;
  createdAt: string;
};

export type { HandMadeItemContentBounds };
export { FULL_IMAGE_CONTENT_BOUNDS, isFullImageContentBounds, measureImageContentBounds };

export const INVENTORY_ROOM_ITEM_PREFIX = "inv:";

export function toInventoryRoomSelectionId(itemId: string): string {
  return `${INVENTORY_ROOM_ITEM_PREFIX}${itemId}`;
}

export function isInventoryRoomSelectionId(id: string): boolean {
  return id.startsWith(INVENTORY_ROOM_ITEM_PREFIX);
}

const INVENTORY_ROOM_IMAGE_SIZE = 88;

function inventoryImageBounds(categoryId: RoomCategoryId) {
  switch (categoryId) {
    case "left-prop":
      return {
        x: 24,
        y: ROOM_LEFT_PROP_FLOOR_Y - INVENTORY_ROOM_IMAGE_SIZE,
        w: INVENTORY_ROOM_IMAGE_SIZE,
        h: INVENTORY_ROOM_IMAGE_SIZE,
      };
    case "right-prop":
      return {
        x: 168,
        y: ROOM_LEFT_PROP_FLOOR_Y - INVENTORY_ROOM_IMAGE_SIZE,
        w: INVENTORY_ROOM_IMAGE_SIZE,
        h: INVENTORY_ROOM_IMAGE_SIZE,
      };
    default:
      return {
        x: 80,
        y: ROOM_LEFT_PROP_FLOOR_Y - INVENTORY_ROOM_IMAGE_SIZE,
        w: INVENTORY_ROOM_IMAGE_SIZE,
        h: INVENTORY_ROOM_IMAGE_SIZE,
      };
  }
}

export function getItemRoomCategory(item: HandMadeItem): RoomCategoryId | null {
  if (item.roomCategory) return item.roomCategory;
  if (item.type === "room") return "left-prop";
  return null;
}

export function isDecorItem(item: HandMadeItem): boolean {
  return !!resolveHandMadeItemImageUrl(item);
}

export function canEquipOnAvatar(item: HandMadeItem): boolean {
  return item.type === "avatar" || item.type === "companion" || isDecorItem(item);
}

/** Shop purchases can be toggled here after placement in item creator. */
export function canEquipFromAvatarStudio(item: HandMadeItem): boolean {
  if (!canEquipOnAvatar(item)) return false;
  if (item.source === "purchased") return !!item.avatarPlaced;
  return true;
}

export function shouldShowDecorOnAvatar(
  item: HandMadeItem,
  options?: { showUnplacedPurchased?: boolean },
): boolean {
  if (!isDecorItem(item)) return false;
  if (item.source === "purchased" && !item.avatarPlaced && !options?.showUnplacedPurchased) {
    return false;
  }
  return true;
}

export function canPlaceAsInventoryDecor(item: HandMadeItem): boolean {
  return isDecorItem(item);
}

export function getEquippedCompanions(
  equipped: string[],
  inventory: HandMadeItem[],
  options?: { showUnplacedPurchased?: boolean },
): HandMadeItem[] {
  const invMap = new Map(inventory.map(entry => [entry.id, entry]));
  return equipped
    .map(id => invMap.get(id))
    .filter((item): item is HandMadeItem => !!item && shouldShowDecorOnAvatar(item, options));
}

export function getDecorLayer(item: HandMadeItem): "front" | "back" {
  return item.placement?.layer === "back" ? "back" : "front";
}

export function splitDecorItemsByLayer(items: HandMadeItem[]): {
  back: HandMadeItem[];
  front: HandMadeItem[];
} {
  const back: HandMadeItem[] = [];
  const front: HandMadeItem[] = [];
  for (const item of items) {
    if (getDecorLayer(item) === "back") back.push(item);
    else front.push(item);
  }
  return { back, front };
}

export function reorderEquippedDecorLayer(
  userId: string,
  equipped: string[],
  itemId: string,
  layer: "front" | "back",
): string[] {
  const inventory = loadHandMadeItems(userId);
  const invMap = new Map(inventory.map(entry => [entry.id, entry]));
  const isDecorId = (id: string) => {
    const item = invMap.get(id);
    return !!item && isDecorItem(item);
  };
  if (!isDecorId(itemId)) return equipped;

  const otherIds = equipped.filter(id => !isDecorId(id));
  const decorIds = equipped.filter(isDecorId);
  const rest = decorIds.filter(id => id !== itemId);
  const layerOf = (id: string): "front" | "back" => {
    if (id === itemId) return layer;
    const item = invMap.get(id);
    return item ? getDecorLayer(item) : "front";
  };
  const backRest = rest.filter(id => layerOf(id) === "back");
  const frontRest = rest.filter(id => layerOf(id) === "front");

  if (layer === "back") {
    return [...otherIds, ...backRest, itemId, ...frontRest];
  }
  return [...otherIds, ...backRest, ...frontRest, itemId];
}

export function inventoryItemTypeLabel(item: HandMadeItem): string {
  if (item.type === "companion") return "컴패니언";
  if (item.type === "room" || item.roomCategory) return "미니룸";
  if (item.type === "emoticon") return "이모티콘";
  return "아바타";
}

export function handMadeItemToRoomItem(item: HandMadeItem): RoomInteriorItem | null {
  const categoryId = getItemRoomCategory(item);
  const imageSrc = resolveHandMadeItemImageUrl(item);
  if (!categoryId || !imageSrc) return null;
  return {
    id: toInventoryRoomSelectionId(item.id),
    categoryId,
    label: item.label,
    color: item.color,
    preview: "🎁",
    layer: 7,
    pixels: [],
    imageSrc,
    imageBounds: inventoryImageBounds(categoryId),
  };
}

export function createInventoryRoomLookup(inventory: HandMadeItem[]) {
  const map = new Map<string, RoomInteriorItem>();
  for (const item of inventory) {
    const roomItem = handMadeItemToRoomItem(item);
    if (roomItem) map.set(roomItem.id, roomItem);
  }
  return (itemId: string): RoomInteriorItem | undefined => getItemById(itemId) ?? map.get(itemId);
}

export type ShopListing = {
  id: string;
  itemId: string;
  sellerId: string;
  sellerNickname: string;
  price: number;
  listedAt: string;
};

export type ShopListingWithItem = ShopListing & { item: HandMadeItem };

const HANDMADE_KEY_PREFIX = "reworld_handmade_";
const LISTINGS_KEY_PREFIX = "reworld_shop_listings_";

export const GLOBAL_SHOP_LISTINGS: ShopListingWithItem[] = [
  {
    id: "global-listing-calico-cat",
    itemId: "shop-item-calico-cat",
    sellerId: "reworld-shop",
    sellerNickname: "Re:world",
    price: 10,
    listedAt: "2026-07-23",
    item: {
      id: "shop-item-calico-cat",
      type: "companion",
      label: "삼색 고양이",
      cat: "컴패니언",
      color: "#f0a868",
      imageDataUrl: miniroomCatImg,
      createdAt: "2026-07-23",
    },
  },
  {
    id: "global-listing-heart-balloon",
    itemId: "shop-item-heart-balloon",
    sellerId: "reworld-shop",
    sellerNickname: "Re:world",
    price: 5,
    listedAt: "2026-07-24",
    item: {
      id: "shop-item-heart-balloon",
      type: "companion",
      label: "하트 풍선",
      cat: "컴패니언",
      color: "#e85888",
      imageDataUrl: heartBalloonImg,
      createdAt: "2026-07-24",
    },
  },
];

const FRIEND_SHOP_SEED: Record<string, ShopListingWithItem[]> = {
  별빛소녀: [
    {
      id: "friend-listing-1",
      itemId: "friend-item-1",
      sellerId: "neighbor-1",
      sellerNickname: "별빛소녀",
      price: 150,
      listedAt: "2026-06-20",
      item: {
        id: "friend-item-1",
        type: "avatar",
        label: "별빛 헤어밴드",
        cat: "악세사리",
        color: "#ffe060",
        templateId: "other-headband",
        createdAt: "2026-06-18",
      },
    },
    {
      id: "friend-listing-2",
      itemId: "friend-item-2",
      sellerId: "neighbor-1",
      sellerNickname: "별빛소녀",
      price: 220,
      listedAt: "2026-06-21",
      item: {
        id: "friend-item-2",
        type: "emoticon",
        label: "반짝웃음",
        cat: "이모티콘",
        color: "#ff80c8",
        icon: "sparkle-face",
        createdAt: "2026-06-19",
      },
    },
  ],
  하늘이: [
    {
      id: "friend-listing-3",
      itemId: "friend-item-3",
      sellerId: "neighbor-2",
      sellerNickname: "하늘이",
      price: 180,
      listedAt: "2026-06-19",
      item: {
        id: "friend-item-3",
        type: "avatar",
        label: "하늘색 스카프",
        cat: "악세사리",
        color: "#80c8ff",
        templateId: "other-scarf",
        createdAt: "2026-06-17",
      },
    },
  ],
  민트초코: [
    {
      id: "friend-listing-4",
      itemId: "friend-item-4",
      sellerId: "neighbor-3",
      sellerNickname: "민트초코",
      price: 260,
      listedAt: "2026-06-22",
      item: {
        id: "friend-item-4",
        type: "emoticon",
        label: "민트하트",
        cat: "이모티콘",
        color: "#80e0b0",
        icon: "love-heart",
        createdAt: "2026-06-20",
      },
    },
    {
      id: "friend-listing-5",
      itemId: "friend-item-5",
      sellerId: "neighbor-3",
      sellerNickname: "민트초코",
      price: 140,
      listedAt: "2026-06-23",
      item: {
        id: "friend-item-5",
        type: "avatar",
        label: "민트 니트",
        cat: "의상",
        color: "#b8e0c8",
        templateId: "outfit-sage",
        createdAt: "2026-06-21",
      },
    },
  ],
  크림몽: [
    {
      id: "friend-listing-6",
      itemId: "friend-item-6",
      sellerId: "neighbor-4",
      sellerNickname: "크림몽",
      price: 200,
      listedAt: "2026-06-18",
      item: {
        id: "friend-item-6",
        type: "avatar",
        label: "크림 미니백",
        cat: "악세사리",
        color: "#d8c49b",
        templateId: "other-bag",
        createdAt: "2026-06-16",
      },
    },
  ],
};

export function getHandMadeStorageKey(userId: string): string {
  return `${HANDMADE_KEY_PREFIX}${userId}`;
}

function findGlobalShopCatalogItem(item: HandMadeItem): HandMadeItem | undefined {
  const direct = GLOBAL_SHOP_LISTINGS.find(entry => entry.item.id === item.id);
  if (direct) return direct.item;
  const purchased = GLOBAL_SHOP_LISTINGS.find(entry =>
    item.id.startsWith(`purchased-${entry.item.id}-`),
  );
  return purchased?.item;
}

/** Always resolve shop catalog images from bundled assets (avoids stale deploy URLs). */
export function resolveHandMadeItemImageUrl(item: HandMadeItem): string | undefined {
  const catalogItem = findGlobalShopCatalogItem(item);
  if (catalogItem?.imageDataUrl) return catalogItem.imageDataUrl;
  return item.imageDataUrl;
}

function normalizeInventoryItem(item: HandMadeItem): HandMadeItem {
  const catalogItem = findGlobalShopCatalogItem(item);
  let normalized: HandMadeItem;
  if (catalogItem) {
    normalized = {
      ...catalogItem,
      ...item,
      type: catalogItem.type,
      cat: catalogItem.cat,
      label: catalogItem.label,
      color: catalogItem.color,
      imageDataUrl: catalogItem.imageDataUrl,
      source: item.source ?? "purchased",
      roomCategory: undefined,
    };
  } else if (!item.source && item.id.startsWith("custom-")) {
    normalized = { ...item, source: "handmade" };
  } else {
    normalized = item;
  }

  if (
    normalized.source === "purchased"
    && !normalized.avatarPlaced
    && normalized.placement?.referenceWidth
  ) {
    normalized = { ...normalized, avatarPlaced: true };
  }

  return normalized;
}

export function loadHandMadeItems(userId: string): HandMadeItem[] {
  try {
    const raw = localStorage.getItem(`${HANDMADE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HandMadeItem[];
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeInventoryItem);
    const needsPersist = parsed.some((item, index) => {
      const next = normalized[index];
      return item.imageDataUrl !== next.imageDataUrl || item.source !== next.source;
    });
    if (needsPersist) {
      saveHandMadeItems(userId, normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

const OWNED_LISTINGS_KEY_PREFIX = "reworld_shop_owned_listings_";
const COINS_KEY_PREFIX = "reworld_shop_coins_";

export const DEFAULT_SHOP_COINS = 500;

export function loadCoins(userId: string): number {
  try {
    const raw = localStorage.getItem(`${COINS_KEY_PREFIX}${userId}`);
    if (!raw) return DEFAULT_SHOP_COINS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_SHOP_COINS;
  } catch {
    return DEFAULT_SHOP_COINS;
  }
}

export function saveCoins(userId: string, coins: number) {
  try {
    localStorage.setItem(`${COINS_KEY_PREFIX}${userId}`, String(Math.max(0, Math.floor(coins))));
  } catch {
    /* ignore quota errors */
  }
}

export function loadOwnedListingIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${OWNED_LISTINGS_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveOwnedListingIds(userId: string, ids: Iterable<string>) {
  try {
    localStorage.setItem(`${OWNED_LISTINGS_KEY_PREFIX}${userId}`, JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}

export function markListingOwned(userId: string, listingId: string) {
  const owned = loadOwnedListingIds(userId);
  owned.add(listingId);
  saveOwnedListingIds(userId, owned);
}

/** True when this buyer already owns the listing or a purchased copy of the same item. */
export function hasPurchasedShopListing(
  userId: string,
  listing: { id: string; itemId: string; item: { id: string } },
  ownedIds?: Set<string>,
): boolean {
  const owned = ownedIds ?? loadOwnedListingIds(userId);
  if (owned.has(listing.id)) return true;

  const inventory = loadHandMadeItems(userId);
  return inventory.some(item =>
    item.id === listing.item.id
    || item.id === listing.itemId
    || item.id.startsWith(`purchased-${listing.itemId}-`)
    || item.id.startsWith(`purchased-${listing.item.id}-`),
  );
}

/** Re-add global shop purchases that were owned but missing from inventory. */
export function syncPurchasedInventory(userId: string): HandMadeItem[] {
  const inventory = loadHandMadeItems(userId);
  const ownedListingIds = loadOwnedListingIds(userId);
  const inventoryIds = new Set(inventory.map(item => item.id));
  let next = inventory;
  let changed = false;

  for (const listing of GLOBAL_SHOP_LISTINGS) {
    if (inventoryIds.has(listing.item.id)) {
      if (!ownedListingIds.has(listing.id)) {
        ownedListingIds.add(listing.id);
        changed = true;
      }
      continue;
    }
    if (ownedListingIds.has(listing.id)) {
      next = [{
        ...listing.item,
        source: "purchased" as const,
        createdAt: new Date().toISOString(),
      }, ...next];
      inventoryIds.add(listing.item.id);
      changed = true;
    }
  }

  if (changed) {
    saveOwnedListingIds(userId, ownedListingIds);
    saveHandMadeItems(userId, next);
  }
  return next;
}

/** Owned items from shop purchases and hand-tracking (not for sale by default). */
export function loadMyInventory(userId: string): HandMadeItem[] {
  return syncPurchasedInventory(userId);
}

export function canListInMyShop(item: HandMadeItem): boolean {
  return item.source !== "purchased";
}

/** Items the user can list in 내 상점 (handmade only, not shop purchases). */
export function loadShopSourceItems(userId: string): HandMadeItem[] {
  return loadHandMadeItems(userId).filter(item => canListInMyShop(item));
}

/** Items shown in item creator (handmade + purchased, equippable on avatar). */
export function loadAvatarCreatorItems(userId: string): HandMadeItem[] {
  return loadMyInventory(userId).filter(item => canEquipOnAvatar(item) && !!resolveHandMadeItemImageUrl(item));
}

/** @deprecated Use loadAvatarCreatorItems */
export function loadHandmadeCreatorItems(userId: string): HandMadeItem[] {
  return loadAvatarCreatorItems(userId);
}

export function updateHandMadeItem(
  userId: string,
  itemId: string,
  patch: Partial<HandMadeItem>,
): HandMadeItem | null {
  const items = loadHandMadeItems(userId);
  let updated: HandMadeItem | null = null;
  const next = items.map(item => {
    if (item.id !== itemId) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  if (!updated) return null;
  if (patch.placement) {
    updated = { ...updated, placement: normalizeItemPlacement(updated.placement) };
  }
  saveHandMadeItems(userId, next);
  return updated;
}

export function mergeInventoryItems(local: HandMadeItem[], remote: HandMadeItem[]): HandMadeItem[] {
  const map = new Map<string, HandMadeItem>();
  for (const item of remote) map.set(item.id, normalizeInventoryItem(item));
  for (const item of local) {
    const normalized = normalizeInventoryItem(item);
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, normalized);
      continue;
    }
    const localTime = Date.parse(normalized.createdAt) || 0;
    const remoteTime = Date.parse(existing.createdAt) || 0;
    map.set(item.id, localTime >= remoteTime ? normalized : existing);
  }
  return [...map.values()].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

/** Prefer remote sync while keeping handmade originals that were wrongly removed from server. */
export function mergeInventoryWithRemoteSync(
  local: HandMadeItem[],
  remote: HandMadeItem[],
  remoteUpdatedAt?: string,
): HandMadeItem[] {
  const merged = mergeInventoryItems(local, remote);
  const remoteTime = Date.parse(remoteUpdatedAt ?? "") || 0;
  if (remoteTime <= 0) return merged;

  const remoteIds = new Set(remote.map(item => item.id));
  return merged.filter(item => {
    if (remoteIds.has(item.id)) return true;
    if (isRecoverableHandmadeOriginal(item)) return true;
    const created = Date.parse(item.createdAt) || 0;
    return created > remoteTime;
  });
}

export function isRecoverableHandmadeOriginal(item: HandMadeItem): boolean {
  if (item.source === "purchased") return false;
  if (item.id.startsWith("purchased-")) return false;
  if (item.id.startsWith("custom-")) return true;
  if (item.source === "handmade") return true;
  return canListInMyShop(item);
}

export function findLocalHandmadeMissingFromRemote(
  userId: string,
  remoteItems: HandMadeItem[],
): HandMadeItem[] {
  const remoteIds = new Set(remoteItems.map(item => item.id));
  return loadHandMadeItems(userId).filter(item => !remoteIds.has(item.id) && isRecoverableHandmadeOriginal(item));
}

export function parseOriginalItemIdFromPurchasedId(purchasedId: string): string | null {
  const match = purchasedId.match(/^purchased-(.+)-(\d+)$/);
  return match?.[1] ?? null;
}

export function getInventorySnapshot(userId: string) {
  return {
    items: loadHandMadeItems(userId).map(item => {
      if (!findGlobalShopCatalogItem(item)) return item;
      const { imageDataUrl: _imageDataUrl, ...rest } = item;
      return rest;
    }),
    ownedListingIds: [...loadOwnedListingIds(userId)],
    coins: loadCoins(userId),
  };
}

export function applyInventorySnapshot(
  userId: string,
  items: HandMadeItem[],
  ownedListingIds: string[],
  coins?: number,
) {
  saveHandMadeItems(userId, items.map(normalizeInventoryItem));
  saveOwnedListingIds(userId, ownedListingIds);
  if (typeof coins === "number" && Number.isFinite(coins)) {
    saveCoins(userId, coins);
  }
}


export function saveHandMadeItems(userId: string, items: HandMadeItem[]) {
  try {
    localStorage.setItem(`${HANDMADE_KEY_PREFIX}${userId}`, JSON.stringify(items));
  } catch {
    /* ignore quota errors */
  }
}

export function addHandMadeItem(userId: string, item: HandMadeItem) {
  const items = loadHandMadeItems(userId);
  saveHandMadeItems(userId, [item, ...items.filter(entry => entry.id !== item.id)]);
}

/** Mark inventory items as placed on the avatar (item creator save). */
export function markAvatarPlacedItems(userId: string, itemIds: string[]): HandMadeItem[] {
  const placed = new Set(itemIds);
  const items = loadHandMadeItems(userId);
  const next = items.map(item => (placed.has(item.id) ? { ...item, avatarPlaced: true } : item));
  saveHandMadeItems(userId, next);
  return next;
}

/** Permanently remove an inventory item and any of the user's shop listings for it. */
export function deleteHandMadeItem(userId: string, itemId: string): boolean {
  const items = loadHandMadeItems(userId);
  if (!items.some(item => item.id === itemId)) return false;
  saveHandMadeItems(userId, items.filter(item => item.id !== itemId));
  saveMyListings(userId, loadMyListings(userId).filter(listing => listing.itemId !== itemId));
  return true;
}

export function loadMyListings(userId: string): ShopListing[] {
  try {
    const raw = localStorage.getItem(`${LISTINGS_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShopListing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyListings(userId: string, listings: ShopListing[]) {
  try {
    localStorage.setItem(`${LISTINGS_KEY_PREFIX}${userId}`, JSON.stringify(listings));
  } catch {
    /* ignore quota errors */
  }
}

export function getMyListingsWithItems(
  userId: string,
  nickname: string,
  listings: ShopListing[] = loadMyListings(userId),
): ShopListingWithItem[] {
  const items = loadShopSourceItems(userId);
  const itemMap = new Map(items.map(item => [item.id, item]));
  return listings
    .map(listing => {
      const item = itemMap.get(listing.itemId);
      if (!item) return null;
      return { ...listing, sellerNickname: nickname, item };
    })
    .filter((entry): entry is ShopListingWithItem => entry !== null);
}

/** Remote listings + local active listings (내 상점 → 전체 상점 노출). */
export function mergePublicShopListings(
  remote: ShopListingWithItem[],
  localActive: ShopListingWithItem[],
): ShopListingWithItem[] {
  const byId = new Map<string, ShopListingWithItem>();
  for (const listing of remote) {
    if (listing.sellerId === "reworld-shop") continue;
    byId.set(listing.id, listing);
  }
  for (const listing of localActive) {
    if (!byId.has(listing.id)) byId.set(listing.id, listing);
  }
  return [...byId.values()].sort(
    (a, b) => (Date.parse(b.listedAt) || 0) - (Date.parse(a.listedAt) || 0),
  );
}

/** Filter shop listings by seller nickname or item label (case-insensitive). */
export function filterShopListingsByQuery(
  listings: ShopListingWithItem[],
  query: string,
): ShopListingWithItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return listings;
  return listings.filter(listing =>
    listing.sellerNickname.toLowerCase().includes(trimmed)
    || listing.item.label.toLowerCase().includes(trimmed),
  );
}

export function searchFriendListings(query: string): ShopListingWithItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const exact = FRIEND_SHOP_SEED[trimmed];
  if (exact) return exact;

  const lower = trimmed.toLowerCase();
  return Object.entries(FRIEND_SHOP_SEED)
    .filter(([nickname]) => nickname.toLowerCase().includes(lower))
    .flatMap(([, listings]) => listings);
}

export function getFriendSuggestions(query: string): string[] {
  const trimmed = query.trim().toLowerCase();
  const names = [...NEIGHBORS.map(n => n.name), ...Object.keys(FRIEND_SHOP_SEED)];
  const unique = Array.from(new Set(names));
  if (!trimmed) return unique;
  return unique.filter(name => name.toLowerCase().includes(trimmed));
}
