import { validateBoardContent } from "./content-moderation";
import { mapSupabaseError } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

export type PhotoComment = {
  id: string;
  photoId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
};

export type PhotoReaction = {
  id: string;
  photoId: string;
  actorId: string;
  actorName: string;
  emoticonId: number;
  createdAt: string;
};

export type PhotoSocialBundle = {
  views: Record<string, number>;
  likeCounts: Record<string, number>;
  likedByMe: Record<string, boolean>;
  comments: Record<string, PhotoComment[]>;
  reactions: Record<string, PhotoReaction[]>;
};

const LOCAL_KEY = "reworld_photo_social_v1";

type LocalPhotoSocial = {
  views: Record<string, number>;
  likes: Record<string, string[]>;
  comments: Record<string, PhotoComment[]>;
  reactions: Record<string, PhotoReaction[]>;
};

function emptyLocal(): LocalPhotoSocial {
  return { views: {}, likes: {}, comments: {}, reactions: {} };
}

function loadLocal(): LocalPhotoSocial {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return emptyLocal();
    const parsed = JSON.parse(raw) as Partial<LocalPhotoSocial>;
    return {
      views: parsed.views ?? {},
      likes: parsed.likes ?? {},
      comments: parsed.comments ?? {},
      reactions: parsed.reactions ?? {},
    };
  } catch {
    return emptyLocal();
  }
}

function saveLocal(data: LocalPhotoSocial) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

function localToBundle(data: LocalPhotoSocial, viewerUserId: string, photoIds: string[]): PhotoSocialBundle {
  const views: Record<string, number> = {};
  const likeCounts: Record<string, number> = {};
  const likedByMe: Record<string, boolean> = {};
  const comments: Record<string, PhotoComment[]> = {};
  const reactions: Record<string, PhotoReaction[]> = {};

  for (const photoId of photoIds) {
    views[photoId] = data.views[photoId] ?? 0;
    const likers = data.likes[photoId] ?? [];
    likeCounts[photoId] = likers.length;
    likedByMe[photoId] = likers.includes(viewerUserId);
    comments[photoId] = [...(data.comments[photoId] ?? [])];
    reactions[photoId] = [...(data.reactions[photoId] ?? [])];
  }

  return { views, likeCounts, likedByMe, comments, reactions };
}

type PhotoViewRow = { id: string; view_count: number | null };
type PhotoLikeRow = { photo_id: string; user_id: string };
type PhotoCommentRow = {
  id: string;
  photo_id: string;
  author_id: string;
  author_nickname: string;
  content: string;
  created_at: string;
};
type PhotoReactionRow = {
  id: string;
  photo_id: string;
  actor_id: string;
  actor_name: string;
  emoticon_id: number;
  created_at: string;
};

