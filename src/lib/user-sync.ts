import type { MiniroomData, RoomSelections } from "../app/data";
import { EMPTY_MINIROOM_DATA, EMPTY_ROOM_SELECTIONS, hasMiniroomSelections, migrateMiniroomInventory } from "../app/data";
import type { StoredAvatarProfile } from "./avatar-storage";
import type { HandMadeItem } from "./shop-storage";
import { mapSupabaseError, type SyncResult } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

type AvatarRow = {
  user_id: string;
  body_color: string;
  pixel_map: Record<string, string> | null;
  equipped: string[] | null;
};

type MiniroomRow = {
  user_id: string;
  selections: Partial<MiniroomData> | Partial<RoomSelections> | null;
};

function parseMiniroomRow(row: MiniroomRow): MiniroomData | null {
  const raw = row.selections;
  if (!raw || typeof raw !== "object") return null;

  let parsed: MiniroomData;

  if ("selections" in raw && raw.selections && typeof raw.selections === "object") {
    parsed = {
      selections: { ...EMPTY_ROOM_SELECTIONS, ...raw.selections },
      offsets: raw.offsets ?? {},
      avatarPosition: raw.avatarPosition ?? EMPTY_MINIROOM_DATA.avatarPosition,
      inventoryPlacements: raw.inventoryPlacements ?? [],
    };
  } else {
    const legacy = raw as Partial<RoomSelections> & { offsets?: unknown; avatarPosition?: MiniroomData["avatarPosition"] };
    const selectionEntries = Object.fromEntries(
      Object.entries(legacy).filter(([key]) => key in EMPTY_ROOM_SELECTIONS),
    ) as Partial<RoomSelections>;
    parsed = {
      selections: { ...EMPTY_ROOM_SELECTIONS, ...selectionEntries },
      offsets: (legacy.offsets as MiniroomData["offsets"]) ?? {},
      avatarPosition: legacy.avatarPosition ?? EMPTY_MINIROOM_DATA.avatarPosition,
      inventoryPlacements: Array.isArray((legacy as MiniroomData).inventoryPlacements)
        ? (legacy as MiniroomData).inventoryPlacements
        : [],
    };
  }

  return hasMiniroomSelections(parsed) ? migrateMiniroomInventory(parsed) : null;
}

function rowToAvatar(row: AvatarRow): StoredAvatarProfile {
  return {
    config: {
      body: row.body_color ?? "#ffd0ad",
      pixels: row.pixel_map ?? {},
    },
    equipped: row.equipped ?? [],
  };
}

export async function checkUserDataTables(): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 환경 변수가 설정되지 않았어요 (.env)" };
  }

  const { error } = await supabase.from("user_avatars").select("user_id").limit(1);
  if (error) {
    console.error("[user-sync] table check failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function fetchUserAvatar(userId: string): Promise<StoredAvatarProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from("user_avatars")
    .select("user_id, body_color, pixel_map, equipped")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[user-sync] avatar fetch failed:", error.message, error.code);
    return null;
  }
  if (!data) return null;
  return rowToAvatar(data as AvatarRow);
}

export async function fetchUserAvatars(userIds: string[]): Promise<Map<string, StoredAvatarProfile>> {
  const result = new Map<string, StoredAvatarProfile>();
  if (!isSupabaseConfigured() || userIds.length === 0) return result;

  const { data, error } = await supabase
    .from("user_avatars")
    .select("user_id, body_color, pixel_map, equipped")
    .in("user_id", userIds);

  if (error) {
    console.error("[user-sync] avatars fetch failed:", error.message, error.code);
    return result;
  }
  if (!data) return result;

  for (const row of data as AvatarRow[]) {
    result.set(row.user_id, rowToAvatar(row));
  }
  return result;
}

export async function upsertUserAvatar(userId: string, avatar: StoredAvatarProfile): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error } = await supabase.from("user_avatars").upsert(
    {
      user_id: userId,
      body_color: avatar.config.body,
      pixel_map: avatar.config.pixels ?? {},
      equipped: avatar.equipped ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[user-sync] avatar upsert failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function fetchUserMiniroom(userId: string): Promise<MiniroomData | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from("user_minirooms")
    .select("user_id, selections")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[user-sync] miniroom fetch failed:", error.message, error.code);
    return null;
  }
  if (!data) return null;

  return parseMiniroomRow(data as MiniroomRow);
}

export async function upsertUserMiniroom(userId: string, data: MiniroomData): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error } = await supabase.from("user_minirooms").upsert(
    {
      user_id: userId,
      selections: data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[user-sync] miniroom upsert failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export type StoredUserInventory = {
  items: HandMadeItem[];
  ownedListingIds: string[];
  coins: number;
  updatedAt?: string;
};

type InventoryRow = {
  user_id: string;
  items: StoredUserInventory["items"] | null;
  owned_listing_ids: string[] | null;
  coins: number | null;
  updated_at: string | null;
};

export async function fetchUserInventories(userIds: string[]): Promise<Map<string, HandMadeItem[]>> {
  const result = new Map<string, HandMadeItem[]>();
  if (!isSupabaseConfigured() || userIds.length === 0) return result;

  const { data, error } = await supabase
    .from("user_inventory")
    .select("user_id, items")
    .in("user_id", userIds);

  if (error) {
    console.error("[user-sync] inventories fetch failed:", error.message, error.code);
    return result;
  }
  if (!data) return result;

  for (const row of data as { user_id: string; items: HandMadeItem[] | null }[]) {
    result.set(row.user_id, Array.isArray(row.items) ? row.items : []);
  }
  return result;
}

export async function fetchUserInventory(userId: string): Promise<StoredUserInventory | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from("user_inventory")
    .select("user_id, items, owned_listing_ids, coins, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[user-sync] inventory fetch failed:", error.message, error.code);
    return null;
  }
  if (!data) return null;

  const row = data as InventoryRow;
  return {
    items: Array.isArray(row.items) ? row.items : [],
    ownedListingIds: Array.isArray(row.owned_listing_ids) ? row.owned_listing_ids : [],
    coins: typeof row.coins === "number" && row.coins >= 0 ? Math.floor(row.coins) : 500,
    updatedAt: row.updated_at ?? undefined,
  };
}

export async function upsertUserInventory(
  userId: string,
  inventory: StoredUserInventory,
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error } = await supabase.from("user_inventory").upsert(
    {
      user_id: userId,
      items: inventory.items,
      owned_listing_ids: inventory.ownedListingIds,
      coins: inventory.coins,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[user-sync] inventory upsert failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}
