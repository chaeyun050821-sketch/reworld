import { isSupabaseConfigured, supabase } from "./supabase";

const ONLINE_WINDOW_MS = 90_000;
const HEARTBEAT_MS = 30_000;

/** Keep last_seen_at fresh while the app tab is open and visible. */
export function startPresenceHeartbeat(userId: string): () => void {
  if (!isSupabaseConfigured() || !userId) return () => {};

  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const { error } = await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      console.error("[presence] heartbeat failed:", error.message);
    }
  };

  void tick();
  const intervalId = window.setInterval(() => void tick(), HEARTBEAT_MS);

  const onVisibility = () => {
    if (document.visibilityState === "visible") void tick();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function isRecentlyOnline(lastSeenAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= ONLINE_WINDOW_MS;
}

export async function fetchOnlineUserIds(userIds: string[]): Promise<Set<string>> {
  const online = new Set<string>();
  if (!isSupabaseConfigured() || userIds.length === 0) return online;

  const threshold = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, last_seen_at")
    .in("id", userIds)
    .gte("last_seen_at", threshold);

  if (error) {
    console.error("[presence] fetch online failed:", error.message);
    return online;
  }

  for (const row of data ?? []) {
    if (row.id) online.add(row.id as string);
  }
  return online;
}
