export type ProfileField = { label: string; value: string };

export type UserProfile = {
  fields: ProfileField[];
  status: string;
  tags: string[];
  bgmTitle?: string;
};

const PROFILE_KEY_PREFIX = "reworld_profile_";

export function defaultProfile(nickname: string): UserProfile {
  return {
    fields: [
      { label: "이름", value: nickname },
      { label: "생일", value: "2000.00.00 🎂" },
      { label: "지역", value: "서울 ☁️" },
      { label: "관심사", value: "음악, 일러스트" },
    ],
    status: "일상 기록중 🌸",
    tags: ["#daily", "#y2k", "#diary"],
    bgmTitle: "♬ Lovefool - The Cardigans",
  };
}

export function getUserProfile(userId: string, nickname: string): UserProfile {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${userId}`);
    if (!raw) return defaultProfile(nickname);
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed.fields?.length) return defaultProfile(nickname);
    return parsed;
  } catch {
    return defaultProfile(nickname);
  }
}

export function saveUserProfile(userId: string, profile: UserProfile) {
  localStorage.setItem(`${PROFILE_KEY_PREFIX}${userId}`, JSON.stringify(profile));
}
