import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import {
  buildTrackSocialPayload,
  getTrackFavoriteRef,
  getTrackLikeRef,
  getTrackSocialMetaRef,
  readTrackSocialMeta,
} from "@/features/social/firestore";
import { useSocialSessionGate } from "@/features/social/hooks/useSocialSessionGate";

interface UseTrackSocialStateInput {
  trackUuid: string;
  trackOwnerUid: string | null;
  trackTitle: string;
  trackHref?: string | null;
  initialComments: number;
  initialLikes: number;
  initialFavourites: number;
  enabled?: boolean;
}

export function useTrackSocialState({
  trackUuid,
  trackOwnerUid,
  trackTitle,
  trackHref,
  initialComments,
  initialLikes,
  initialFavourites,
  enabled = true,
}: UseTrackSocialStateInput) {
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [favoriteCount, setFavoriteCount] = useState(initialFavourites);
  const [commentCount, setCommentCount] = useState(initialComments);
  const [liked, setLiked] = useState(false);
  const [favourited, setFavourited] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [favouritePending, setFavouritePending] = useState(false);
  const configured = isFirebaseConfigured();
  const hasTrackContext = enabled && trackUuid.trim().length > 0;
  const {
    session,
    viewerUid: expectedUserUuid,
    socialReady,
    authPending,
    interactionError,
    setInteractionError,
    clearInteractionError,
    requireSocialSession,
  } = useSocialSessionGate({
    hasContext: hasTrackContext,
    ownerUid: trackOwnerUid,
  });

  useEffect(() => {
    if (!configured || !hasTrackContext) {
      setLikeCount(initialLikes);
      setFavoriteCount(initialFavourites);
      setCommentCount(initialComments);
      return;
    }

    return onSnapshot(
      getTrackSocialMetaRef(getFirebaseClientDb(), trackUuid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setLikeCount(initialLikes);
          setFavoriteCount(initialFavourites);
          setCommentCount(initialComments);
          return;
        }

        const meta = readTrackSocialMeta(snapshot.data());
        setLikeCount(meta.likeCount);
        setFavoriteCount(meta.favoriteCount);
        setCommentCount(meta.commentCount);
      },
      () => undefined,
    );
  }, [
    configured,
    hasTrackContext,
    initialComments,
    initialFavourites,
    initialLikes,
    trackUuid,
  ]);

  useEffect(() => {
    if (!configured || !hasTrackContext || !socialReady || !expectedUserUuid) {
      setLiked(false);
      setFavourited(false);
      return;
    }

    const db = getFirebaseClientDb();
    const likeRef = getTrackLikeRef(db, trackUuid, expectedUserUuid);
    const favoriteRef = getTrackFavoriteRef(db, trackUuid, expectedUserUuid);

    const unsubscribeLike = onSnapshot(likeRef, (snapshot) => {
      setLiked(snapshot.exists());
    });
    const unsubscribeFavorite = onSnapshot(favoriteRef, (snapshot) => {
      setFavourited(snapshot.exists());
    });

    return () => {
      unsubscribeLike();
      unsubscribeFavorite();
    };
  }, [configured, expectedUserUuid, hasTrackContext, socialReady, trackUuid]);

  const toggleLike = useCallback(async () => {
    if (
      !(await requireSocialSession({
        requireOwner: true,
        missingOwnerMessage: "This track cannot be updated right now.",
      })) ||
      !expectedUserUuid ||
      !trackOwnerUid
    ) {
      return;
    }

    setLikePending(true);
    try {
      const likeRef = getTrackLikeRef(getFirebaseClientDb(), trackUuid, expectedUserUuid);

      if (liked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(
          likeRef,
          buildTrackSocialPayload(trackUuid, expectedUserUuid, trackOwnerUid, {
            actorUsername: session?.user.username ?? null,
            actorDisplayName: session?.user.displayName ?? null,
            trackTitle,
            trackHref,
          }),
        );
      }
    } catch (error) {
      setInteractionError(
        error instanceof Error ? error.message : "Unable to update likes right now.",
      );
    } finally {
      setLikePending(false);
    }
  }, [
    expectedUserUuid,
    liked,
    requireSocialSession,
    session?.user.displayName,
    session?.user.username,
    setInteractionError,
    trackHref,
    trackOwnerUid,
    trackTitle,
    trackUuid,
  ]);

  const toggleFavourite = useCallback(async () => {
    if (
      !(await requireSocialSession({
        requireOwner: true,
        missingOwnerMessage: "This track cannot be updated right now.",
      })) ||
      !expectedUserUuid ||
      !trackOwnerUid
    ) {
      return;
    }

    setFavouritePending(true);
    try {
      const favoriteRef = getTrackFavoriteRef(
        getFirebaseClientDb(),
        trackUuid,
        expectedUserUuid,
      );

      if (favourited) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(
          favoriteRef,
          buildTrackSocialPayload(trackUuid, expectedUserUuid, trackOwnerUid, {
            actorUsername: session?.user.username ?? null,
            actorDisplayName: session?.user.displayName ?? null,
            trackTitle,
            trackHref,
          }),
        );
      }
    } catch (error) {
      setInteractionError(
        error instanceof Error
          ? error.message
          : "Unable to update favourites right now.",
      );
    } finally {
      setFavouritePending(false);
    }
  }, [
    expectedUserUuid,
    favourited,
    requireSocialSession,
    session?.user.displayName,
    session?.user.username,
    setInteractionError,
    trackHref,
    trackOwnerUid,
    trackTitle,
    trackUuid,
  ]);

  // The meta doc count may lag behind (cloud function not yet run, or never ran).
  // If the user has liked the track, always show at least 1 so the count is
  // consistent with the highlighted state.
  const displayLikeCount = liked ? Math.max(likeCount, 1) : likeCount;

  return {
    configured,
    socialReady,
    authPending,
    likeCount: displayLikeCount,
    favoriteCount,
    commentCount,
    liked,
    favourited,
    likePending,
    favouritePending,
    interactionError,
    clearInteractionError,
    toggleLike,
    toggleFavourite,
  };
}
