import type { HandMadeItem, ShopListing, ShopListingWithItem } from "./shop-storage";
import {
  applyInventorySnapshot,
  canListInMyShop,
  GLOBAL_SHOP_PRICE_MAX,
  GLOBAL_SHOP_PRICE_MIN,
  loadMyListings,
  loadShopSourceItems,
  saveMyListings,
} from "./shop-storage";
import { hydrateCloverFromServer } from "./clover-rewards";
import { fetchUserInventory, upsertUserInventory } from "./user-sync";
import { mapSupabaseError, type SyncResult } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

type ShopListingRow = {
  id: string;
  seller_id: string;
  seller_nickname: string;
  item_id: string;
  item_snapshot: HandMadeItem;
  price: number;
  listed_at: string;
  active: boolean;
};

function rowToListing(row: ShopListingRow): ShopListingWithItem {
  return {
    id: row.id,
    itemId: row.item_id,
    sellerId: row.seller_id,
    sellerNickname: row.seller_nickname,
    price: row.price,
    listedAt: row.listed_at,
    item: row.item_snapshot,
  };
}

export async function fetchActiveShopListings(): Promise<ShopListingWithItem[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("shop_listings")
    .select("id, seller_id, seller_nickname, item_id, item_snapshot, price, listed_at, active")
    .eq("active", true)
    .order("listed_at", { ascending: false });

  if (error) {
    console.error("[shop-sync] fetch listings failed:", error.message, error.code);
    return [];
  }

  if (!data) return [];
  return (data as ShopListingRow[])
    .filter((row) => row.item_snapshot && typeof row.item_snapshot === "object")
    .filter((row) => canListInMyShop(row.item_snapshot))
    .filter((row) => row.price >= GLOBAL_SHOP_PRICE_MIN && row.price <= GLOBAL_SHOP_PRICE_MAX)
    .map(rowToListing);
}

export async function fetchSellerShopListings(sellerId: string): Promise<ShopListingWithItem[] | null> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("shop_listings")
    .select("id, seller_id, seller_nickname, item_id, item_snapshot, price, listed_at, active")
    .eq("seller_id", sellerId)
    .eq("active", true)
    .order("listed_at", { ascending: false });

  if (error) {
    console.error("[shop-sync] fetch seller listings failed:", error.message, error.code);
    return null;
  }

  if (!data) return [];
  return (data as ShopListingRow[])
    .filter((row) => row.item_snapshot && typeof row.item_snapshot === "object")
    .filter((row) => canListInMyShop(row.item_snapshot))
    .filter((row) => row.price >= GLOBAL_SHOP_PRICE_MIN && row.price <= GLOBAL_SHOP_PRICE_MAX)
    .map(rowToListing);
}

export type FriendShopCatalog = {
  listed: ShopListingWithItem[];
  unlisted: HandMadeItem[];
};

export async function fetchFriendShopCatalog(
  sellerId: string,
  sellerNickname: string,
): Promise<FriendShopCatalog> {
  if (!isSupabaseConfigured()) {
    return { listed: [], unlisted: [] };
  }

  const [listedResult, inventory] = await Promise.all([
    fetchSellerShopListings(sellerId),
    fetchUserInventory(sellerId),
  ]);
  const listed = listedResult ?? [];
  const listedItemIds = new Set(listed.map(entry => entry.itemId));
  const unlisted = (inventory?.items ?? [])
    .filter(item => canListInMyShop(item))
    .filter(item => !listedItemIds.has(item.id))
    .map(item => ({ ...item, label: item.label || "만든 아이템" }));

  void sellerNickname;
  return { listed, unlisted };
}

function parsePurchasedListing(data: unknown): ShopListingWithItem | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const item = row.item as HandMadeItem | undefined;
  if (!item || typeof row.id !== "string") return null;
  return {
    id: row.id,
    itemId: String(row.itemId ?? row.item_id ?? item.id),
    sellerId: String(row.sellerId ?? row.seller_id ?? ""),
    sellerNickname: String(row.sellerNickname ?? row.seller_nickname ?? ""),
    price: Number(row.price) || 0,
    listedAt: String(row.listedAt ?? row.listed_at ?? new Date().toISOString()),
    item,
  };
}

function mapPurchaseError(message: string, code?: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient coins")) return "네잎클로버가 부족해요.";
  if (lower.includes("already purchased")) return "이미 구매한 아이템이에요.";
  if (lower.includes("cannot buy your own")) return "내 아이템은 구매할 수 없어요.";
  if (lower.includes("listing not found")) return "판매 중인 상품을 찾지 못했어요.";
  if (message.includes("purchase_shop_listing")) {
    return "구매 기능 SQL이 필요해요. Supabase에서 shop-purchase.sql을 실행해 주세요.";
  }
  return mapSupabaseError(message, code);
}

export type ShopPurchaseResult = {
  listing: ShopListingWithItem;
  buyerCoins: number;
};

export async function purchaseShopListing(
  listingId: string,
): Promise<{ ok: true; result: ShopPurchaseResult } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { data, error } = await supabase.rpc("purchase_shop_listing", {
    p_listing_id: listingId,
  });

  if (error) {
    console.error("[shop-sync] purchase listing failed:", error.message, error.code);
    return { ok: false, error: mapPurchaseError(error.message, error.code) };
  }

  const listing = parsePurchasedListing(data);
  if (!listing) {
    return { ok: false, error: "구매 처리 결과를 읽지 못했어요." };
  }

  const row = data as Record<string, unknown>;
  const buyerCoins = Number(row.buyerCoins ?? row.buyer_coins);
  return {
    ok: true,
    result: {
      listing,
      buyerCoins: Number.isFinite(buyerCoins) && buyerCoins >= 0 ? Math.floor(buyerCoins) : 0,
    },
  };
}

