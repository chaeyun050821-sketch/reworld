import { useCallback, useEffect, useState } from "react";
import type { PhotoDecoration } from "../../lib/photo-decorations";
import {
  filterUsablePhotos,
  loadPhotos,
  savePhotos,
  type StoredPhoto,
} from "../../lib/photo-storage";
import {
  addGradientPhoto,
  addUploadedPhoto,
  deleteUserPhoto,
  fetchUserPhotos,
  mergePhotoLists,
  updatePhotoDecorations,
  upsertLocalPhoto,
} from "../../lib/photo-sync";
import { isSupabaseConfigured } from "../../lib/supabase";

type PhotoListener = () => void;

const albumStore = {
  byUser: new Map<string, StoredPhoto[]>(),
  listeners: new Set<PhotoListener>(),
  /** Prevents in-flight sync from resurrecting a just-deleted photo (often as a dead URL). */
  pendingDeletes: new Map<string, Set<string>>(),
};

function getPendingDeletes(userId: string): Set<string> {
  if (!albumStore.pendingDeletes.has(userId)) {
    albumStore.pendingDeletes.set(userId, new Set());
  }
  return albumStore.pendingDeletes.get(userId)!;
}

function markPendingDelete(userId: string, photoId: string) {
  getPendingDeletes(userId).add(photoId);
}

function clearPendingDelete(userId: string, photoId: string) {
  getPendingDeletes(userId).delete(photoId);
}

function getStorePhotos(userId: string): StoredPhoto[] {
  if (!albumStore.byUser.has(userId)) {
    albumStore.byUser.set(userId, loadPhotos(userId));
  }
  return albumStore.byUser.get(userId) ?? [];
}

function setStorePhotos(userId: string, photos: StoredPhoto[]) {
  const cleaned = filterUsablePhotos(photos).filter(
    (photo) => !getPendingDeletes(userId).has(photo.id),
  );
  albumStore.byUser.set(userId, cleaned);
  savePhotos(userId, cleaned);
  albumStore.listeners.forEach((listener) => listener());
}

export function usePhotoAlbum(userId: string) {
  const [photos, setPhotos] = useState<StoredPhoto[]>(() => getStorePhotos(userId));
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const syncFromStore = () => setPhotos([...getStorePhotos(userId)]);
    syncFromStore();
    albumStore.listeners.add(syncFromStore);
    return () => {
      albumStore.listeners.delete(syncFromStore);
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const local = loadPhotos(userId);
    setStorePhotos(userId, local);

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const remote = await fetchUserPhotos(userId);
      if (cancelled) return;

      // Use fresh local after await — stale snapshot + upsert was re-creating
      // deleted photos with public URLs pointing at already-removed storage.
      const excludeIds = getPendingDeletes(userId);
      const freshLocal = getStorePhotos(userId);
      const merged = mergePhotoLists(freshLocal, remote, excludeIds);
      setStorePhotos(userId, merged);

      for (const photo of merged) {
        if (excludeIds.has(photo.id)) continue;
        if (remote.some((item) => item.id === photo.id)) continue;
        void upsertLocalPhoto(userId, photo);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      const result = await addUploadedPhoto(userId, file);
      setUploading(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      clearPendingDelete(userId, result.photo.id);
      const next = [result.photo, ...getStorePhotos(userId).filter((p) => p.id !== result.photo.id)];
      setStorePhotos(userId, next);
      return true;
    },
    [userId],
  );

  const addGradient = useCallback(
    async (gradient: string) => {
      setError(null);
      const result = await addGradientPhoto(userId, gradient);
      if (!result.ok) {
        setError(result.error);
        const localPhoto = {
          id: crypto.randomUUID(),
          src: gradient,
          kind: "gradient" as const,
          createdAt: new Date().toISOString(),
        };
        setStorePhotos(userId, [localPhoto, ...getStorePhotos(userId)]);
        return false;
      }
      clearPendingDelete(userId, result.photo.id);
      setStorePhotos(userId, [result.photo, ...getStorePhotos(userId).filter((p) => p.id !== result.photo.id)]);
      return true;
    },
    [userId],
  );

  const removePhoto = useCallback(
    async (photo: StoredPhoto) => {
      setError(null);
      // Optimistic: drop the slot from the album immediately so UI never shows a black tile
      markPendingDelete(userId, photo.id);
      const previous = getStorePhotos(userId);
      const next = previous.filter((item) => item.id !== photo.id);
      setStorePhotos(userId, next);
      if (photo.src.startsWith("blob:")) {
        URL.revokeObjectURL(photo.src);
      }

      const result = await deleteUserPhoto(userId, photo);
      if (!result.ok) {
        clearPendingDelete(userId, photo.id);
        // Restore only if the image source is still renderable
        if (previous.some((item) => item.id === photo.id)) {
          setStorePhotos(userId, previous);
        }
        setError(result.error);
        return result;
      }

      // Keep tombstone briefly so a concurrent fetch/merge cannot resurrect it
      window.setTimeout(() => clearPendingDelete(userId, photo.id), 60_000);
      return { ok: true as const };
    },
    [userId],
  );

  /** Drop orphaned tiles whose image URL 404s / fails to load. */
  const dropBrokenPhoto = useCallback(
    (photoId: string) => {
      const photo = getStorePhotos(userId).find((item) => item.id === photoId);
      if (!photo) return;
      markPendingDelete(userId, photoId);
      setStorePhotos(
        userId,
        getStorePhotos(userId).filter((item) => item.id !== photoId),
      );
      void deleteUserPhoto(userId, photo).then((result) => {
        if (result.ok) {
          window.setTimeout(() => clearPendingDelete(userId, photoId), 60_000);
        } else {
          // Keep it out of the UI even if remote delete failed — src is already broken
          window.setTimeout(() => clearPendingDelete(userId, photoId), 60_000);
        }
      });
    },
    [userId],
  );

  const saveDecorations = useCallback(
    async (photoId: string, decorations: PhotoDecoration[]) => {
      const current = getStorePhotos(userId);
      const next = current.map((photo) =>
        photo.id === photoId
          ? {
              ...photo,
              decorations: decorations.length > 0 ? decorations : undefined,
            }
          : photo,
      );
      setStorePhotos(userId, next);

      const result = await updatePhotoDecorations(userId, photoId, decorations);
      if (!result.ok) {
        setError(result.error);
        return result;
      }
      return { ok: true as const };
    },
    [userId],
  );

  return {
    photos,
    urls: photos.map((photo) => photo.src),
    loading,
    uploading,
    error,
    addUpload,
    addGradient,
    removePhoto,
    dropBrokenPhoto,
    saveDecorations,
    setError,
  };
}
