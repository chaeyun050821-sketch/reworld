import { useCallback, useEffect, useState } from "react";
import { loadPhotos, savePhotos, type StoredPhoto } from "../../lib/photo-storage";
import {
  addGradientPhoto,
  addUploadedPhoto,
  deleteUserPhoto,
  fetchUserPhotos,
  mergePhotoLists,
  upsertLocalPhoto,
} from "../../lib/photo-sync";
import { isSupabaseConfigured } from "../../lib/supabase";

type PhotoListener = () => void;

const albumStore = {
  byUser: new Map<string, StoredPhoto[]>(),
  listeners: new Set<PhotoListener>(),
};

function getStorePhotos(userId: string): StoredPhoto[] {
  if (!albumStore.byUser.has(userId)) {
    albumStore.byUser.set(userId, loadPhotos(userId));
  }
  return albumStore.byUser.get(userId) ?? [];
}

function setStorePhotos(userId: string, photos: StoredPhoto[]) {
  albumStore.byUser.set(userId, photos);
  savePhotos(userId, photos);
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
      const merged = mergePhotoLists(local, remote);
      setStorePhotos(userId, merged);

      for (const photo of local) {
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
      setStorePhotos(userId, [result.photo, ...getStorePhotos(userId).filter((p) => p.id !== result.photo.id)]);
      return true;
    },
    [userId],
  );

  const removePhoto = useCallback(
    async (photo: StoredPhoto) => {
      setError(null);
      const result = await deleteUserPhoto(userId, photo);
      if (!result.ok) {
        setError(result.error);
        return result;
      }
      if (photo.src.startsWith("blob:")) {
        URL.revokeObjectURL(photo.src);
      }
      const next = getStorePhotos(userId).filter((item) => item.id !== photo.id);
      setStorePhotos(userId, next);
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
    setError,
  };
}
