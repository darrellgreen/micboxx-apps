import { deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { getFirebaseClientDb } from "@/config/firebase";
import {
  buildFollowPayload,
  getFollowRef,
  getUserSocialMetaRef,
  readUserSocialMeta,
} from "@/features/social/firestore";
import { useSocialSessionGate } from "@/features/social/hooks/useSocialSessionGate";

interface UseUserFollowStateInput {
  profileUid: string | null;
  profileUsername?: string | null;
  initialFollowerCount: number;
  initialFollowingCount: number;
}

export function useUserFollowState({
  profileUid,
  profileUsername = null,
  initialFollowerCount,
  initialFollowingCount,
}: UseUserFollowStateInput) {
  const hasProfileContext = Boolean(profileUid?.trim().length);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followingCount, setFollowingCount] = useState(initialFollowingCount);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const {
    session,
    viewerUid,
    configured,
    socialReady,
    authPending,
    interactionError,
    setInteractionError,
    clearInteractionError,
    requireSocialSession,
  } = useSocialSessionGate({
    hasContext: hasProfileContext,
  });
  const isOwnProfile = Boolean(viewerUid && profileUid && viewerUid === profileUid);

  useEffect(() => {
    if (!configured || !profileUid) {
      setFollowerCount(initialFollowerCount);
      setFollowingCount(initialFollowingCount);
      return;
    }

    return onSnapshot(
      getUserSocialMetaRef(getFirebaseClientDb(), profileUid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setFollowerCount(initialFollowerCount);
          setFollowingCount(initialFollowingCount);
          return;
        }

        const meta = readUserSocialMeta(snapshot.data());
        setFollowerCount(meta.followerCount);
        setFollowingCount(meta.followingCount);
      },
      () => undefined,
    );
  }, [configured, initialFollowerCount, initialFollowingCount, profileUid]);

  useEffect(() => {
    if (!configured || !profileUid || !viewerUid || !socialReady || isOwnProfile) {
      setFollowing(false);
      return;
    }

    return onSnapshot(
      getFollowRef(getFirebaseClientDb(), viewerUid, profileUid),
      (snapshot) => {
        setFollowing(snapshot.exists());
      },
      () => undefined,
    );
  }, [configured, isOwnProfile, profileUid, socialReady, viewerUid]);

  const toggleFollow = useCallback(async () => {
    if (isOwnProfile) {
      setInteractionError("You cannot follow your own profile.");
      return;
    }

    if (
      !(await requireSocialSession({
        missingContextMessage: "This profile cannot be updated right now.",
      })) ||
      !viewerUid ||
      !profileUid
    ) {
      return;
    }

    setFollowPending(true);

    try {
      const followRef = getFollowRef(getFirebaseClientDb(), viewerUid, profileUid);

      if (following) {
        await deleteDoc(followRef);
      } else {
        await setDoc(
          followRef,
          buildFollowPayload(viewerUid, profileUid, {
            actorUsername: session?.user.username ?? null,
            actorDisplayName: session?.user.displayName ?? null,
            actorHref: session?.user.username
              ? `/user/${session.user.username}`
              : null,
          }),
        );
      }
    } catch (error) {
      setInteractionError(
        error instanceof Error
          ? error.message
          : "Unable to update this follow right now.",
      );
    } finally {
      setFollowPending(false);
    }
  }, [
    following,
    isOwnProfile,
    profileUid,
    requireSocialSession,
    session?.user.displayName,
    session?.user.username,
    setInteractionError,
    viewerUid,
  ]);

  return {
    configured,
    socialReady,
    authPending,
    followerCount,
    followingCount,
    following,
    followPending,
    isOwnProfile,
    interactionError,
    clearInteractionError,
    toggleFollow,
    canFollow: !isOwnProfile && Boolean(profileUid),
    profileUsername,
  };
}
