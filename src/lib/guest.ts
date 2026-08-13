import { isSupabaseConfigured } from "./supabase";

export const GUEST_ID_PREFIX = "guest-";
export const GUEST_SESSION_KEY = "reworld_guest_session";

const GLOBAL_ARRAY_KEYS = ["reworld_notifications_v1", "reworld_marketplace_listings_v2"] as const;
const GLOBAL_RECORD_KEYS = [
  "reworld_notification_read_v1",
  "reworld_notification_read_ids_v1",
] as const;

export function isGuestUserId(userId?: string | null): boolean {
  return typeof userId === "string" && userId.startsWith(GUEST_ID_PREFIX);
}

export function isLocalOnlyUserId(userId?: string | null): boolean {
  return !userId || isGuestUserId(userId) || userId.startsWith("demo-");
}

export function canUseRemoteAccount(userId?: string | null): boolean {
  return isSupabaseConfigured() && !!userId && !isLocalOnlyUserId(userId);
}

function stripUserFromJsonArray(key: string, userId: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((row) => {
      if (!row || typeof row !== "object") return true;
      const record = row as Record<string, unknown>;
      return record.userId !== userId && record.sellerId !== userId && record.seller_id !== userId;
    });
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function stripUserFromRecord(key: string, userId: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    const record = parsed as Record<string, unknown>;
    if (!(userId in record)) return;
    delete record[userId];
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    /* ignore */
  }
}

function stripGuestFromPhotoSocial(userId: string) {
  try {
    const raw = localStorage.getItem("reworld_photo_social_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      likes?: Record<string, string[]>;
      comments?: Record<string, { authorId?: string }[]>;
      reactions?: Record<string, { actorId?: string }[]>;
      views?: Record<string, number>;
    };
    const likes = parsed.likes ?? {};
    for (const photoId of Object.keys(likes)) {
      likes[photoId] = (likes[photoId] ?? []).filter((id) => id !== userId);
    }
    const comments = parsed.comments ?? {};
    for (const photoId of Object.keys(comments)) {
      comments[photoId] = (comments[photoId] ?? []).filter((row) => row.authorId !== userId);
    }
    const reactions = parsed.reactions ?? {};
    for (const photoId of Object.keys(reactions)) {
      reactions[photoId] = (reactions[photoId] ?? []).filter((row) => row.actorId !== userId);
    }
    localStorage.setItem(
      "reworld_photo_social_v1",
      JSON.stringify({ views: parsed.views ?? {}, likes, comments, reactions }),
    );
  } catch {
    /* ignore */
  }
}

/** Remove all locally stored guest progress so the next guest session starts fresh. */
export function wipeGuestLocalData(userId: string): void {
  if (!isGuestUserId(userId) || typeof window === "undefined") return;

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.includes(userId)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));

  for (const key of GLOBAL_ARRAY_KEYS) stripUserFromJsonArray(key, userId);
  for (const key of GLOBAL_RECORD_KEYS) stripUserFromRecord(key, userId);
  stripGuestFromPhotoSocial(userId);

  try {
    sessionStorage.removeItem("reworld_hand_tracking_user_id");
    sessionStorage.removeItem("reworld_hand_tracking_return");
    sessionStorage.removeItem("reworld_diary_restore");
  } catch {
    /* ignore */
  }
}
