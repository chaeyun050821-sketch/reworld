import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPhotoReaction,
  createPhotoComment,
  deletePhotoComment,
  deletePhotoReaction,
  fetchPhotoSocialBundle,
  incrementPhotoView,
  togglePhotoLike,
  type PhotoComment,
  type PhotoReaction,
  type PhotoSocialBundle,
} from "../../lib/photo-social";

const EMPTY_BUNDLE: PhotoSocialBundle = {
  views: {},
  likeCounts: {},
  likedByMe: {},
  comments: {},
  reactions: {},
};

export function usePhotoSocial(viewerUserId: string, photoIds: string[]) {
  const [bundle, setBundle] = useState<PhotoSocialBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(false);

  const photoIdsKey = useMemo(() => photoIds.slice().sort().join(","), [photoIds]);

  useEffect(() => {
    if (!photoIdsKey) {
      setBundle(EMPTY_BUNDLE);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchPhotoSocialBundle(photoIds, viewerUserId).then((next) => {
      if (cancelled) return;
      setBundle(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [photoIdsKey, viewerUserId, photoIds]);

  const refresh = useCallback(async () => {
    if (photoIds.length === 0) return;
    const next = await fetchPhotoSocialBundle(photoIds, viewerUserId);
    setBundle(next);
  }, [photoIds, viewerUserId]);

  const addView = useCallback(
    async (photoId: string) => {
      const nextCount = await incrementPhotoView(photoId);
      if (nextCount === null) return;
      setBundle((prev) => ({
        ...prev,
        views: { ...prev.views, [photoId]: nextCount },
      }));
    },
    [],
  );

  const toggleLike = useCallback(
    async (photoId: string) => {
      const currentlyLiked = bundle.likedByMe[photoId] ?? false;
      const result = await togglePhotoLike(photoId, viewerUserId, currentlyLiked);
      if (!result.ok) return result;

      setBundle((prev) => {
        const count = prev.likeCounts[photoId] ?? 0;
        return {
          ...prev,
          likedByMe: { ...prev.likedByMe, [photoId]: result.liked },
          likeCounts: {
            ...prev.likeCounts,
            [photoId]: result.liked ? count + 1 : Math.max(0, count - 1),
          },
        };
      });
      return result;
    },
    [bundle.likedByMe, viewerUserId],
  );

  const addComment = useCallback(
    async (photoId: string, authorNickname: string, content: string) => {
      const result = await createPhotoComment(photoId, viewerUserId, authorNickname, content);
      if (!result.ok) return result;
      setBundle((prev) => ({
        ...prev,
        comments: {
          ...prev.comments,
          [photoId]: [...(prev.comments[photoId] ?? []), result.comment],
        },
      }));
      return result;
    },
    [viewerUserId],
  );

  const removeComment = useCallback(
    async (photoId: string, commentId: string) => {
      const result = await deletePhotoComment(viewerUserId, photoId, commentId);
      if (!result.ok) return result;
      setBundle((prev) => ({
        ...prev,
        comments: {
          ...prev.comments,
          [photoId]: (prev.comments[photoId] ?? []).filter((c) => c.id !== commentId),
        },
      }));
      return result;
    },
    [viewerUserId],
  );

  const addReaction = useCallback(
    async (photoId: string, actorName: string, emoticonId: number) => {
      const result = await addPhotoReaction(photoId, viewerUserId, actorName, emoticonId);
      if (!result.ok) return result;
      setBundle((prev) => ({
        ...prev,
        reactions: {
          ...prev.reactions,
          [photoId]: [...(prev.reactions[photoId] ?? []), result.reaction],
        },
      }));
      return result;
    },
    [viewerUserId],
  );

  const removeReaction = useCallback(
    async (photoId: string, reactionId: string) => {
      const result = await deletePhotoReaction(viewerUserId, photoId, reactionId);
      if (!result.ok) return result;
      setBundle((prev) => ({
        ...prev,
        reactions: {
          ...prev.reactions,
          [photoId]: (prev.reactions[photoId] ?? []).filter((r) => r.id !== reactionId),
        },
      }));
      return result;
    },
    [viewerUserId],
  );

  return {
    views: bundle.views,
    likeCounts: bundle.likeCounts,
    likedByMe: bundle.likedByMe,
    comments: bundle.comments,
    reactions: bundle.reactions,
    loading,
    refresh,
    addView,
    toggleLike,
    addComment,
    removeComment,
    addReaction,
    removeReaction,
  };
}

export type { PhotoComment, PhotoReaction };
