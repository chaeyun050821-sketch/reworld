import type { DiaryEntry, Privacy } from "../app/data";

const DIARY_KEY_PREFIX = "reworld_diary_";
const DIARY_TRASH_KEY_PREFIX = "reworld_diary_trash_";

export type DiaryTrashEntry = DiaryEntry & {
  deletedAt: string;
};

function isPrivacy(value: unknown): value is Privacy {
  return value === "public" || value === "private";
}

function normalizeEntry(raw: unknown): DiaryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<DiaryEntry> & { id?: string | number };
  const id = entry.id == null ? null : String(entry.id);
  if (!id || typeof entry.date !== "string" || typeof entry.content !== "string") return null;
  if (!isPrivacy(entry.privacy)) return null;
  return {
    id,
    date: entry.date,
    weather: typeof entry.weather === "string" ? entry.weather : "☀️",
    privacy: entry.privacy,
    content: entry.content,
    stickers: Array.isArray(entry.stickers)
      ? entry.stickers.filter((s): s is string => typeof s === "string")
      : [],
  };
}

function normalizeTrashEntry(raw: unknown): DiaryTrashEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<DiaryTrashEntry> & { id?: string | number };
  const id = entry.id == null ? null : String(entry.id);
  if (!id || typeof entry.date !== "string" || typeof entry.content !== "string") return null;
  if (!isPrivacy(entry.privacy)) return null;
  if (typeof entry.deletedAt !== "string") return null;
  return {
    id,
    date: entry.date,
    weather: typeof entry.weather === "string" ? entry.weather : "☀️",
    privacy: entry.privacy,
    content: entry.content,
    stickers: Array.isArray(entry.stickers)
      ? entry.stickers.filter((s): s is string => typeof s === "string")
      : [],
    deletedAt: entry.deletedAt,
  };
}

export function loadDiaryEntries(userId: string): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(`${DIARY_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is DiaryEntry => !!entry)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

export function saveDiaryEntries(userId: string, entries: DiaryEntry[]) {
  try {
    localStorage.setItem(`${DIARY_KEY_PREFIX}${userId}`, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

export function loadDiaryTrashEntries(userId: string): DiaryTrashEntry[] {
  try {
    const raw = localStorage.getItem(`${DIARY_TRASH_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTrashEntry)
      .filter((entry): entry is DiaryTrashEntry => !!entry)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

export function saveDiaryTrashEntries(userId: string, entries: DiaryTrashEntry[]) {
  try {
    localStorage.setItem(`${DIARY_TRASH_KEY_PREFIX}${userId}`, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}
