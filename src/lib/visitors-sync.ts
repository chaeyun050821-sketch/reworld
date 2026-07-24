import type { VisitorStats } from "./visitors";
import { getVisitorStats, saveVisitorStats } from "./visitors";
import { isSupabaseConfigured, supabase } from "./supabase";

/** KST 기준 YYYY-MM-DD */
export function kstDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

type VisitorStatsListener = () => void;
const statsListeners = new Map<string, Set<VisitorStatsListener>>();

export function subscribeVisitorStats(hostId: string, listener: VisitorStatsListener): () => void {
  if (!hostId) return () => {};
  const bucket = statsListeners.get(hostId) ?? new Set<VisitorStatsListener>();
  bucket.add(listener);
  statsListeners.set(hostId, bucket);
  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) statsListeners.delete(hostId);
  };
}

function notifyVisitorStats(hostId: string) {
  statsListeners.get(hostId)?.forEach((listener) => listener());
}

async function insertDiaryVisit(hostId: string, visitorId: string): Promise<boolean> {
  const { error: insertError } = await supabase.from("diary_visits").insert({
    host_id: hostId,
    visitor_id: visitorId,
    visit_date: kstDateKey(),
  });
  if (!insertError) return true;
  console.error("[visitors] insert failed:", insertError.message, insertError.code);
  return false;
}

export async function recordDiaryVisit(hostId: string, visitorId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  if (!hostId || !visitorId || hostId === visitorId) return false;

  const { error } = await supabase.rpc("record_diary_visit", { p_host_id: hostId });

  if (!error) {
    notifyVisitorStats(hostId);
    return true;
  }

  if (error.code === "PGRST202" || error.message.includes("record_diary_visit")) {
    const recorded = await insertDiaryVisit(hostId, visitorId);
    if (recorded) notifyVisitorStats(hostId);
    return recorded;
  }

  console.error("[visitors] record failed:", error.message, error.code);
  const recorded = await insertDiaryVisit(hostId, visitorId);
  if (recorded) notifyVisitorStats(hostId);
  return recorded;
}

export async function fetchVisitorStatsRemote(hostId: string): Promise<VisitorStats | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase.rpc("get_visitor_stats", { p_host_id: hostId });

  if (!error && data && typeof data === "object") {
    const row = data as { today?: number; total?: number; dateKey?: string };
    return {
      today: Number(row.today ?? 0),
      total: Number(row.total ?? 0),
      dateKey: typeof row.dateKey === "string" ? row.dateKey : kstDateKey(),
    };
  }

  if (error) {
    const needsPatch =
      error.message.includes("not allowed") ||
      error.message.includes("get_visitor_stats");
    if (needsPatch) {
      console.warn(
        "[visitors] get_visitor_stats 권한 오류 — Supabase에서 visitors-public-stats.sql을 실행해 주세요.",
      );
    } else if (error.code !== "PGRST202") {
      console.error("[visitors] rpc fetch failed:", error.message, error.code);
    }
  }

  return null;
}

export async function refreshVisitorStats(hostId: string): Promise<VisitorStats | null> {
  const remote = await fetchVisitorStatsRemote(hostId);
  if (remote) {
    saveVisitorStats(hostId, remote);
    notifyVisitorStats(hostId);
    return remote;
  }
  return getVisitorStats(hostId);
}

export type RecordVisitResult =
  | { ok: true; recorded: boolean }
  | { ok: false; error: string };

export async function recordDiaryVisitDetailed(
  hostId: string,
  visitorId: string,
): Promise<RecordVisitResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }
  if (hostId === visitorId) {
    return { ok: true, recorded: false };
  }

  const recorded = await recordDiaryVisit(hostId, visitorId);
  if (recorded) {
    await refreshVisitorStats(hostId);
  }
  return { ok: true, recorded };
}
