import { isSupabaseConfigured, supabase } from "./supabase";

export type StoredFriend = {
  friendUserId: string;
  nickname: string;
  addedAt: string;
};

export type FriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  nickname: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
};

export type FriendActionResult =
  | { ok: true; friend: StoredFriend }
  | { ok: false; error: string };

export type FriendRequestSendResult =
  | { ok: true; requestId: string; nickname: string }
  | { ok: false; error: string };

function normalizeNickname(value: string): string {
  return value.normalize("NFC").trim();
}

function mapFriendError(message: string, code?: string): string {
  if (code === "23505") return "이미 처리된 요청이거나 친구예요.";
  const lower = message.toLowerCase();
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "이미 처리된 요청이거나 친구예요.";
  }
  if (lower.includes("permission") || lower.includes("policy") || code === "42501") {
    return "Supabase 권한(RLS) 설정이 필요해요. friend-requests.sql을 실행해 주세요.";
  }
  if (lower.includes("function") && lower.includes("does not exist")) {
    return "friend-requests.sql을 Supabase에서 실행해 주세요.";
  }
  return message;
}

export async function loadFriends(userId: string): Promise<StoredFriend[]> {
  if (!isSupabaseConfigured()) return [];

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("friend_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rows?.length) return [];

  const friendIds = rows.map((row) => row.friend_id as string);
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", friendIds);

  if (profileError || !profiles) return [];

  const profileMap = new Map(profiles.map((profile) => [profile.id as string, profile]));

  return rows
    .map((row) => {
      const profile = profileMap.get(row.friend_id as string);
      if (!profile?.nickname) return null;
      return {
        friendUserId: profile.id as string,
        nickname: (profile.nickname as string).trim(),
        addedAt: row.created_at as string,
      };
    })
    .filter((item): item is StoredFriend => item !== null);
}

export async function loadFriendRequests(userId: string): Promise<{
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const empty = { incoming: [] as FriendRequest[], outgoing: [] as FriendRequest[] };
  if (!isSupabaseConfigured()) return empty;

  const { data: rows, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("status", "pending")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !rows?.length) {
    if (error) console.error("[friends] load requests failed:", error.message, error.code);
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

  const incoming: FriendRequest[] = [];
  const outgoing: FriendRequest[] = [];

  for (const row of rows) {
    const fromId = row.from_user_id as string;
    const toId = row.to_user_id as string;
    const isIncoming = toId === userId;
    const otherId = isIncoming ? fromId : toId;
    const nickname = nickMap.get(otherId) ?? "알 수 없음";
    const item: FriendRequest = {
      id: row.id as string,
      fromUserId: fromId,
      toUserId: toId,
      nickname,
      createdAt: row.created_at as string,
      direction: isIncoming ? "incoming" : "outgoing",
    };
    if (isIncoming) incoming.push(item);
    else outgoing.push(item);
  }

  return { incoming, outgoing };
}

export async function sendFriendRequest(
  _userId: string,
  nickname: string,
): Promise<FriendRequestSendResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const trimmed = normalizeNickname(nickname);
  if (!trimmed) return { ok: false, error: "닉네임을 입력해 주세요." };
  if (trimmed.length < 2 || trimmed.length > 12) {
    return { ok: false, error: "닉네임은 2~12자로 입력해 주세요." };
  }

  const { data, error } = await supabase.rpc("send_friend_request", {
    target_nickname: trimmed,
  });

  if (error) {
    return { ok: false, error: mapFriendError(error.message, error.code) };
  }

  const payload = data as { ok?: boolean; error?: string; request_id?: string; nickname?: string };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "친구 신청에 실패했어요." };
  }

  return {
    ok: true,
    requestId: payload.request_id ?? "",
    nickname: payload.nickname ?? trimmed,
  };
}

export async function acceptFriendRequest(requestId: string): Promise<FriendActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { data, error } = await supabase.rpc("accept_friend_request", {
    request_id: requestId,
  });

  if (error) {
    return { ok: false, error: mapFriendError(error.message, error.code) };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    friend_user_id?: string;
    nickname?: string;
    added_at?: string;
  };

  if (!payload?.ok || !payload.friend_user_id) {
    return { ok: false, error: payload?.error ?? "수락에 실패했어요." };
  }

  return {
    ok: true,
    friend: {
      friendUserId: payload.friend_user_id,
      nickname: (payload.nickname ?? "").trim() || "친구",
      addedAt: payload.added_at ?? new Date().toISOString(),
    },
  };
}

export async function rejectFriendRequest(requestId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { data, error } = await supabase.rpc("reject_friend_request", {
    request_id: requestId,
  });

  if (error) {
    return { ok: false, error: mapFriendError(error.message, error.code) };
  }

  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "거절에 실패했어요." };
  }
  return { ok: true };
}

export async function removeFriend(userId: string, friendUserId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data, error } = await supabase.rpc("remove_friendship", {
    target_friend_id: friendUserId,
  });

  if (!error) {
    const payload = data as { ok?: boolean };
    if (payload?.ok) return true;
  }

  // fallback: one-way delete if RPC missing
  const { error: delError } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendUserId);

  return !delError;
}

/** @deprecated Use sendFriendRequest — kept for any leftover callers */
export async function addFriendByNickname(
  userId: string,
  nickname: string,
): Promise<FriendActionResult> {
  const sent = await sendFriendRequest(userId, nickname);
  if (!sent.ok) return { ok: false, error: sent.error };
  return {
    ok: false,
    error: `${sent.nickname}님에게 친구 신청을 보냈어요. 상대가 수락하면 친구가 돼요.`,
  };
}
