import { mapSupabaseError } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";
import { validateBoardContent } from "./content-moderation";

export type BoardCommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
};

export type BoardPostRecord = {
  id: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  comments: BoardCommentRecord[];
};

type BoardPostRow = {
  id: string;
  author_id: string;
  author_nickname: string;
  content: string;
  created_at: string;
};

type BoardLikeRow = {
  post_id: string;
  user_id: string;
};

type BoardCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  author_nickname: string;
  content: string;
  created_at: string;
};

/** KST 날짜·시간 (예: 2026.07.15 23:45) */
export function formatBoardDateTime(iso: string): string {
  const created = new Date(iso);
  if (Number.isNaN(created.getTime())) return iso;

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(created);

  const time = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(created);

  return `${date.replace(/-/g, ".")} ${time}`;
}

/** @deprecated 상대 시간 — formatBoardDateTime 사용 권장 */
export function formatBoardTime(iso: string): string {
  return formatBoardDateTime(iso);
}

function mapCommentRow(row: BoardCommentRow): BoardCommentRecord {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorNickname: row.author_nickname,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function fetchCommentsForPosts(postIds: string[]): Promise<Map<string, BoardCommentRecord[]>> {
  const grouped = new Map<string, BoardCommentRecord[]>();
  if (!postIds.length || !isSupabaseConfigured()) return grouped;

  const { data, error } = await supabase
    .from("board_comments")
    .select("id, post_id, author_id, author_nickname, content, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code !== "PGRST204" && !error.message.toLowerCase().includes("board_comments")) {
      console.error("[board] comments fetch failed:", error.message, error.code);
    }
    return grouped;
  }

  for (const row of (data ?? []) as BoardCommentRow[]) {
    const comment = mapCommentRow(row);
    const list = grouped.get(comment.postId) ?? [];
    list.push(comment);
    grouped.set(comment.postId, list);
  }

  return grouped;
}

function mapPostsWithLikes(
  posts: BoardPostRow[],
  likes: BoardLikeRow[],
  commentsByPost: Map<string, BoardCommentRecord[]>,
  currentUserId: string,
): BoardPostRecord[] {
  const likeCountByPost = new Map<string, number>();
  const likedByMe = new Set<string>();

  for (const like of likes) {
    likeCountByPost.set(like.post_id, (likeCountByPost.get(like.post_id) ?? 0) + 1);
    if (like.user_id === currentUserId) likedByMe.add(like.post_id);
  }

  return posts.map((post) => ({
    id: post.id,
    authorId: post.author_id,
    authorNickname: post.author_nickname,
    content: post.content,
    createdAt: post.created_at,
    likeCount: likeCountByPost.get(post.id) ?? 0,
    likedByMe: likedByMe.has(post.id),
    comments: commentsByPost.get(post.id) ?? [],
  }));
}

export async function fetchBoardPosts(
  currentUserId: string,
  limit = 30,
): Promise<BoardPostRecord[]> {
  if (!isSupabaseConfigured()) return [];

  const { data: posts, error } = await supabase
    .from("board_posts")
    .select("id, author_id, author_nickname, content, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[board] fetch failed:", error.message, error.code);
    return [];
  }
  if (!posts?.length) return [];

  const postIds = posts.map((post) => post.id);
  const [likes, commentsByPost] = await Promise.all([
    supabase.from("board_likes").select("post_id, user_id").in("post_id", postIds),
    fetchCommentsForPosts(postIds),
  ]);

  if (likes.error) {
    console.error("[board] likes fetch failed:", likes.error.message, likes.error.code);
  }

  return mapPostsWithLikes(
    posts as BoardPostRow[],
    (likes.data ?? []) as BoardLikeRow[],
    commentsByPost,
    currentUserId,
  );
}

export async function createBoardPost(
  authorId: string,
  authorNickname: string,
  content: string,
): Promise<{ ok: true; post: BoardPostRecord } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const trimmed = content.trim();
  const validation = validateBoardContent(trimmed);
  if (!validation.ok) return { ok: false, error: validation.error };

  const { data, error } = await supabase
    .from("board_posts")
    .insert({
      author_id: authorId,
      author_nickname: authorNickname.trim(),
      content: trimmed,
    })
    .select("id, author_id, author_nickname, content, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST204" || error?.message?.toLowerCase().includes("board_posts")) {
      return { ok: false, error: "게시판 테이블이 없어요. Supabase에서 visitors-board.sql을 실행해 주세요." };
    }
    return { ok: false, error: mapSupabaseError(error?.message ?? "등록에 실패했어요.", error?.code) };
  }

  const row = data as BoardPostRow;
  return {
    ok: true,
    post: {
      id: row.id,
      authorId: row.author_id,
      authorNickname: row.author_nickname,
      content: row.content,
      createdAt: row.created_at,
      likeCount: 0,
      likedByMe: false,
      comments: [],
    },
  };
}

export async function createBoardComment(
  postId: string,
  authorId: string,
  authorNickname: string,
  content: string,
): Promise<{ ok: true; comment: BoardCommentRecord } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const trimmed = content.trim();
  const validation = validateBoardContent(trimmed);
  if (!validation.ok) return { ok: false, error: validation.error };
  if (trimmed.length > 300) return { ok: false, error: "댓글은 300자 이내로 작성해 주세요." };

  const { data, error } = await supabase
    .from("board_comments")
    .insert({
      post_id: postId,
      author_id: authorId,
      author_nickname: authorNickname.trim(),
      content: trimmed,
    })
    .select("id, post_id, author_id, author_nickname, content, created_at")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST204" || error?.message?.toLowerCase().includes("board_comments")) {
      return { ok: false, error: "댓글 테이블이 없어요. Supabase에서 board-comments.sql을 실행해 주세요." };
    }
    return { ok: false, error: mapSupabaseError(error?.message ?? "댓글 등록에 실패했어요.", error?.code) };
  }

  return { ok: true, comment: mapCommentRow(data as BoardCommentRow) };
}

export async function deleteBoardPost(
  userId: string,
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const { error, count } = await supabase
    .from("board_posts")
    .delete({ count: "exact" })
    .eq("id", postId)
    .eq("author_id", userId);

  if (error) {
    if (error.code === "42501" || error.message.toLowerCase().includes("policy")) {
      return { ok: false, error: "글 삭제 권한이 없어요. Supabase에서 board-post-delete.sql을 실행해 주세요." };
    }
    return { ok: false, error: mapSupabaseError(error.message, error.code) };
  }

  if ((count ?? 0) === 0) {
    return { ok: false, error: "삭제할 글을 찾지 못했어요." };
  }

  return { ok: true };
}

export async function toggleBoardLike(
  userId: string,
  postId: string,
  currentlyLiked: boolean,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  if (currentlyLiked) {
    const { error } = await supabase
      .from("board_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) return { ok: false, error: mapSupabaseError(error.message, error.code) };
    return { ok: true, liked: false };
  }

  const { error } = await supabase.from("board_likes").insert({
    post_id: postId,
    user_id: userId,
  });
  if (error) return { ok: false, error: mapSupabaseError(error.message, error.code) };
  return { ok: true, liked: true };
}
