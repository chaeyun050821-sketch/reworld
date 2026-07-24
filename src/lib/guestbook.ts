import { mapSupabaseError } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

export type GuestbookEntryRecord = {
  id: string;
  ownerId: string;
  authorId: string | null;
  authorName: string;
  message: string;
  color: string;
  createdAt: string;
};

const GUESTBOOK_COLORS = ["#ff80c8", "#c8a0ff", "#80c8ff", "#80e0b0", "#ffe080", "#ffa880"];

function formatGuestbookDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

function mapRow(row: {
  id: string;
  owner_id: string;
  author_id: string | null;
  author_name: string;
  message: string;
  color: string;
  created_at: string;
}): GuestbookEntryRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    authorId: row.author_id,
    authorName: row.author_name,
    message: row.message,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function guestbookDateLabel(iso: string): string {
  return formatGuestbookDate(iso);
}

export async function loadGuestbookEntries(ownerId: string): Promise<GuestbookEntryRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from("guestbook_entries")
    .select("id, owner_id, author_id, author_name, message, color, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("[guestbook] load failed:", error?.message, error?.code);
    return [];
  }

  return data.map(mapRow);
}

export async function addGuestbookEntry(params: {
  ownerId: string;
  authorId: string;
  authorName: string;
  message: string;
  colorIndex?: number;
}): Promise<{ ok: true; entry: GuestbookEntryRecord } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const trimmedMsg = params.message.trim();
  const trimmedName = params.authorName.trim();
  if (!trimmedMsg) return { ok: false, error: "메시지를 입력해 주세요." };
  if (!trimmedName) return { ok: false, error: "닉네임이 필요해요." };
  if (params.ownerId === params.authorId) {
    return { ok: false, error: "내 방명록에는 직접 쓸 수 없어요." };
  }

  const color = GUESTBOOK_COLORS[(params.colorIndex ?? Date.now()) % GUESTBOOK_COLORS.length];

  const { data, error } = await supabase
    .from("guestbook_entries")
    .insert({
      owner_id: params.ownerId,
      author_id: params.authorId,
      author_name: trimmedName,
      message: trimmedMsg,
      color,
    })
    .select("id, owner_id, author_id, author_name, message, color, created_at")
    .single();

  if (error || !data) {
    const msg = error?.message ?? "방명록 등록에 실패했어요.";
    console.error("[guestbook] insert failed:", msg, error?.code);
    return { ok: false, error: mapSupabaseError(msg, error?.code) };
  }

  return { ok: true, entry: mapRow(data) };
}

export async function deleteGuestbookEntry(entryId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { error } = await supabase.from("guestbook_entries").delete().eq("id", entryId);
  if (error) {
    console.error("[guestbook] delete failed:", error.message, error.code);
    return false;
  }
  return true;
}

export function subscribeGuestbook(ownerId: string, onChange: () => void): () => void {
  if (!isSupabaseConfigured()) return () => {};

  const channel = supabase
    .channel(`guestbook:${ownerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "guestbook_entries",
        filter: `owner_id=eq.${ownerId}`,
      },
      () => onChange(),
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[guestbook] realtime unavailable, use polling fallback");
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Realtime 실패 시 폴백용 주기 새로고침 */
export function startGuestbookPolling(ownerId: string, onChange: () => void, intervalMs = 8000): () => void {
  const timer = window.setInterval(() => {
    void onChange();
  }, intervalMs);
  return () => window.clearInterval(timer);
}
