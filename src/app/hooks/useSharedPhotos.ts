import { useCallback, useEffect, useState } from "react";

type PhotoListener = () => void;

const sharedPhotoStore = {
  urls: [] as string[],
  listeners: new Set<PhotoListener>(),
};

function emitPhotoStoreChange() {
  sharedPhotoStore.listeners.forEach(listener => listener());
}

export function useSharedPhotos() {
  const [urls, setUrls] = useState<string[]>(() => [...sharedPhotoStore.urls]);

  useEffect(() => {
    const update = () => setUrls([...sharedPhotoStore.urls]);

    sharedPhotoStore.listeners.add(update);
    return () => {
      sharedPhotoStore.listeners.delete(update);
    };
  }, []);

  const add = useCallback((url: string) => {
    sharedPhotoStore.urls = [url, ...sharedPhotoStore.urls];
    emitPhotoStoreChange();
  }, []);

  return { urls, add };
}
