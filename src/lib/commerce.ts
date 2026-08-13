import { SHOP_CATALOG, getShopCatalogItem, type ShopCatalogItem } from "../app/shop-catalog";
import {
  getCloverBalance,
  hydrateCloverFromServer,
  setCloverBalance,
  transferClovers,
} from "./clover-rewards";
import { saveLocalNotification, saveShopSaleNotification } from "./notifications";
import {
  loadMyInventory,
  loadMyListings,
  resolveHandMadeItemImageUrl,
  type HandMadeItem,
} from "./shop-storage";
import { isLocalOnlyUserId } from "./guest";
import { isSupabaseConfigured, supabase } from "./supabase";

export type InventoryEntry = {
  itemId: string;
  quantity: number;
  acquiredAt: string;
};

export type MarketplaceListing = {
  id: string;
  sellerId: string;
  sellerNickname: string;
  itemId: string;
  price: number;
  listedAt: string;
};

export type CommerceSnapshot = {
  balance: number;
  inventory: InventoryEntry[];
  listings: MarketplaceListing[];
  remote: boolean;
};

export type CommerceResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const INVENTORY_PREFIX = "reworld_inventory_v2_";
const LISTINGS_KEY = "reworld_marketplace_listings_v2";
/** Legacy parallel wallet — migrated once into the shared clover store. */
const LEGACY_WALLET_PREFIX = "reworld_wallet_v2_";

export const DEMO_SHOP_USERS = [
  { id: "demo-starlight", nickname: "별빛소녀" },
  { id: "demo-sky", nickname: "하늘이" },
  { id: "demo-mint", nickname: "민트초코" },
  { id: "demo-cream", nickname: "크림몽" },
] as const;

export function ensureDemoMarketplaceListings() {
  const current = loadAllLocalListings();
  if (current.some((listing) => listing.sellerId.startsWith("demo-"))) return;
  const seeds: MarketplaceListing[] = [
    { id: "demo-listing-1", sellerId: "demo-starlight", sellerNickname: "별빛소녀", itemId: "avatar-ribbon", price: 140, listedAt: "2026-08-01T09:00:00.000Z" },
    { id: "demo-listing-2", sellerId: "demo-starlight", sellerNickname: "별빛소녀", itemId: "emoticon-party", price: 100, listedAt: "2026-08-01T08:00:00.000Z" },
    { id: "demo-listing-3", sellerId: "demo-starlight", sellerNickname: "별빛소녀", itemId: "interior-moon-light", price: 140, listedAt: "2026-08-01T07:00:00.000Z" },
    { id: "demo-listing-4", sellerId: "demo-sky", sellerNickname: "하늘이", itemId: "avatar-sailor", price: 120, listedAt: "2026-08-02T09:00:00.000Z" },
    { id: "demo-listing-5", sellerId: "demo-sky", sellerNickname: "하늘이", itemId: "emoticon-cry", price: 80, listedAt: "2026-08-02T08:00:00.000Z" },
    { id: "demo-listing-6", sellerId: "demo-mint", sellerNickname: "민트초코", itemId: "interior-monstera", price: 100, listedAt: "2026-08-03T09:00:00.000Z" },
    { id: "demo-listing-7", sellerId: "demo-mint", sellerNickname: "민트초코", itemId: "emoticon-best", price: 90, listedAt: "2026-08-03T08:00:00.000Z" },
    { id: "demo-listing-8", sellerId: "demo-cream", sellerNickname: "크림몽", itemId: "interior-teddy", price: 110, listedAt: "2026-08-04T09:00:00.000Z" },
  ];
  saveAllLocalListings([...seeds, ...current]);
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* local fallback can keep running in memory-only browsers */
  }
}

/**
 * One-time: fold legacy marketplace wallet into the shared clover balance
 * (same store as profile 네잎클로버) so shop ↔ profile stay in sync.
 */
function migrateLegacyWalletIntoClovers(userId: string) {
  try {
    const flagKey = `${LEGACY_WALLET_PREFIX}migrated_${userId}`;
    if (localStorage.getItem(flagKey)) return;
    const raw = localStorage.getItem(`${LEGACY_WALLET_PREFIX}${userId}`);
    localStorage.setItem(flagKey, "1");
    if (raw == null) return;
    const wallet = Number(raw);
    if (!Number.isFinite(wallet) || wallet < 0) return;
    // Prefer the lower balance so prior shop spends aren't wiped by a higher default wallet.
    const clover = getCloverBalance(userId);
    const merged = Math.min(Math.floor(wallet), clover);
    if (merged !== clover) {
      setCloverBalance(userId, merged);
    }
  } catch {
    /* ignore */
  }
}

