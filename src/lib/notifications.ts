import { mapSupabaseError } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

export type NotificationType =
  | "friend_request"
  | "ilchon_request"
  | "photo_like"
  | "photo_comment"
  | "guestbook";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorNickname: string;
  actorId?: string;
  message: string;
  createdAt: string;
  requestId?: string;
  photoId?: string;
  content?: string;
};

const LOCAL_KEY = "reworld_notifications_v1";
const READ_KEY = "reworld_notification_read_v1";
const READ_IDS_KEY = "reworld_notification_read_ids_v1";

type StoredNotificationRow = AppNotification & { userId: string };

function loadLocal(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredNotificationRow[];
    return parsed
      .filter((row) => row.userId === userId)
      .map(({ userId: _uid, ...rest }) => rest)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

function saveLocal(userId: string, notifications: AppNotification[]) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredNotificationRow[]) : [];
    const others = parsed.filter((row) => row.userId !== userId);
    const mine = notifications.map((n) => ({ ...n, userId }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...others, ...mine]));
  } catch {
    /* ignore quota */
  }
}

function loadReadIds(userId: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return new Set(parsed[userId] ?? []);
  } catch {
    return new Set();
  }
}

function saveReadIds(userId: string, ids: Set<string>) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    parsed[userId] = [...ids].slice(-200);
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore quota */
  }
}

function saveLastReadAtLocal(userId: string, iso: string) {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(READ_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[userId] = iso;
    localStorage.setItem(READ_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore quota */
  }
}

function mergeReadTimestamps(a: string | null | undefined, b: string | null | undefined): string | null {
  const times = [a, b]
    .map((value) => (value ? new Date(value).getTime() : NaN))
    .filter((time) => !Number.isNaN(time));
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

function computeReadTimestamp(notifications: AppNotification[]): number {
  const nowMs = Date.now();
  const latestMs = notifications.reduce((max, notification) => {
    const createdMs = new Date(notification.createdAt).getTime();
    return Number.isNaN(createdMs) ? max : Math.max(max, createdMs);
  }, 0);
  return Math.max(nowMs, latestMs);
}

function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "friend_request":
      return "♡";
    case "ilchon_request":
      return "💞";
    case "photo_like":
      return "♥";
    case "photo_comment":
      return "💬";
    case "guestbook":
      return "📝";
  }
}

export function getNotificationIcon(type: NotificationType): string {
  return notificationIcon(type);
}

export function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

type NotificationRow = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_nickname: string;
  message: string;
  content: string | null;
  request_id: string | null;
  photo_id: string | null;
  created_at: string;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    actorNickname: row.actor_nickname,
    actorId: row.actor_id ?? undefined,
    message: row.message,
    createdAt: row.created_at,
    requestId: row.request_id ?? undefined,
    photoId: row.photo_id ?? undefined,
    content: row.content ?? undefined,
  };
}

let syncPromise: Promise<void> | null = null;

async function syncNotificationsOnce(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.rpc("sync_user_notifications");
  if (error && !error.message.toLowerCase().includes("does not exist")) {
    console.error("[notifications] sync failed:", error.message);
  }
}

async function ensureSynced(): Promise<void> {
  if (!syncPromise) {
    syncPromise = syncNotificationsOnce().finally(() => {
      syncPromise = null;
    });
  }
  await syncPromise;
}

async function persistNotificationLastReadAt(userId: string, iso: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ notification_last_read_at: iso })
    .eq("id", userId);

  if (
    error &&
    (error.code === "PGRST204" ||
      error.message.toLowerCase().includes("notification_last_read_at") ||
      error.message.toLowerCase().includes("column"))
  ) {
    console.warn("[notifications] notification_last_read_at column missing — run notification-read.sql");
    return;
  }

  if (error) {
    console.error("[notifications] save read state failed:", error.message);
  }
}

export async function loadNotifications(userId: string): Promise<AppNotification[]> {
  if (!userId) return [];

  if (!isSupabaseConfigured()) {
    return loadLocal(userId);
  }

  await ensureSynced();

  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, actor_id, actor_nickname, message, content, request_id, photo_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (
      error.code === "PGRST204" ||
      error.message.toLowerCase().includes("user_notifications") ||
      error.message.toLowerCase().includes("does not exist")
    ) {
      console.warn("[notifications] table missing — run notifications.sql");
      return loadLocal(userId);
    }
    console.error("[notifications] load failed:", error.message);
    return loadLocal(userId);
  }

  const notifications = (data as NotificationRow[]).map(mapRow);
  saveLocal(userId, notifications);
  return notifications;
}

export async function deleteNotification(
  notificationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }

  const { error } = await supabase.from("user_notifications").delete().eq("id", notificationId);
  if (error) {
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export function subscribeNotifications(
  userId: string,
  onChange: () => void,
): () => void {
  if (!isSupabaseConfigured() || !userId) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function getLastReadAt(userId: string): string | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[userId] ?? null;
  } catch {
    return null;
  }
}

export async function fetchNotificationLastReadAt(userId: string): Promise<string | null> {
  const local = getLastReadAt(userId);
  if (!userId || !isSupabaseConfigured()) return local;

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_last_read_at")
    .eq("id", userId)
    .maybeSingle();

  if (
    error &&
    (error.code === "PGRST204" ||
      error.message.toLowerCase().includes("notification_last_read_at") ||
      error.message.toLowerCase().includes("column"))
  ) {
    return local;
  }

  if (error) {
    console.error("[notifications] fetch read state failed:", error.message);
    return local;
  }

  const remote =
    data && typeof data.notification_last_read_at === "string"
      ? data.notification_last_read_at
      : null;
  const merged = mergeReadTimestamps(local, remote);
  if (merged && merged !== local) {
    saveLastReadAtLocal(userId, merged);
  }
  return merged ?? local;
}

export function markNotificationsRead(
  userId: string,
  notifications: AppNotification[] = [],
): string {
  const readMs = computeReadTimestamp(notifications);
  const now = new Date(readMs).toISOString();
  if (!userId) return now;

  const previous = getLastReadAt(userId);
  const merged = mergeReadTimestamps(previous, now) ?? now;
  saveLastReadAtLocal(userId, merged);

  if (notifications.length > 0) {
    const readIds = loadReadIds(userId);
    notifications.forEach((notification) => readIds.add(notification.id));
    saveReadIds(userId, readIds);
  }

  void persistNotificationLastReadAt(userId, merged);
  return merged;
}

export function countUnreadNotifications(
  notifications: AppNotification[],
  userId: string,
  lastReadAt?: string | null,
): number {
  const readIds = loadReadIds(userId);
  const readAt = lastReadAt ?? getLastReadAt(userId);
  const readTime = readAt ? new Date(readAt).getTime() : NaN;
  const hasValidReadTime = !Number.isNaN(readTime);

  return notifications.filter((notification) => {
    if (readIds.has(notification.id)) return false;
    if (!hasValidReadTime) return true;
    const createdMs = new Date(notification.createdAt).getTime();
    if (Number.isNaN(createdMs)) return false;
    return createdMs > readTime;
  }).length;
}

export async function saveLocalNotification(
  userId: string,
  notification: Omit<AppNotification, "id"> & { id?: string },
): Promise<AppNotification> {
  const item: AppNotification = {
    ...notification,
    id: notification.id ?? crypto.randomUUID(),
  };
  const current = loadLocal(userId);
  const next = [item, ...current.filter((n) => n.id !== item.id)].slice(0, 50);
  saveLocal(userId, next);
  return item;
}
