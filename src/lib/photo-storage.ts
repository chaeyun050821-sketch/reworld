import { normalizePhotoDecorations, type PhotoDecoration } from "./photo-decorations";

export type StoredPhoto = {
  id: string;
  src: string;
  kind: "upload" | "gradient";
  createdAt: string;
  decorations?: PhotoDecoration[];
};

const PHOTO_KEY_PREFIX = "reworld_photos_";

/** Reject empty / revoked / non-renderable album sources (prevents black broken tiles). */
export function isUsablePhotoSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (trimmed === "null" || trimmed === "undefined") return false;
  // blob: URLs die after reload or revokeObjectURL — never keep them in the album list
  if (trimmed.startsWith("blob:")) return false;
  if (trimmed.startsWith("linear-gradient(")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return true;
  return false;
}

export function filterUsablePhotos(photos: StoredPhoto[]): StoredPhoto[] {
  return photos.filter((photo) => isUsablePhotoSrc(photo.src));
}

function normalizePhoto(raw: unknown): StoredPhoto | null {
  if (!raw || typeof raw !== "object") return null;
  const photo = raw as Partial<StoredPhoto>;
  if (!photo.id || !isUsablePhotoSrc(photo.src)) return null;
  if (photo.kind !== "upload" && photo.kind !== "gradient") return null;
  const decorations = normalizePhotoDecorations(photo.decorations);
  return {
    id: String(photo.id),
    src: photo.src.trim(),
    kind: photo.kind,
    createdAt: typeof photo.createdAt === "string" ? photo.createdAt : new Date().toISOString(),
    ...(decorations.length > 0 ? { decorations } : {}),
  };
}

export function loadPhotos(userId: string): StoredPhoto[] {
  try {
    const raw = localStorage.getItem(`${PHOTO_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const photos = parsed
      .map(normalizePhoto)
      .filter((photo): photo is StoredPhoto => !!photo)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

    // Persist cleanup so empty/broken slots don't linger across reloads
    if (photos.length !== parsed.length) {
      savePhotos(userId, photos);
    }
    return photos;
  } catch {
    return [];
  }
}

export function savePhotos(userId: string, photos: StoredPhoto[]) {
  try {
    localStorage.setItem(
      `${PHOTO_KEY_PREFIX}${userId}`,
      JSON.stringify(filterUsablePhotos(photos)),
    );
  } catch {
    /* ignore quota errors */
  }
}
