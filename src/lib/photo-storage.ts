export type StoredPhoto = {
  id: string;
  src: string;
  kind: "upload" | "gradient";
  createdAt: string;
};

const PHOTO_KEY_PREFIX = "reworld_photos_";

function normalizePhoto(raw: unknown): StoredPhoto | null {
  if (!raw || typeof raw !== "object") return null;
  const photo = raw as Partial<StoredPhoto>;
  if (!photo.id || typeof photo.src !== "string" || !photo.src) return null;
  if (photo.kind !== "upload" && photo.kind !== "gradient") return null;
  return {
    id: String(photo.id),
    src: photo.src,
    kind: photo.kind,
    createdAt: typeof photo.createdAt === "string" ? photo.createdAt : new Date().toISOString(),
  };
}

export function loadPhotos(userId: string): StoredPhoto[] {
  try {
    const raw = localStorage.getItem(`${PHOTO_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizePhoto)
      .filter((photo): photo is StoredPhoto => !!photo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

export function savePhotos(userId: string, photos: StoredPhoto[]) {
  try {
    localStorage.setItem(`${PHOTO_KEY_PREFIX}${userId}`, JSON.stringify(photos));
  } catch {
    /* ignore quota errors */
  }
}