export async function syncBuyerInventoryFromServer(
  userId: string,
  options?: { authoritativeCoins?: boolean },
): Promise<number | null> {
  const remote = await fetchUserInventory(userId);
  if (!remote) return null;
  if (options?.authoritativeCoins) {
    applyInventorySnapshot(userId, remote.items, remote.ownedListingIds, remote.coins);
    window.dispatchEvent(new CustomEvent("reworld-clover-changed", { detail: { userId } }));
    return remote.coins;
  }
  applyInventorySnapshot(userId, remote.items, remote.ownedListingIds);
  return hydrateCloverFromServer(userId, {
    coins: remote.coins,
    cloverRewards: remote.cloverRewards,
    updatedAt: remote.updatedAt,
  });
}

function listingRowFromRemote(entry: ShopListingWithItem): ShopListing {
  return {
    id: entry.id,
    itemId: entry.itemId,
    sellerId: entry.sellerId,
    sellerNickname: entry.sellerNickname,
    price: entry.price,
    listedAt: entry.listedAt,
  };
}

/** Pull seller listings from Supabase, re-publish any local-only rows, save to localStorage.
 *  Buying does NOT remove listings — digital copies stay on sale for other buyers.
 */
export async function syncSellerShopListings(userId: string, nickname: string): Promise<ShopListing[]> {
  const local = loadMyListings(userId);
  if (!isSupabaseConfigured()) return local;

  let remote = await fetchSellerShopListings(userId);
  if (remote === null) {
    // 네트워크/권한 오류 시 로컬 목록을 지우지 않음
    return local;
  }

  const remoteIds = new Set(remote.map(entry => entry.id));

  for (const listing of local) {
    if (remoteIds.has(listing.id)) continue;
    const item = loadShopSourceItems(userId).find(entry => entry.id === listing.itemId);
    if (!item) continue;
    const result = await publishShopListing(userId, nickname, listing, item);
    if (result.ok) remoteIds.add(listing.id);
  }

  remote = await fetchSellerShopListings(userId);
  if (remote === null) {
    return local;
  }

  const byId = new Map<string, ShopListing>();
  for (const entry of remote) {
    byId.set(entry.id, listingRowFromRemote(entry));
  }
  // 원격에 아직 못 올라간 로컬 등록도 유지 (재시도용)
  for (const listing of local) {
    if (!byId.has(listing.id)) byId.set(listing.id, listing);
  }
  const next = [...byId.values()].sort(
    (a, b) => (Date.parse(b.listedAt) || 0) - (Date.parse(a.listedAt) || 0),
  );
  saveMyListings(userId, next);
  return next;
}

export async function completePlayerShopPurchase(
  buyerId: string,
  listingId: string,
): Promise<{ ok: true; listing: ShopListingWithItem; buyerCoins: number } | { ok: false; error: string }> {
  const purchase = await purchaseShopListing(listingId);
  if (!purchase.ok) return purchase;

  const buyerCoins = (await syncBuyerInventoryFromServer(buyerId, { authoritativeCoins: true })) ?? purchase.result.buyerCoins;
  return {
    ok: true,
    listing: purchase.result.listing,
    buyerCoins,
  };
}

export async function publishShopListing(
  userId: string,
  nickname: string,
  listing: ShopListing,
  item: HandMadeItem,
): Promise<SyncResult> {
  if (!canListInMyShop(item)) {
    return { ok: false, error: "픽셀 이미지로 만든 내 아이템만 등록할 수 있어요." };
  }
  if (listing.price < GLOBAL_SHOP_PRICE_MIN || listing.price > GLOBAL_SHOP_PRICE_MAX) {
    return { ok: false, error: `가격은 ${GLOBAL_SHOP_PRICE_MIN}~${GLOBAL_SHOP_PRICE_MAX} 클로버로 입력해 주세요.` };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요. 로컬에만 임시 저장됐어요." };
  }

  const { error } = await supabase.from("shop_listings").upsert(
    {
      id: listing.id,
      seller_id: userId,
      seller_nickname: nickname,
      item_id: listing.itemId,
      item_snapshot: item,
      price: listing.price,
      listed_at: listing.listedAt,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[shop-sync] publish listing failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function unpublishShopListing(listingId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const { error } = await supabase.from("shop_listings").delete().eq("id", listingId);
  if (error) {
    console.error("[shop-sync] unpublish listing failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function removeShopListingsForItem(sellerId: string, itemId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const { error } = await supabase
    .from("shop_listings")
    .delete()
    .eq("seller_id", sellerId)
    .eq("item_id", itemId);

  if (error) {
    console.error("[shop-sync] remove item listings failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function syncShopListingItemSnapshot(
  sellerId: string,
  itemId: string,
  item: HandMadeItem,
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) return { ok: true };

  const { error } = await supabase
    .from("shop_listings")
    .update({
      item_snapshot: item,
      updated_at: new Date().toISOString(),
    })
    .eq("seller_id", sellerId)
    .eq("item_id", itemId)
    .eq("active", true);

  if (error) {
    console.error("[shop-sync] update listing snapshot failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}
