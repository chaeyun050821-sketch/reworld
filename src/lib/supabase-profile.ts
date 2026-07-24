import type { ProfileField, UserProfile } from "./profile";
import { defaultProfile, withProfileTimestamp } from "./profile";
import { isDiaryThemeId, type DiaryThemeId } from "./diary-theme";
import { mapSupabaseError, type SyncResult } from "./supabase-errors";
import { isSupabaseConfigured, supabase } from "./supabase";

type ProfileDetailsRow = {
  id: string;
  nickname: string | null;
  status: string | null;
  tags: string[] | null;
  fields: ProfileField[] | null;
  bgm_title: string | null;
  bgm_preview_url: string | null;
  diary_theme_id: string | null;
  updated_at: string | null;
};

export type FetchedProfileDetails = {
  profile: UserProfile;
  updatedAt: string | null;
  /** status/tags/fields/BGM 중 하나라도 저장된 적 있음 */
  hasDetails: boolean;
};

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.trim())
    .slice(0, 5);
}

function normalizeFields(fields: unknown): ProfileField[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => {
      if (!field || typeof field !== "object") return null;
      const row = field as Partial<ProfileField>;
      if (typeof row.label !== "string" || typeof row.value !== "string") return null;
      if (row.label === "닉네임") return null;
      return { label: row.label, value: row.value };
    })
    .filter((field): field is ProfileField => !!field);
}

function rowHasDetails(row: ProfileDetailsRow): boolean {
  return (
    (typeof row.status === "string" && row.status.trim().length > 0) ||
    (Array.isArray(row.tags) && row.tags.length > 0) ||
    (Array.isArray(row.fields) && row.fields.length > 0) ||
    (typeof row.bgm_title === "string" && row.bgm_title.trim().length > 0) ||
    (typeof row.bgm_preview_url === "string" && row.bgm_preview_url.trim().length > 0) ||
    (typeof row.diary_theme_id === "string" && row.diary_theme_id.trim().length > 0)
  );
}

function themeFromRow(row: ProfileDetailsRow): DiaryThemeId | undefined {
  return isDiaryThemeId(row.diary_theme_id) ? row.diary_theme_id : undefined;
}

function bgmFromRow(row: ProfileDetailsRow, nicknameFallback: string) {
  const base = defaultProfile(nicknameFallback);
  const title =
    typeof row.bgm_title === "string" && row.bgm_title.trim()
      ? row.bgm_title.trim()
      : base.bgmTitle;
  const previewUrl =
    typeof row.bgm_preview_url === "string" && row.bgm_preview_url.trim()
      ? row.bgm_preview_url.trim()
      : undefined;
  return { bgmTitle: title, bgmPreviewUrl: previewUrl };
}

export function rowToUserProfile(row: ProfileDetailsRow, nicknameFallback: string): UserProfile {
  const base = defaultProfile(row.nickname?.trim() || nicknameFallback);
  const fields = normalizeFields(row.fields);
  const tags = normalizeTags(row.tags);

  return withProfileTimestamp(
    {
      fields: fields.length > 0 ? fields : base.fields,
      status: typeof row.status === "string" && row.status.trim() ? row.status : base.status,
      tags: tags.length > 0 ? tags : [],
      bgmTitle: row.bgm_title ?? base.bgmTitle,
      bgmPreviewUrl: row.bgm_preview_url ?? undefined,
      diaryThemeId: themeFromRow(row),
    },
    row.updated_at ? new Date(row.updated_at) : new Date(0),
  );
}

export async function fetchUserProfileDetails(
  userId: string,
  nicknameFallback = "유저",
): Promise<FetchedProfileDetails | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, status, tags, fields, bgm_title, bgm_preview_url, diary_theme_id, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[profile] fetch failed:", error.message, error.code);
    return null;
  }
  if (!data) return null;

  const row = data as ProfileDetailsRow;
  const hasDetails = rowHasDetails(row);
  const bgm = bgmFromRow(row, nicknameFallback);
  const hasBgm = !!(bgm.bgmPreviewUrl || (typeof row.bgm_title === "string" && row.bgm_title.trim()));
  const hasTheme = !!themeFromRow(row);

  if (!hasDetails) {
    const base = defaultProfile(nicknameFallback);
    return {
      profile: withProfileTimestamp({
        ...base,
        bgmTitle: bgm.bgmTitle,
        bgmPreviewUrl: bgm.bgmPreviewUrl,
        diaryThemeId: themeFromRow(row),
      }),
      updatedAt: row.updated_at,
      hasDetails: hasBgm || hasTheme,
    };
  }

  return {
    profile: rowToUserProfile(row, nicknameFallback),
    updatedAt: row.updated_at,
    hasDetails: true,
  };
}

export async function upsertUserProfileDetails(
  userId: string,
  nickname: string,
  profile: UserProfile,
): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 연결이 필요해요." };
  }

  const trimmed = nickname.trim();
  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname: trimmed || nickname,
      status: profile.status,
      tags: profile.tags ?? [],
      fields: profile.fields ?? [],
      bgm_title: profile.bgmTitle ?? null,
      bgm_preview_url: profile.bgmPreviewUrl ?? null,
      diary_theme_id: profile.diaryThemeId ?? null,
      updated_at: profile.updatedAt ?? now,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[profile] upsert failed:", error.message, error.code);
    const mapped = mapSupabaseError(error.message, error.code);
    if (error.message.toLowerCase().includes("column") || error.code === "PGRST204") {
      return {
        ok: false,
        error: "프로필 컬럼이 없어요. Supabase에서 profile-details.sql을 실행해 주세요.",
      };
    }
    return { ok: false, error: mapped };
  }

  return { ok: true };
}

/** profiles 행이 없으면 친구 닉네임 검색이 실패합니다. 로그인/가입 시 반드시 동기화합니다. */
export async function ensureSupabaseProfile(userId: string, nickname: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length > 12) return;

  await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}
