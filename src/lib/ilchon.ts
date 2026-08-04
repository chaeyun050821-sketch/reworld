import { isSupabaseConfigured, supabase } from "./supabase";

export type StoredIlchon = {
  ilchonUserId: string;
  nickname: string;
  displayName: string;
  addedAt: string;
};

export type IlchonRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  nickname: string;
  requesterAlias?: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
};

export type IlchonActionResult =
  | { ok: true; nickname: string; ilchonUserId?: string }
  | { ok: false; error: string };

function mapIlchonError(message: string, code?: string): string {
  if (code === "23505") return "이미 처리된 신청이거나 일촌이에요.";
  const lower = message.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "이미 처리된 신청이거나 일촌이에요.";
  }
  if (lower.includes("permission") || lower.includes("policy") || code === "42501") {
    return "Supabase 권한(RLS) 설정이 필요해요. ilchon-wave.sql을 실행해 주세요.";
  }
  if (lower.includes("function") && lower.includes("does not exist")) {
    return "ilchon-wave.sql을 Supabase에서 실행해 주세요.";
  }
  return message;
}

/** 파도타기용 일촌 목록 (이웃과 별개) */
export async function loadIlchonList(ownerUserId: string): Promise<StoredIlchon[]> {
  if (!isSupabaseConfigured() || !ownerUserId) return [];

  const { data, error } = await supabase.rpc("get_ilchon_list", {
    owner_id: ownerUserId,
  });

  if (error) {
    console.error("[ilchon] loadIlchonList failed:", error.message, error.code);
    return [];
  }

  const payload = data as {
    ok?: boolean;
    ilchons?: Array<{ ilchon_user_id: string; nickname: string; display_name?: string; added_at: string }>;
    friends?: Array<{ friend_user_id: string; nickname: string; display_name?: string; added_at: string }>;
  };
  if (!payload?.ok) return [];

  const rows = payload.ilchons ?? payload.friends;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const id = "ilchon_user_id" in row ? row.ilchon_user_id : row.friend_user_id;
      return {
        ilchonUserId: id,
        nickname: row.nickname.trim(),
        displayName: row.display_name?.trim() || row.nickname.trim(),
        addedAt: row.added_at,
      };
    })
    .filter((item) => item.nickname.length > 0);
}

export async function loadIlchonRequests(userId: string): Promise<{
  incoming: IlchonRequest[];
  outgoing: IlchonRequest[];
}> {
  const empty = { incoming: [] as IlchonRequest[], outgoing: [] as IlchonRequest[] };
  if (!isSupabaseConfigured()) return empty;

  const { data: rows, error } = await supabase
    .from("ilchon_requests")
    .select("id, from_user_id, to_user_id, status, requester_alias, created_at")
    .eq("status", "pending")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !rows?.length) {
    if (error) console.error("[ilchon] load requests failed:", error.message, error.code);
    return empty;
  }

  const otherIds = Array.from(
    new Set(
      rows.map((row) =>
        (row.from_user_id as string) === userId
          ? (row.to_user_id as string)
          : (row.from_user_id as string),
      ),
    ),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", otherIds);

  const nickMap = new Map((profiles ?? []).map((p) => [p.id as string, (p.nickname as string).trim()]));

  const incoming: IlchonRequest[] = [];
  const outgoing: IlchonRequest[] = [];

  for (const row of rows) {
    const fromId = row.from_user_id as string;
    const toId = row.to_user_id as string;
    const isIncoming = toId === userId;
    const otherId = isIncoming ? fromId : toId;
    const item: IlchonRequest = {
      id: row.id as string,
      fromUserId: fromId,
      toUserId: toId,
      nickname: nickMap.get(otherId) ?? "알 수 없음",
      requesterAlias: typeof row.requester_alias === "string" ? row.requester_alias.trim() : undefined,
      createdAt: row.created_at as string,
      direction: isIncoming ? "incoming" : "outgoing",
    };
    if (isIncoming) incoming.push(item);
    else outgoing.push(item);
  }

  return { incoming, outgoing };
}

function normalizeDisplayName(value: string): string {
  return value.normalize("NFC").replace(/[\r\n\t]/g, " ").trim().replace(/\s+/g, " ");
}

function validateDisplayName(value: string): string | null {
  const normalized = normalizeDisplayName(value);
  if (!normalized) return "일촌명을 입력해 주세요.";
  if (Array.from(normalized).length > 12) return "일촌명은 12자 이하로 입력해 주세요.";
  return null;
}

export async function sendIlchonRequest(targetUserId: string, displayName: string): Promise<IlchonActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }
  if (!targetUserId) {
    return { ok: false, error: "일촌 신청 대상을 선택해 주세요." };
  }

  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) return { ok: false, error: displayNameError };

  const { data, error } = await supabase.rpc("send_ilchon_request", {
    target_user_id: targetUserId,
    target_display_name: normalizeDisplayName(displayName),
  });

  if (error) {
    return { ok: false, error: mapIlchonError(error.message, error.code) };
  }

  const payload = data as { ok?: boolean; error?: string; nickname?: string };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "일촌 신청에 실패했어요." };
  }

  return { ok: true, nickname: payload.nickname ?? "" };
}

export async function acceptIlchonRequest(requestId: string, displayName: string): Promise<IlchonActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) return { ok: false, error: displayNameError };

  const { data, error } = await supabase.rpc("accept_ilchon_request", {
    request_id: requestId,
    target_display_name: normalizeDisplayName(displayName),
  });

  if (error) {
    return { ok: false, error: mapIlchonError(error.message, error.code) };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    nickname?: string;
    ilchon_user_id?: string;
  };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "일촌 수락에 실패했어요." };
  }

  return {
    ok: true,
    nickname: payload.nickname ?? "",
    ilchonUserId: payload.ilchon_user_id,
  };
}

export async function updateIlchonDisplayName(
  targetUserId: string,
  displayName: string,
): Promise<{ ok: true; displayName: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase 연결이 필요해요." };
  const displayNameError = validateDisplayName(displayName);
  if (displayNameError) return { ok: false, error: displayNameError };
  const normalized = normalizeDisplayName(displayName);
  const { data, error } = await supabase.rpc("update_ilchon_display_name", {
    target_user_id: targetUserId,
    target_display_name: normalized,
  });
  if (error) return { ok: false, error: mapIlchonError(error.message, error.code) };
  const payload = data as { ok?: boolean; error?: string; display_name?: string };
  if (!payload?.ok) return { ok: false, error: payload?.error ?? "일촌명 변경에 실패했어요." };
  return { ok: true, displayName: payload.display_name ?? normalized };
}

export async function rejectIlchonRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data, error } = await supabase.rpc("reject_ilchon_request", {
    request_id: requestId,
  });

  if (error) {
    console.error("[ilchon] reject failed:", error.message, error.code);
    return false;
  }

  const payload = data as { ok?: boolean };
  return !!payload?.ok;
}