function seedInventory(): InventoryEntry[] {
  const acquiredAt = new Date().toISOString();
  return SHOP_CATALOG.map((item) => ({ itemId: item.id, quantity: 1, acquiredAt }));
}

function loadLocalInventory(userId: string): InventoryEntry[] {
  const key = `${INVENTORY_PREFIX}${userId}`;
  const existing = readJson<InventoryEntry[] | null>(key, null);
  if (existing) return existing;
  const seeded = seedInventory();
  writeJson(key, seeded);
  return seeded;
}

function saveLocalInventory(userId: string, inventory: InventoryEntry[]) {
  writeJson(`${INVENTORY_PREFIX}${userId}`, inventory.filter((item) => item.quantity > 0));
}

function loadAllLocalListings(): MarketplaceListing[] {
  return readJson<MarketplaceListing[]>(LISTINGS_KEY, []);
}

function saveAllLocalListings(listings: MarketplaceListing[]) {
  writeJson(LISTINGS_KEY, listings);
}

function isMissingCommerceSchema(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("could not find the function") ||
    lower.includes("marketplace_listings") ||
    lower.includes("user_wallets") ||
    lower.includes("user_inventory")
  );
}

async function loadRemoteSnapshot(userId: string): Promise<Omit<CommerceSnapshot, "balance"> | null> {
  const { error: bootstrapError } = await supabase.rpc("bootstrap_commerce");
  if (bootstrapError) {
    if (!isMissingCommerceSchema(bootstrapError.message)) {
      console.error("[commerce] bootstrap failed:", bootstrapError.message);
    }
    return null;
  }

  const [inventoryResult, listingResult] = await Promise.all([
    supabase.from("user_inventory").select("item_id, quantity, acquired_at").eq("user_id", userId),
    supabase
      .from("marketplace_listings")
      .select("id, seller_id, seller_nickname, item_id, price, listed_at")
      .eq("seller_id", userId)
      .order("listed_at", { ascending: false }),
  ]);

  if (inventoryResult.error || listingResult.error) return null;

  // Balance always comes from shared clovers (user_inventory.coins / local shop coins),
  // never from the parallel user_wallets table.
  return {
    inventory: (inventoryResult.data ?? []).map((row) => ({
      itemId: String(row.item_id),
      quantity: Number(row.quantity),
      acquiredAt: String(row.acquired_at),
    })),
    listings: (listingResult.data ?? []).map((row) => ({
      id: String(row.id),
      sellerId: String(row.seller_id),
      sellerNickname: String(row.seller_nickname),
      itemId: String(row.item_id),
      price: Number(row.price),
      listedAt: String(row.listed_at),
    })),
    remote: true,
  };
}

export async function loadCommerceSnapshot(userId: string): Promise<CommerceSnapshot> {
  migrateLegacyWalletIntoClovers(userId);
  const balance = isSupabaseConfigured()
    ? await hydrateCloverFromServer(userId)
    : getCloverBalance(userId);

  if (isSupabaseConfigured()) {
    const remote = await loadRemoteSnapshot(userId);
    if (remote) {
      return {
        balance,
        inventory: remote.inventory,
        listings: remote.listings,
        remote: true,
      };
    }
  }

  return {
    balance,
    inventory: loadLocalInventory(userId),
    listings: loadAllLocalListings().filter((listing) => listing.sellerId === userId),
    remote: false,
  };
}

export async function loadSellerListings(sellerId: string): Promise<MarketplaceListing[]> {
  if (isSupabaseConfigured() && !isLocalOnlyUserId(sellerId)) {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("id, seller_id, seller_nickname, item_id, price, listed_at")
      .eq("seller_id", sellerId)
      .order("listed_at", { ascending: false });
    if (!error) {
      return (data ?? []).map((row) => ({
        id: String(row.id),
        sellerId: String(row.seller_id),
        sellerNickname: String(row.seller_nickname),
        itemId: String(row.item_id),
        price: Number(row.price),
        listedAt: String(row.listed_at),
      }));
    }
  }
  return loadAllLocalListings().filter((listing) => listing.sellerId === sellerId);
}

