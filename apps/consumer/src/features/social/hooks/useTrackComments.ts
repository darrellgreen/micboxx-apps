import {
  addDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getFirebaseClientDb, isFirebaseConfigured } from "@/config/firebase";
import type { SocialReportReasonKey, TrackComment } from "@/contracts/social";
import {
  buildSocialReportPayload,
  buildTrackCommentPayload,
  getTrackCommentsCollection,
  getTrackCommentRef,
  getSocialReportsCollection,
  getTrackSubjectKey,
  readTrackComment,
} from "@/features/social/firestore";
import { useSocialSessionGate } from "@/features/social/hooks/useSocialSessionGate";

const LIVE_PAGE_SIZE = 25;
const OLDER_PAGE_SIZE = 25;

interface UseTrackCommentsInput {
  trackUuid: string;
  trackOwnerUid: string | null;
  trackTitle?: string | null;
  trackHref?: string | null;
}

export function useTrackComments({
  trackUuid,
  trackOwnerUid,
  trackTitle = null,
  trackHref = null,
}: UseTrackCommentsInput) {
  const configured = isFirebaseConfigured();
  const subjectKey = useMemo(() => getTrackSubjectKey(trackUuid), [trackUuid]);
  const hasTrackContext = trackUuid.trim().length > 0;
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [olderComments, setOlderComments] = useState<TrackComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const lastLiveDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const lastOlderDocRef = useRef<QueryDocumentSnapshot | null>(null);
  const {
    session,
    viewerUid,
    socialReady,
    authPending,
    interactionError,
    clearInteractionError,
    requireSocialSession,
    signIn,
  } = useSocialSessionGate({
    hasContext: hasTrackContext,
    ownerUid: trackOwnerUid,
  });

  useEffect(() => {
    if (!configured) {
      setComments([]);
      setOlderComments([]);
      setLoading(false);
      setHasMore(false);
      setError("Social features are not configured for this build.");
      return;
    }

    const commentsQuery = query(
      getTrackCommentsCollection(getFirebaseClientDb()),
      where("subjectKey", "==", subjectKey),
      where("status", "==", "active"),
      orderBy("createdAt", "desc"),
      limit(LIVE_PAGE_SIZE),
    );

    setComments([]);
    setOlderComments([]);
    setHasMore(false);
    setLoading(true);
    setError(null);
    lastLiveDocRef.current = null;
    lastOlderDocRef.current = null;

    return onSnapshot(
      commentsQuery,
      (snapshot) => {
        setComments(
          snapshot.docs.map((commentDoc) =>
            readTrackComment(commentDoc.id, commentDoc.data()),
          ),
        );
        lastLiveDocRef.current =
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1] ?? null
            : null;
        setHasMore(snapshot.docs.length >= LIVE_PAGE_SIZE);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message);
        setLoading(false);
      },
    );
  }, [configured, subjectKey]);

  const loadMore = useCallback(async () => {
    const cursor = lastOlderDocRef.current ?? lastLiveDocRef.current;
    if (!configured || !cursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const olderQuery = query(
        getTrackCommentsCollection(getFirebaseClientDb()),
        where("subjectKey", "==", subjectKey),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(OLDER_PAGE_SIZE),
      );

      const snapshot = await getDocs(olderQuery);
      const batch = snapshot.docs.map((commentDoc) =>
        readTrackComment(commentDoc.id, commentDoc.data()),
      );

      setOlderComments((current) => [...current, ...batch]);

      if (snapshot.docs.length > 0) {
        lastOlderDocRef.current =
          snapshot.docs[snapshot.docs.length - 1] ?? null;
      }

      setHasMore(snapshot.docs.length >= OLDER_PAGE_SIZE);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load more comments right now.",
      );
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [configured, loadingMore, subjectKey]);

  const allComments = useMemo(() => {
    const liveIds = new Set(comments.map((comment) => comment.id));
    const dedupedOlder = olderComments.filter((comment) => !liveIds.has(comment.id));
    return [...comments, ...dedupedOlder];
  }, [comments, olderComments]);

  const createComment = useCallback(
    async (body: string) => {
      const trimmedBody = body.trim();
      if (!trimmedBody) {
        return false;
      }

      if (
        !(await requireSocialSession({
          requireOwner: true,
          missingOwnerMessage: "This track cannot be updated right now.",
        })) ||
        !viewerUid ||
        !trackOwnerUid
      ) {
        return false;
      }

      setSubmitting(true);

      try {
        await addDoc(
          getTrackCommentsCollection(getFirebaseClientDb()),
          buildTrackCommentPayload({
            trackUuid,
            trackOwnerUid,
            authorUid: viewerUid,
            authorUsername: session?.user.username ?? null,
            authorDisplayName: session?.user.displayName ?? null,
            body: trimmedBody,
            trackTitle,
            trackHref,
          }),
        );

        return true;
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to post this comment right now.",
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      requireSocialSession,
      viewerUid,
      trackOwnerUid,
      trackUuid,
      session?.user.username,
      session?.user.displayName,
      trackTitle,
      trackHref,
    ],
  );

  const editComment = useCallback(
    async (commentId: string, body: string) => {
      const trimmedBody = body.trim();
      if (!commentId || !trimmedBody) {
        return false;
      }

      if (!(await requireSocialSession()) || !viewerUid) {
        return false;
      }

      setSavingCommentId(commentId);

      try {
        await updateDoc(getTrackCommentRef(getFirebaseClientDb(), commentId), {
          body: trimmedBody,
          status: "active",
          updatedAt: serverTimestamp(),
          editedAt: serverTimestamp(),
        });

        return true;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to update this comment right now.",
        );
        return false;
      } finally {
        setSavingCommentId((current) => (current === commentId ? null : current));
      }
    },
    [requireSocialSession, viewerUid],
  );

  const deleteComment = useCallback(
    async (comment: TrackComment) => {
      if (!comment.id) {
        return false;
      }

      if (!(await requireSocialSession()) || !viewerUid) {
        return false;
      }

      setDeletingCommentId(comment.id);

      try {
        await updateDoc(getTrackCommentRef(getFirebaseClientDb(), comment.id), {
          status: "deleted",
          updatedAt: serverTimestamp(),
          deletedAt: serverTimestamp(),
        });

        return true;
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete this comment right now.",
        );
        return false;
      } finally {
        setDeletingCommentId((current) => (current === comment.id ? null : current));
      }
    },
    [requireSocialSession, viewerUid],
  );

  const reportComment = useCallback(
    async (
      comment: TrackComment,
      reasonKey: SocialReportReasonKey,
      detail: string,
    ) => {
      if (!comment.id) {
        return false;
      }

      if (!(await requireSocialSession()) || !viewerUid) {
        return false;
      }

      setReportingCommentId(comment.id);

      try {
        await addDoc(
          getSocialReportsCollection(getFirebaseClientDb()),
          buildSocialReportPayload({
            reporterUid: viewerUid,
            reporterUsername: session?.user.username ?? null,
            reporterDisplayName: session?.user.displayName ?? null,
            targetType: "track_comment",
            targetId: comment.id,
            reportedUserUid: comment.authorUid,
            reasonKey,
            detail,
            targetPreview: comment.body,
            subjectKey: comment.subjectKey,
          }),
        );

        return true;
      } catch (reportError) {
        setError(
          reportError instanceof Error
            ? reportError.message
            : "Unable to submit this report right now.",
        );
        return false;
      } finally {
        setReportingCommentId((current) => (current === comment.id ? null : current));
      }
    },
    [requireSocialSession, viewerUid, session?.user.username, session?.user.displayName],
  );

  return {
    configured,
    isSignedIn: Boolean(session),
    viewerUid,
    socialReady,
    authPending,
    comments: allComments,
    loading,
    loadingMore,
    hasMore,
    error,
    interactionError,
    submitting,
    savingCommentId,
    deletingCommentId,
    reportingCommentId,
    clearInteractionError,
    createComment,
    editComment,
    deleteComment,
    reportComment,
    loadMore,
    signIn,
  };
}
