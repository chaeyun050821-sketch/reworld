export type StoredAvatarConfig = {
  body: string;
  pixels: Record<string, string>;
};

export type StoredAvatarProfile = {
  config: StoredAvatarConfig;
  equipped: string[];
};

const AVATAR_KEY_PREFIX = "reworld_avatar_";

export function loadAvatarProfile(userId: string): StoredAvatarProfile | null {
  try {
    const raw = localStorage.getItem(`${AVATAR_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAvatarProfile;
    if (!parsed?.config || !Array.isArray(parsed.equipped)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAvatarProfile(userId: string, avatar: StoredAvatarProfile) {
  try {
    localStorage.setItem(`${AVATAR_KEY_PREFIX}${userId}`, JSON.stringify(avatar));
  } catch {
    /* ignore quota errors */
  }
}
