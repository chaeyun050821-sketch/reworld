import { SAMPLE_EMOTICONS, type Emoticon } from "../app/data";

const HIDDEN_KEY_PREFIX = "reworld_hidden_emoticons_";
export const EMOTICON_SELECT_PREFIX = "em:";

export function emoticonSelectKey(id: number): string {
  return `${EMOTICON_SELECT_PREFIX}${id}`;
}

export function parseEmoticonSelectKey(key: string): number | null {
  if (!key.startsWith(EMOTICON_SELECT_PREFIX)) return null;
  const id = Number(key.slice(EMOTICON_SELECT_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

export function loadHiddenEmoticonIds(userId: string): Set<number> {
  try {
    const raw = localStorage.getItem(`${HIDDEN_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => Number.isFinite(id)) : []);
  } catch {
    return new Set();
  }
}

function saveHiddenEmoticonIds(userId: string, ids: Set<number>) {
  try {
    localStorage.setItem(`${HIDDEN_KEY_PREFIX}${userId}`, JSON.stringify([...ids]));
  } catch {
    /* ignore quota errors */
  }
}

export function hideEmoticons(userId: string, emoticonIds: number[]) {
  if (emoticonIds.length === 0) return;
  const hidden = loadHiddenEmoticonIds(userId);
  for (const id of emoticonIds) hidden.add(id);
  saveHiddenEmoticonIds(userId, hidden);
}

export function getVisibleEmoticons(userId: string): Emoticon[] {
  const hidden = loadHiddenEmoticonIds(userId);
  return SAMPLE_EMOTICONS.filter((emoticon) => !hidden.has(emoticon.id));
}