function mapCommentRow(row: PhotoCommentRow): PhotoComment {
  return {
    id: row.id,
    photoId: row.photo_id,
    authorId: row.author_id,
    authorNickname: row.author_nickname,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapReactionRow(row: PhotoReactionRow): PhotoReaction {
  return {
    id: row.id,
    photoId: row.photo_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    emoticonId: row.emoticon_id,
    createdAt: row.created_at,
  };
}

export async function fetchPhotoSocialBundle(
  photoIds: string[],
  viewerUserId: string,
): Promise<PhotoSocialBundle> {
  if (photoIds.length === 0) {
    return { views: {}, likeCounts: {}, likedByMe: {}, comments: {}, reactions: {} };
  }

  if (!isSupabaseConfigured()) {
    return localToBundle(loadLocal(), viewerUserId, photoIds);
  }

  const views: Record<string, number> = {};
  const likeCounts: Record<string, number> = {};
  const likedByMe: Record<string, boolean> = {};
  const comments: Record<string, PhotoComment[]> = {};
  const reactions: Record<string, PhotoReaction[]> = {};

  for (const photoId of photoIds) {
    views[photoId] = 0;
    likeCounts[photoId] = 0;
    likedByMe[photoId] = false;
    comments[photoId] = [];
    reactions[photoId] = [];
  }

  const [viewRes, likeRes, commentRes, reactionRes] = await Promise.all([
    supabase.from("user_photos").select("id, view_count").in("id", photoIds),
    supabase.from("photo_likes").select("photo_id, user_id").in("photo_id", photoIds),
    supabase
      .from("photo_comments")
      .select("id, photo_id, author_id, author_nickname, content, created_at")
      .in("photo_id", photoIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("photo_reactions")
      .select("id, photo_id, actor_id, actor_name, emoticon_id, created_at")
      .in("photo_id", photoIds)
      .order("created_at", { ascending: true }),
  ]);

  if (!viewRes.error && viewRes.data) {
    for (const row of viewRes.data as PhotoViewRow[]) {
      views[row.id] = row.view_count ?? 0;
    }
  }

  if (!likeRes.error && likeRes.data) {
    for (const row of likeRes.data as PhotoLikeRow[]) {
      likeCounts[row.photo_id] = (likeCounts[row.photo_id] ?? 0) + 1;
      if (row.user_id === viewerUserId) likedByMe[row.photo_id] = true;
    }
  }

  if (!commentRes.error && commentRes.data) {
    for (const row of commentRes.data as PhotoCommentRow[]) {
      const comment = mapCommentRow(row);
      comments[row.photo_id] = [...(comments[row.photo_id] ?? []), comment];
    }
  }

  if (!reactionRes.error && reactionRes.data) {
    for (const row of reactionRes.data as PhotoReactionRow[]) {
      const reaction = mapReactionRow(row);
      reactions[row.photo_id] = [...(reactions[row.photo_id] ?? []), reaction];
    }
  }

  return { views, likeCounts, likedByMe, comments, reactions };
}

export async function incrementPhotoView(photoId: string): Promise<number | null> {
  if (!photoId) return null;

  if (!isSupabaseConfigured()) {
    const local = loadLocal();
    const next = (local.views[photoId] ?? 0) + 1;
    local.views[photoId] = next;
    saveLocal(local);
    return next;
  }

  const { data, error } = await supabase.rpc("increment_photo_view", { p_photo_id: photoId });
  if (error) {
    console.error("[photo-social] increment view failed:", error.message);
    const local = loadLocal();
    const next = (local.views[photoId] ?? 0) + 1;
    local.views[photoId] = next;
    saveLocal(local);
    return next;
  }
  return typeof data === "number" ? data : null;
}

export async function togglePhotoLike(
  photoId: string,
  userId: string,
  currentlyLiked: boolean,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    const local = loadLocal();
    const likers = new Set(local.likes[photoId] ?? []);
    if (currentlyLiked) likers.delete(userId);
    else likers.add(userId);
    local.likes[photoId] = Array.from(likers);
    saveLocal(local);
    return { ok: true, liked: !currentlyLiked };
  }

  if (currentlyLiked) {
    const { error } = await supabase.from("photo_likes").delete().eq("photo_id", photoId).eq("user_id", userId);
    if (error) return { ok: false, error: mapSupabaseError(error.message, error.code) };
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("photo_likes").insert({ photo_id: photoId, user_id: userId });
  if (error) {
    if (error.code === "23505") return { ok: true, liked: true };
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }
  return { ok: true, liked: true };
}

export async function createPhotoComment(
  photoId: string,
  authorId: string,
  authorNickname: string,
  content: string,
): Promise<{ ok: true; comment: PhotoComment } | { ok: false; error: string }> {
  const trimmed = content.trim();
  const validation = validateBoardContent(trimmed);
  if (!validation.ok) return { ok: false, error: validation.error };
  if (trimmed.length > 300) return { ok: false, error: "댓글은 300자 이내로 작성해 주세요." };

  if (!isSupabaseConfigured()) {
    const comment: PhotoComment = {
      id: crypto.randomUUID(),
      photoId,
      authorId,
      authorNickname: authorNickname.trim(),
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const local = loadLocal();
    local.comments[photoId] = [...(local.comments[photoId] ?? []), comment];
    saveLocal(local);
    return { ok: true, comment };
  }

  const { data, error } = await supabase
    .from("photo_comments")
    .insert({
      photo_id: photoId,
      author_id: authorId,
      author_nickname: authorNickname.trim(),
      content: trimmed,
    })
    .select("id, photo_id, author_id, author_nickname, content, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST204" || error?.message?.toLowerCase().includes("photo_comments")) {
      return { ok: false, error: "댓글 테이블이 없어요. Supabase에서 photo-social.sql을 실행해 주세요." };
    }
    return { ok: false, error: mapSupabaseError(error?.message ?? "댓글 등록에 실패했어요.", error?.code) };
  }

  return { ok: true, comment: mapCommentRow(data as PhotoCommentRow) };
}

export async function deletePhotoComment(
  userId: string,
  photoId: string,
  commentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    const local = loadLocal();
    local.comments[photoId] = (local.comments[photoId] ?? []).filter((c) => c.id !== commentId);
    saveLocal(local);
    return { ok: true };
  }

  const { error } = await supabase
    .from("photo_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", userId);

  if (error) return { ok: false, error: mapSupabaseError(error.message, error.code) };
  return { ok: true };
}

export async function addPhotoReaction(
  photoId: string,
  actorId: string,
  actorName: string,
  emoticonId: number,
): Promise<{ ok: true; reaction: PhotoReaction } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    const reaction: PhotoReaction = {
      id: crypto.randomUUID(),
      photoId,
      actorId,
      actorName,
      emoticonId,
      createdAt: new Date().toISOString(),
    };
    const local = loadLocal();
    local.reactions[photoId] = [...(local.reactions[photoId] ?? []), reaction];
    saveLocal(local);
    return { ok: true, reaction };
  }

  const { data, error } = await supabase
    .from("photo_reactions")
    .insert({
      photo_id: photoId,
      actor_id: actorId,
      actor_name: actorName.trim(),
      emoticon_id: emoticonId,
    })
    .select("id, photo_id, actor_id, actor_name, emoticon_id, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST204" || error?.message?.toLowerCase().includes("photo_reactions")) {
      return { ok: false, error: "공감 테이블이 없어요. Supabase에서 photo-social.sql을 실행해 주세요." };
    }
    return { ok: false, error: mapSupabaseError(error?.message ?? "공감 등록에 실패했어요.", error?.code) };
  }

  return { ok: true, reaction: mapReactionRow(data as PhotoReactionRow) };
}

export async function deletePhotoReaction(
  userId: string,
  photoId: string,
  reactionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    const local = loadLocal();
    local.reactions[photoId] = (local.reactions[photoId] ?? []).filter((r) => r.id !== reactionId);
    saveLocal(local);
    return { ok: true };
  }

  const { error } = await supabase
    .from("photo_reactions")
    .delete()
    .eq("id", reactionId)
    .eq("actor_id", userId);

  if (error) return { ok: false, error: mapSupabaseError(error.message, error.code) };
  return { ok: true };
}