export function getReservedItemCount(listings: MarketplaceListing[], itemId: string): number {
  return listings.filter((listing) => listing.itemId === itemId).length;
}

export function getAvailableInventoryItems(snapshot: CommerceSnapshot): ShopCatalogItem[] {
  return snapshot.inventory
    .filter((entry) => entry.quantity > getReservedItemCount(snapshot.listings, entry.itemId))
    .map((entry) => getShopCatalogItem(entry.itemId))
    .filter((item): item is ShopCatalogItem => Boolean(item));
}

export async function createMarketplaceListing(
  userId: string,
  nickname: string,
  itemId: string,
  price: number,
  preferRemote: boolean,
): Promise<CommerceResult> {
  const normalizedPrice = Math.floor(price);
  if (!getShopCatalogItem(itemId)) return { ok: false, error: "아이템 정보를 찾지 못했어요." };
  if (!Number.isFinite(normalizedPrice) || normalizedPrice < 1 || normalizedPrice > 999_999) {
    return { ok: false, error: "가격은 1~999,999 클로버로 입력해 주세요." };
  }

  if (preferRemote && isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("create_marketplace_listing", {
      target_item_id: itemId,
      target_price: normalizedPrice,
    });
    if (!error) {
      const payload = data as { ok?: boolean; error?: string };
      return payload?.ok
        ? { ok: true, message: "상점에 등록했어요." }
        : { ok: false, error: payload?.error ?? "등록에 실패했어요." };
    }
    if (!isMissingCommerceSchema(error.message)) return { ok: false, error: error.message };
  }

  const inventory = loadLocalInventory(userId);
  const allListings = loadAllLocalListings();
  const quantity = inventory.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
  const reserved = allListings.filter((listing) => listing.sellerId === userId && listing.itemId === itemId).length;
  if (quantity <= reserved) return { ok: false, error: "판매 가능한 수량이 없어요." };
  allListings.unshift({
    id: crypto.randomUUID(),
    sellerId: userId,
    sellerNickname: nickname,
    itemId,
    price: normalizedPrice,
    listedAt: new Date().toISOString(),
  });
  saveAllLocalListings(allListings);
  return { ok: true, message: "상점에 등록했어요." };
}

export async function cancelMarketplaceListing(
  userId: string,
  listingId: string,
  preferRemote: boolean,
): Promise<CommerceResult> {
  if (preferRemote && isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("cancel_marketplace_listing", { listing_id: listingId });
    if (!error) {
      const payload = data as { ok?: boolean; error?: string };
      return payload?.ok
        ? { ok: true, message: "판매를 중단했어요." }
        : { ok: false, error: payload?.error ?? "판매 중단에 실패했어요." };
    }
    if (!isMissingCommerceSchema(error.message)) return { ok: false, error: error.message };
  }

  const listings = loadAllLocalListings();
  const target = listings.find((listing) => listing.id === listingId);
  if (!target || target.sellerId !== userId) return { ok: false, error: "판매글을 찾지 못했어요." };
  saveAllLocalListings(listings.filter((listing) => listing.id !== listingId));
  return { ok: true, message: "판매를 중단했어요." };
}

function applyLocalItemTransfer(buyerId: string, listing: MarketplaceListing): CommerceResult {
  const allListings = loadAllLocalListings();
  const current = allListings.find((entry) => entry.id === listing.id);
  if (!current) return { ok: false, error: "이미 판매된 아이템이에요." };

  const sellerInventory = loadLocalInventory(current.sellerId);
  const sellerEntry = sellerInventory.find((entry) => entry.itemId === current.itemId);
  if (!sellerEntry || sellerEntry.quantity < 1) return { ok: false, error: "판매자의 보유 수량이 부족해요." };
  sellerEntry.quantity -= 1;
  saveLocalInventory(current.sellerId, sellerInventory);

  const buyerInventory = loadLocalInventory(buyerId);
  const buyerEntry = buyerInventory.find((entry) => entry.itemId === current.itemId);
  if (buyerEntry) buyerEntry.quantity += 1;
  else buyerInventory.unshift({ itemId: current.itemId, quantity: 1, acquiredAt: new Date().toISOString() });
  saveLocalInventory(buyerId, buyerInventory);

  saveAllLocalListings(allListings.filter((entry) => entry.id !== current.id));
  return { ok: true, message: "구매가 완료됐어요." };
}

