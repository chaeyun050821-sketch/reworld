import type { DiaryThemeId } from "./diary-theme";
import { isDiaryThemeId } from "./diary-theme";

export type ProfileField = { label: string; value: string };

export type UserProfile = {
  fields: ProfileField[];
  status: string;
  tags: string[];
  bgmTitle?: string;
  bgmPreviewUrl?: string;
  diaryThemeId?: DiaryThemeId;
  /** 로컬/원격 충돌 시 최신 저장 시각 (ISO) */
  updatedAt?: string;
};

const PROFILE_KEY_PREFIX = "reworld_profile_";

/** 프로필 필드 — 닉네임·이름은 계정/별도 UI와 분리 */
export function profileDetailFields(fields: ProfileField[]): ProfileField[] {
  return fields.filter((field) => field.label !== "닉네임" && field.label !== "이름");
}

export function defaultProfile(nickname: string): UserProfile {
  return {
    fields: [
      { label: "생일", value: "2000.00.00 🎂" },
      { label: "지역", value: "서울 ☁️" },
      { label: "관심사", value: "음악, 일러스트" },
    ],
    status: "일상 기록중 🌸",
    tags: ["#daily", "#y2k", "#diary"],
    bgmTitle: "♬ Lovefool - The Cardigans",
  };
}

export function profileTimestamp(profile: UserProfile): number {
  if (!profile.updatedAt) return 0;
  const parsed = Date.parse(profile.updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 저장 시각을 붙인 프로필 (로컬·원격 동기화용) */
export function withProfileTimestamp(profile: UserProfile, at = new Date()): UserProfile {
  return { ...profile, updatedAt: at.toISOString() };
}

/** preferred가 더 최신이거나 시각이 같으면 preferred 유지 */
export function mergeUserProfiles(preferred: UserProfile, other: UserProfile): UserProfile {
  const preferredTime = profileTimestamp(preferred);
  const otherTime = profileTimestamp(other);
  if (otherTime > preferredTime) return other;
  return preferred;
}

function cleanFields(raw: unknown): ProfileField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((field) => {
      if (!field || typeof field !== "object") return null;
      const row = field as Partial<ProfileField>;
      if (typeof row.label !== "string" || typeof row.value !== "string") return null;
      if (row.label === "닉네임" || row.label === "이름") return null;
      return { label: row.label, value: row.value };
    })
    .filter((field): field is ProfileField => !!field);
}

function cleanTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .slice(0, 5);
}

function normalizeStoredProfile(raw: unknown, nickname: string): UserProfile {
  const base = defaultProfile(nickname);
  if (!raw || typeof raw !== "object") return base;

  const parsed = raw as Partial<UserProfile>;
  const saved = typeof parsed.updatedAt === "string" && parsed.updatedAt.trim().length > 0;

  const cleanedFields = cleanFields(parsed.fields);
  const cleanedTags = cleanTags(parsed.tags);

  let fields = base.fields;
  if (Array.isArray(parsed.fields)) {
    fields = cleanedFields.length > 0 ? cleanedFields : saved ? cleanedFields : base.fields;
  }

  let tags = base.tags;
  if (Array.isArray(parsed.tags)) {
    tags = cleanedTags ?? [];
  }

  return {
    fields,
    status:
      typeof parsed.status === "string"
        ? parsed.status
        : saved
          ? ""
          : base.status,
    tags,
    bgmTitle: typeof parsed.bgmTitle === "string" ? parsed.bgmTitle : base.bgmTitle,
    bgmPreviewUrl: typeof parsed.bgmPreviewUrl === "string" ? parsed.bgmPreviewUrl : undefined,
    diaryThemeId: isDiaryThemeId(parsed.diaryThemeId) ? parsed.diaryThemeId : undefined,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
  };
}

export function getUserProfile(userId: string, nickname: string): UserProfile {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
    if (!raw) return defaultProfile(nickname);
    return normalizeStoredProfile(JSON.parse(raw), nickname);
  } catch {
    return defaultProfile(nickname);
  }
}

export function saveUserProfile(userId: string, profile: UserProfile) {
  try {
    const payload = profile.updatedAt ? profile : withProfileTimestamp(profile);
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}
