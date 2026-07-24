import type { DiaryEntry, Privacy } from "../app/data";
import { mapSupabaseError, type SyncResult } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

type DiaryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  weather: string;
  privacy: Privacy;
  content: string;
  stickers: string[] | null;
  created_at: string;
};

function rowToEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    date: row.entry_date,
    weather: row.weather || "☀️",
    privacy: row.privacy === "private" ? "private" : "public",
    content: row.content,
    stickers: row.stickers ?? [],
  };
}

export async function fetchDiaryEntries(
  userId: string,
  options?: { publicOnly?: boolean },
): Promise<DiaryEntry[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from("diary_entries")
    .select("id, user_id, entry_date, weather, privacy, content, stickers, created_at")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.publicOnly) {
    query = query.eq("privacy", "public");
  }

  const { data, error } = await query;
  if (error) {
    console.error("[diary] fetch failed:", error.message, error.code);
    return [];
  }
  if (!data) return [];
  return (data as DiaryRow[]).map(rowToEntry);
}

export async function upsertDiaryEntry(userId: string, entry: DiaryEntry): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error } = await supabase.from("diary_entries").upsert(
    {
      id: entry.id,
      user_id: userId,
      entry_date: entry.date,
      weather: entry.weather,
      privacy: entry.privacy,
      content: entry.content,
      stickers: entry.stickers ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[diary] upsert failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}

export async function deleteDiaryEntry(userId: string, entryId: string): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error } = await supabase
    .from("diary_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);

  if (error) {
    console.error("[diary] delete failed:", error.message, error.code);
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true };
}
