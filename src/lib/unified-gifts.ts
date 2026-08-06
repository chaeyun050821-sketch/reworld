import { saveLocalNotification } from "./notifications";
import {
  GLOBAL_SHOP_LISTINGS,
  loadCoins,
  loadMyInventory,
  loadMyListings,
  loadOwnedListingIds,
  saveCoins,
  saveHandMadeItems,
  saveOwnedListingIds,
  type HandMadeItem,
} from "./shop-storage";
import { syncBuyerInventoryFromServer } from "./shop-sync";
import { isSupabaseConfigured, supabase } from "./supabase";

export type UnifiedGiftSnapshot = {
  coins: number;
  items: HandMadeItem[];
  remote: boolean;
};

export type UnifiedGiftResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function supportsRemoteGift(userId: string): boolean {
  return isSupabaseConfigured() && UUID_PATTERN.test(userId);
}

function notifyInventoryChanged(userId: string) {
  window.dispatchEvent(new CustomEvent("reworld-inventory-changed", { detail: { userId } }));
}

function notifyCloverChanged(userId: string) {
  window.dispatchEvent(new CustomEvent("reworld-clover-changed", { detail: { userId } }));
}

function officialListingForItem(item: HandMadeItem) {
  return GLOBAL_SHOP_LISTINGS.find((listing) =>
    listing.item.id === item.id || item.id.startsWith(`purchased-${listing.item.id}-`),
  );
}

export function getGiftableInventoryItems(userId: string): HandMadeItem[] {
  const listedItemIds = new Set(loadMyListings(userId).map((listing) => listing.itemId));
  return loadMyInventory(userId).filter((item) => !listedItemIds.has(item.id));
}

export async function loadUnifiedGiftSnapshot(userId: string): Promise<UnifiedGiftSnapshot> {
  const remote = supportsRemoteGift(userId);
  if (remote) await syncBuyerInventoryFromServer(userId);
  return {
    coins: loadCoins(userId),
    items: getGiftableInventoryItems(userId),
    remote,
  };
}

function mapGiftRpcError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("insufficient coins")) return "클로버가 부족해요.";
  if (lower.includes("item not found")) return "선물할 아이템을 찾지 못했어요.";
  if (lower.includes("item is listed")) return "판매 중인 아이템은 먼저 내려 주세요.";
  if (lower.includes("recipient already owns item")) return "친구가 이미 같은 아이템을 가지고 있어요.";
  if (lower.includes("not friends")) return "친구에게만 선물할 수 있어요.";
  if (lower.includes("recipient not found")) return "선물할 친구를 찾지 못했어요.";
  if (lower.includes("could not find the function") || lower.includes("send_unified_")) {
    return "선물 기능 SQL이 필요해요. Supabase에서 unified-gifts.sql을 실행해 주세요.";
  }
  return message || "선물 전송에 실패했어요.";
}

export async function sendUnifiedItemGift(args: {
  senderId: string;
  senderNickname: string;
  recipientId: string;
  itemId: string;
  message: string;
  preferRemote: boolean;
}): Promise<UnifiedGiftResult> {
  if (args.senderId === args.recipientId) return { ok: false, error: "나에게는 선물할 수 없어요." };
  const item = getGiftableInventoryItems(args.senderId).find((entry) => entry.id === args.itemId);
  if (!item) return { ok: false, error: "선물 가능한 아이템을 찾지 못했어요." };

  if (args.preferRemote && supportsRemoteGift(args.senderId) && supportsRemoteGift(args.recipientId)) {
    const { error } = await supabase.rpc("send_unified_inventory_item_gift", {
      p_recipient_id: args.recipientId,
      p_item_id: args.itemId,
      p_message: args.message.trim() || null,
    });
    if (error) return { ok: false, error: mapGiftRpcError(error.message) };

    await syncBuyerInventoryFromServer(args.senderId, { authoritativeCoins: true });
    notifyInventoryChanged(args.senderId);
    return { ok: true, message: `${item.label}을(를) 선물했어요.` };
  }

  const senderItems = loadMyInventory(args.senderId);
  const senderItem = senderItems.find((entry) => entry.id === args.itemId);
  if (!senderItem) return { ok: false, error: "선물 가능한 아이템을 찾지 못했어요." };

  const recipientItems = loadMyInventory(args.recipientId);
  const idAlreadyOwned = recipientItems.some((entry) => entry.id === senderItem.id);
  if (idAlreadyOwned) return { ok: false, error: "친구가 이미 같은 아이템을 가지고 있어요." };
  const receivedItem: HandMadeItem = {
    ...senderItem,
    source: "purchased",
    avatarPlaced: false,
    createdAt: new Date().toISOString(),
  };
  saveHandMadeItems(args.senderId, senderItems.filter((entry) => entry.id !== senderItem.id));
  saveHandMadeItems(args.recipientId, [receivedItem, ...recipientItems]);

  const officialListing = officialListingForItem(senderItem);
  if (officialListing) {
    const senderOwned = loadOwnedListingIds(args.senderId);
    senderOwned.delete(officialListing.id);
    saveOwnedListingIds(args.senderId, senderOwned);
    const recipientOwned = loadOwnedListingIds(args.recipientId);
    recipientOwned.add(officialListing.id);
    saveOwnedListingIds(args.recipientId, recipientOwned);
  }

  await saveLocalNotification(args.recipientId, {
    type: "gift",
    actorId: args.senderId,
    actorNickname: args.senderNickname,
    message: `${args.senderNickname}님이 ${item.label}을(를) 선물했어요 🎁`,
    content: args.message.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  notifyInventoryChanged(args.senderId);
  return { ok: true, message: `${item.label}을(를) 선물했어요.` };
}

export async function sendUnifiedCloverGift(args: {
  senderId: string;
  senderNickname: string;
  recipientId: string;
  amount: number;
  message: string;
  preferRemote: boolean;
}): Promise<UnifiedGiftResult> {
  const amount = Math.floor(args.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > 5000) {
    return { ok: false, error: "클로버는 한 번에 10~5,000개까지 선물할 수 있어요." };
  }
  if (args.senderId === args.recipientId) return { ok: false, error: "나에게는 선물할 수 없어요." };

  if (args.preferRemote && supportsRemoteGift(args.senderId) && supportsRemoteGift(args.recipientId)) {
    const { error } = await supabase.rpc("send_unified_clover_gift", {
      p_recipient_id: args.recipientId,
      p_amount: amount,
      p_message: args.message.trim() || null,
    });
    if (error) return { ok: false, error: mapGiftRpcError(error.message) };

    await syncBuyerInventoryFromServer(args.senderId, { authoritativeCoins: true });
    notifyCloverChanged(args.senderId);
    return { ok: true, message: `${amount} 클로버를 선물했어요.` };
  }

  const senderCoins = loadCoins(args.senderId);
  if (senderCoins < amount) return { ok: false, error: "클로버가 부족해요." };
  saveCoins(args.senderId, senderCoins - amount);
  saveCoins(args.recipientId, loadCoins(args.recipientId) + amount);
  await saveLocalNotification(args.recipientId, {
    type: "gift",
    actorId: args.senderId,
    actorNickname: args.senderNickname,
    message: `${args.senderNickname}님이 ${amount} 클로버를 선물했어요 🍀`,
    content: args.message.trim() || undefined,
    createdAt: new Date().toISOString(),
  });
  notifyCloverChanged(args.senderId);
  return { ok: true, message: `${amount} 클로버를 선물했어요.` };
}