export async function buyMarketplaceListing(
  buyerId: string,
  listing: MarketplaceListing,
  preferRemote: boolean,
  buyerNickname = "사용자",
): Promise<CommerceResult> {
  if (buyerId === listing.sellerId) return { ok: false, error: "내 아이템은 구매할 수 없어요." };

  // Gate on the same clover balance the profile shows.
  if (getCloverBalance(buyerId) < listing.price) {
    return { ok: false, error: "클로버가 부족해요." };
  }

  let itemMoved = false;

  if (preferRemote && isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("buy_marketplace_listing", { listing_id: listing.id });
    if (!error) {
      const payload = data as { ok?: boolean; error?: string };
      if (payload?.ok) {
        itemMoved = true;
      } else if (payload?.error && !String(payload.error).includes("클로버가 부족")) {
        return { ok: false, error: payload.error };
      }
      // Wallet-table "insufficient" → fall through to local item path; clovers already checked.
    } else if (!isMissingCommerceSchema(error.message)) {
      return { ok: false, error: error.message };
    }
  }

  if (!itemMoved) {
    const local = applyLocalItemTransfer(buyerId, listing);
    if (!local.ok) return local;
  }

  const paid = transferClovers(buyerId, listing.sellerId, listing.price);
  if (!paid.ok) return { ok: false, error: "클로버가 부족해요." };
  const item = getShopCatalogItem(listing.itemId);
  await saveShopSaleNotification({
    sellerId: listing.sellerId,
    buyerId,
    buyerNickname,
    itemLabel: item?.label ?? "아이템",
    price: listing.price,
    listingId: listing.id,
  });
  return { ok: true, message: "구매가 완료됐어요." };
}

export async function sendItemGift(args: {
  senderId: string;
  senderNickname: string;
  recipientId: string;
  itemId: string;
  message: string;
  preferRemote: boolean;
}): Promise<CommerceResult> {
  const item = getShopCatalogItem(args.itemId);
  if (!item?.giftable) return { ok: false, error: "선물할 수 없는 아이템이에요." };
  if (args.senderId === args.recipientId) return { ok: false, error: "나에게는 선물할 수 없어요." };

  if (args.preferRemote && isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("send_item_gift", {
      recipient_id: args.recipientId,
      target_item_id: args.itemId,
      gift_message: args.message.trim() || null,
    });
    if (!error) {
      const payload = data as { ok?: boolean; error?: string };
      return payload?.ok
        ? { ok: true, message: `${item.label}을(를) 선물했어요.` }
        : { ok: false, error: payload?.error ?? "선물에 실패했어요." };
    }
    if (!isMissingCommerceSchema(error.message)) return { ok: false, error: error.message };
  }

  const senderInventory = loadLocalInventory(args.senderId);
  const entry = senderInventory.find((inventoryItem) => inventoryItem.itemId === args.itemId);
  const reserved = loadAllLocalListings().filter(
    (listing) => listing.sellerId === args.senderId && listing.itemId === args.itemId,
  ).length;
  if (!entry || entry.quantity <= reserved) return { ok: false, error: "선물 가능한 수량이 없어요." };
  entry.quantity -= 1;
  saveLocalInventory(args.senderId, senderInventory);

  const recipientInventory = loadLocalInventory(args.recipientId);
  const recipientEntry = recipientInventory.find((inventoryItem) => inventoryItem.itemId === args.itemId);
  if (recipientEntry) recipientEntry.quantity += 1;
  else recipientInventory.unshift({ itemId: args.itemId, quantity: 1, acquiredAt: new Date().toISOString() });
  saveLocalInventory(args.recipientId, recipientInventory);

  await saveLocalNotification(args.recipientId, {
    type: "gift",
    actorId: args.senderId,
    actorNickname: args.senderNickname,
    message: `${args.senderNickname}님이 ${item.label}을(를) 선물했어요 🎁`,
    content: args.message.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, message: `${item.label}을(를) 선물했어요.` };
}

export async function sendCloverGift(args: {
  senderId: string;
  senderNickname: string;
  recipientId: string;
  amount: number;
  message: string;
  preferRemote: boolean;
}): Promise<CommerceResult> {
  const amount = Math.floor(args.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > 5000) {
    return { ok: false, error: "클로버는 한 번에 10~5,000개까지 선물할 수 있어요." };
  }
  if (args.senderId === args.recipientId) return { ok: false, error: "나에게는 선물할 수 없어요." };

  // Always enforce shared clover balance (profile + shop).
  if (getCloverBalance(args.senderId) < amount) {
    return { ok: false, error: "클로버가 부족해요." };
  }

  let remoteOk = false;
  if (args.preferRemote && isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("send_clover_gift", {
      recipient_id: args.recipientId,
      gift_amount: amount,
      gift_message: args.message.trim() || null,
    });
    if (!error) {
      const payload = data as { ok?: boolean; error?: string };
      if (payload?.ok) {
        remoteOk = true;
      } else if (payload?.error && !String(payload.error).includes("클로버가 부족")) {
        return { ok: false, error: payload?.error ?? "선물에 실패했어요." };
      }
    } else if (!isMissingCommerceSchema(error.message)) {
      return { ok: false, error: error.message };
    }
  }

  const paid = transferClovers(args.senderId, args.recipientId, amount);
  if (!paid.ok) return { ok: false, error: "클로버가 부족해요." };

  if (!remoteOk) {
    await saveLocalNotification(args.recipientId, {
      type: "gift",
      actorId: args.senderId,
      actorNickname: args.senderNickname,
      message: `${args.senderNickname}님이 ${amount} 클로버를 선물했어요 🍀`,
      content: args.message.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return { ok: true, message: `${amount} 클로버를 선물했어요.` };
}

/** Peek local inventory without seeding a full catalog for unknown users. */
function peekLocalInventory(userId: string): InventoryEntry[] | null {
  const key = `${INVENTORY_PREFIX}${userId}`;
  return readJson<InventoryEntry[] | null>(key, null);
}

/** Map 내 아이템(HandMade) → World/조르기용 카탈로그 셰이프 (실제 전송은 unified-gifts). */
function handMadeToGiftableCatalog(item: HandMadeItem): ShopCatalogItem {
  const kind =
    item.type === "emoticon" ? "emoticon" : item.type === "room" ? "interior" : "avatar";
  return {
    id: item.id,
    label: item.label,
    kind,
    category: item.cat || "아이템",
    color: item.color || "#c090a0",
    preview: item.icon || (kind === "emoticon" ? "😊" : kind === "interior" ? "🪑" : "👕"),
    price: 0,
    contentId: item.templateId || item.id,
    imageDataUrl: resolveHandMadeItemImageUrl(item),
    giftable: true,
  };
}

/**
 * Load another player's giftable "내 아이템" list from user_inventory / local HandMade.
 * Returns null when peer inventory is not available on this client.
 */
export async function loadPeerGiftableItems(userId: string): Promise<ShopCatalogItem[] | null> {
  const { getGiftableInventoryItems } = await import("./unified-gifts");
  const { syncBuyerInventoryFromServer } = await import("./shop-sync");
  const { fetchUserInventory } = await import("./user-sync");

  if (isSupabaseConfigured() && !isLocalOnlyUserId(userId)) {
    const remote = await fetchUserInventory(userId);
    if (remote) {
      // Apply peer row into a temporary read via ids already on this device if same browser;
      // otherwise map remote items directly (no local seed).
      return remote.items
        .filter((item) => item?.id)
        .map((item) => handMadeToGiftableCatalog(item))
        .filter((item) => item.giftable);
    }
  }

  // Same-browser fallback (demo / local-only peers).
  try {
    await syncBuyerInventoryFromServer(userId);
  } catch {
    /* ignore */
  }
  const local = getGiftableInventoryItems(userId);
  if (!local.length && !peekLocalInventory(userId)) return null;
  return local.map(handMadeToGiftableCatalog);
}

/** Own giftable inventory (for World broadcast of "내 아이템"). */
export async function loadOwnGiftableItems(userId: string): Promise<ShopCatalogItem[]> {
  const { getGiftableInventoryItems, loadUnifiedGiftSnapshot } = await import("./unified-gifts");
  await loadUnifiedGiftSnapshot(userId);
  return getGiftableInventoryItems(userId).map(handMadeToGiftableCatalog);
}

/** Active items in the user's 내 상점, used by WORLD 선물하기/조르기. */
export async function loadOwnShopItems(userId: string, nickname?: string): Promise<ShopCatalogItem[]> {
  if (nickname && isSupabaseConfigured()) {
    const { syncSellerShopListings } = await import("./shop-sync");
    await syncSellerShopListings(userId, nickname);
  }
  const { loadUnifiedGiftSnapshot } = await import("./unified-gifts");
  await loadUnifiedGiftSnapshot(userId, { shopOnly: true });
  const listedIds = new Set(loadMyListings(userId).map((listing) => listing.itemId));
  return loadMyInventory(userId)
    .filter((item) => listedIds.has(item.id))
    .map(handMadeToGiftableCatalog);
}

/** Another user's active 내 상점 items. Remote listings are authoritative cross-device. */
export async function loadPeerShopItems(userId: string): Promise<ShopCatalogItem[] | null> {
  if (isSupabaseConfigured() && !isLocalOnlyUserId(userId)) {
    const { fetchSellerShopListings } = await import("./shop-sync");
    const remote = await fetchSellerShopListings(userId);
    if (remote) return remote.map((listing) => handMadeToGiftableCatalog(listing.item));
  }

  const listedIds = new Set(loadMyListings(userId).map((listing) => listing.itemId));
  const local = loadMyInventory(userId).filter((item) => listedIds.has(item.id));
  if (!local.length && !loadMyListings(userId).length) return null;
  return local.map(handMadeToGiftableCatalog);
}

export type GiftBegPayload = {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  itemId: string;
  itemLabel: string;
  message?: string;
  createdAt: string;
};

/**
 * Persist a gift-beg (조르기) request for the recipient.
 * Tries optional RPC `send_gift_beg`, then always writes a local notification.
 */
export async function sendGiftBegRequest(args: {
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  itemId: string;
  itemLabel?: string;
  message?: string;
}): Promise<CommerceResult & { beg?: GiftBegPayload }> {
  const catalog = getShopCatalogItem(args.itemId);
  const itemLabel = (args.itemLabel || catalog?.label || "").trim();
  if (!itemLabel) return { ok: false, error: "조를 수 없는 아이템이에요." };
  if (catalog && catalog.giftable === false) return { ok: false, error: "조를 수 없는 아이템이에요." };
  if (args.fromUserId === args.toUserId) return { ok: false, error: "나에게는 조를 수 없어요." };

  const beg: GiftBegPayload = {
    id: crypto.randomUUID(),
    fromUserId: args.fromUserId,
    fromNickname: args.fromNickname,
    toUserId: args.toUserId,
    itemId: args.itemId,
    itemLabel,
    message: args.message?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc("send_gift_beg", {
      recipient_id: args.toUserId,
      target_item_id: args.itemId,
      beg_message: args.message?.trim() || null,
    });
    if (error) {
      if (
        !error.message.toLowerCase().includes("does not exist") &&
        !error.message.toLowerCase().includes("could not find the function")
      ) {
        // RPC exists but failed for another reason — still fall through to local so World broadcast can deliver.
        console.warn("[commerce] send_gift_beg:", error.message);
      }
    } else {
      const payload = data as { ok?: boolean; error?: string };
      if (payload?.ok === false && payload?.error && !String(payload.error).toLowerCase().includes("does not exist")) {
        return { ok: false, error: payload.error };
      }
    }
  }

  await saveLocalNotification(args.toUserId, {
    type: "gift_beg",
    actorId: args.fromUserId,
    actorNickname: args.fromNickname,
    message: `${args.fromNickname}님이 아이템 '${itemLabel}'를 요청합니다.`,
    content: args.message?.trim() || undefined,
    itemId: args.itemId,
    createdAt: beg.createdAt,
    id: beg.id,
  });
  window.dispatchEvent(
    new CustomEvent("reworld-notifications-changed", { detail: { userId: args.toUserId } }),
  );

  return { ok: true, message: `${itemLabel} 조르기를 보냈어요.`, beg };
}
