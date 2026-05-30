import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { AnimatedPressable } from "@micboxx/ui";
import {
    activateRoomQna,
    activateRoomSupport,
    answerRoomQuestion,
    closeRoomPoll,
    createRoomPoll,
    deactivateRoomQna,
    endActiveRoomMoment,
    enterCreatorRoom,
    getCreatorRoomDetail,
    getRoomPollSnapshot,
    getRoomQnaSnapshot,
    getRoomSupportSnapshot,
    startLiveVideoDropInMoment,
} from "@/features/rooms/api";
import {
    emptyCreatorRoomRuntimeState,
    subscribeToCreatorRoomRuntime,
    type CreatorRoomRuntimeState,
} from "@/features/rooms/firebase/roomState";
import { ArtistBroadcastSurface } from "@/features/rooms/live-video/ArtistBroadcastSurface";
import type {
    CreatorRoomDetail,
    CreatorRoomEntry,
    RoomPollSnapshot,
    RoomQnaSnapshot,
    RoomQuestionSnapshotItem,
    RoomSupportSnapshot,
} from "@/features/rooms/types";
import { formatRelativeTime } from "@/lib/formatters";
import { CreatorApiError } from "@/shared/api/creator-dashboard";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function stageLabel(moment: CreatorRoomRuntimeState["activeMoment"]) {
  if (!moment) return null;
  if (moment.type === "artist_video_drop_in" && moment.source.kind === "livekit_room") {
    return "Live video";
  }
  return moment.title ?? moment.type.replaceAll("_", " ");
}

type RoomControlMode = "live" | "qa" | "poll" | "support";

function getRoomInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "M";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? "M"}${words[1][0] ?? "B"}`.toUpperCase();
}

function formatQuestionStatus(question: RoomQuestionSnapshotItem): string {
  if (question.status === "answered" && question.answerText) {
    return "Answered";
  }

  if (question.status === "active") {
    return "Active";
  }

  if (question.votes > 0) {
    return `${question.votes} votes`;
  }

  return "New";
}

function createDefaultPollDraftOptions(): string[] {
  return ["Yes", "No", "", ""];
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function RoomManagementScreen() {
  const params = useLocalSearchParams<{ albumId?: string | string[] }>();
  const albumId = normalizeParam(params.albumId);
  const [detail, setDetail] = useState<CreatorRoomDetail | null>(null);
  const [entry, setEntry] = useState<CreatorRoomEntry | null>(null);
  const [runtime, setRuntime] = useState<CreatorRoomRuntimeState>(emptyCreatorRoomRuntimeState);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"start" | "end" | "qna" | "qna-close" | "poll" | "poll-close" | "support" | "support-close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [qnaSnapshot, setQnaSnapshot] = useState<RoomQnaSnapshot | null>(null);
  const [pollSnapshot, setPollSnapshot] = useState<RoomPollSnapshot | null>(null);
  const [supportSnapshot, setSupportSnapshot] = useState<RoomSupportSnapshot | null>(null);
  const [supportGoalDraft, setSupportGoalDraft] = useState("");
  const [qnaAnswerQuestionId, setQnaAnswerQuestionId] = useState<string | null>(null);
  const [qnaAnswerDraft, setQnaAnswerDraft] = useState("");
  const [pollDraftQuestion, setPollDraftQuestion] = useState("");
  const [pollDraftOptions, setPollDraftOptions] = useState<string[]>(createDefaultPollDraftOptions);
  const [activeControl, setActiveControl] = useState<RoomControlMode>("live");
  const goLiveAttemptRef = useRef(0);
  const pollDraftHydratedRoomRef = useRef<string | null>(null);

  const roomId = entry?.room.id ?? null;
  const canonicalRoomId = roomId == null ? null : String(roomId);

  const canStartDropIn =
    entry?.capabilities?.can_start_drop_in === true ||
    entry?.capabilities?.can_start_live_video === true ||
    entry?.capabilities?.can_artist_drop_in === true ||
    entry?.capabilities?.can_manage_moments === true;

  const canEndDropIn =
    entry?.capabilities?.can_end_drop_in === true ||
    entry?.capabilities?.can_artist_drop_in === true ||
    entry?.capabilities?.can_manage_moments === true;

  const canManageInteractiveMoments =
    entry?.capabilities?.can_manage_qna_moment === true ||
    entry?.capabilities?.can_manage_poll_moment === true ||
    entry?.capabilities?.can_manage_room === true ||
    entry?.capabilities?.can_manage_moments === true ||
    canStartDropIn;

  const canActivateSupport =
    entry?.capabilities?.can_activate_support === true ||
    entry?.capabilities?.can_manage_room === true ||
    entry?.capabilities?.can_manage_moments === true;
  const canShowSupport = entry?.capabilities?.can_show_support === true;
  const canViewSupportGoal = entry?.capabilities?.can_view_support_goal === true;
  const canViewSupport = canActivateSupport || canShowSupport || canViewSupportGoal;

  const activeQnaMoment = qnaSnapshot?.enabled === true;
  const activePollMoment = Boolean(pollSnapshot?.activePollId);
  const supportTotalCents = supportSnapshot?.totalAmountCents ?? 0;
  const supportGoalCents = supportSnapshot?.goalCents ?? null;
  const supportEnabled =
    supportSnapshot?.enabled === true ||
    (typeof supportGoalCents === "number" && supportGoalCents > 0) ||
    supportTotalCents > 0;
  const supportProgressPercent =
    supportGoalCents && supportGoalCents > 0
      ? Math.min((supportTotalCents / supportGoalCents) * 100, 100)
      : 0;

  const hasLegacyOverlayMoment =
    runtime.activeMoment?.presentation === "overlay" &&
    (runtime.activeMoment.type === "qa_opened" || runtime.activeMoment.type === "poll_opened");
  const effectiveActiveMoment = hasLegacyOverlayMoment ? null : runtime.activeMoment;
  const activeLiveVideoMoment =
    effectiveActiveMoment?.type === "artist_video_drop_in" &&
    effectiveActiveMoment.source.kind === "livekit_room";

  const hasActiveMoment = effectiveActiveMoment !== null || activeQnaMoment || activePollMoment;
  const isBusy = busyAction !== null;
  const listenerCount = runtime.presenceSummary.activeCount;
  const listeners = runtime.presenceSummary.topAvatars;

  // ── Data loading ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!albumId) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const nextDetail = await getCreatorRoomDetail(albumId);
      const nextEntry = await enterCreatorRoom(nextDetail.releaseIdentifier);
      setDetail(nextDetail);
      setEntry(nextEntry);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Room.");
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeToCreatorRoomRuntime(canonicalRoomId, (patch) => {
      setRuntime((current) => ({ ...current, ...patch }));
    });
  }, [canonicalRoomId]);

  const refreshRoomTools = useCallback(async () => {
    if (!canonicalRoomId) {
      setQnaSnapshot(null);
      setPollSnapshot(null);
      setSupportSnapshot(null);
      return;
    }

    setToolsLoading(true);
    try {
      const [nextQna, nextPoll, nextSupport] = await Promise.all([
        getRoomQnaSnapshot(canonicalRoomId),
        getRoomPollSnapshot(canonicalRoomId),
        canViewSupport
          ? getRoomSupportSnapshot(canonicalRoomId).catch((nextError) => {
            if (
              nextError instanceof CreatorApiError &&
              (nextError.status === 403 || nextError.status === 404)
            ) {
              return null;
            }

            throw nextError;
          })
          : Promise.resolve(null),
      ]);
      setQnaSnapshot(nextQna);
      setPollSnapshot(nextPoll);
      setSupportSnapshot((current) => {
        if (!nextSupport) {
          return null;
        }

        return {
          ...nextSupport,
          enabled: nextSupport.enabled ?? current?.enabled ?? null,
        };
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Room tools.");
    } finally {
      setToolsLoading(false);
    }
  }, [canViewSupport, canonicalRoomId]);

  useEffect(() => {
    void refreshRoomTools();
  }, [refreshRoomTools]);

  useEffect(() => {
    if (!canonicalRoomId) {
      pollDraftHydratedRoomRef.current = null;
      setPollDraftQuestion("");
      setPollDraftOptions(createDefaultPollDraftOptions());
      setSupportGoalDraft("");
      return;
    }

    if (pollDraftHydratedRoomRef.current === canonicalRoomId) {
      return;
    }

    const snapshotQuestion = pollSnapshot?.question?.trim() ?? "";
    const snapshotOptions = (pollSnapshot?.options ?? [])
      .map((option) => option.text.trim())
      .filter((text) => text.length > 0)
      .slice(0, 4);

    const seededOptions = [...snapshotOptions];
    if (seededOptions.length === 0) {
      seededOptions.push("Yes", "No");
    }
    while (seededOptions.length < 4) {
      seededOptions.push("");
    }

    setPollDraftQuestion(snapshotQuestion);
    setPollDraftOptions(seededOptions);
    pollDraftHydratedRoomRef.current = canonicalRoomId;
  }, [canonicalRoomId, pollSnapshot?.options, pollSnapshot?.question]);

  useEffect(() => {
    if (!canonicalRoomId) {
      setSupportGoalDraft("");
      return;
    }

    if (typeof supportSnapshot?.goalCents === "number" && supportSnapshot.goalCents > 0) {
      setSupportGoalDraft(String(supportSnapshot.goalCents / 100));
      return;
    }

    setSupportGoalDraft("");
  }, [canonicalRoomId, supportSnapshot?.goalCents]);

  useEffect(() => {
    if (!canonicalRoomId) {
      setQnaAnswerQuestionId(null);
      setQnaAnswerDraft("");
      return;
    }

    if (!activeQnaMoment) {
      setQnaAnswerQuestionId(null);
      setQnaAnswerDraft("");
    }
  }, [activeQnaMoment, canonicalRoomId]);

  useEffect(() => {
    if (!canonicalRoomId || !hasLegacyOverlayMoment) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await endActiveRoomMoment(canonicalRoomId);
      } catch {
        // Best-effort cleanup of old generic overlay moments.
      } finally {
        if (cancelled) {
          return;
        }

        setRuntime((current) => ({
          ...current,
          activeMoment: null,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canonicalRoomId, hasLegacyOverlayMoment]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleGoLive = useCallback(async () => {
    if (!canonicalRoomId || !canStartDropIn || busyAction !== null || hasActiveMoment) {
      return;
    }

    const attemptId = goLiveAttemptRef.current + 1;
    goLiveAttemptRef.current = attemptId;

    setBusyAction("start");
    setError(null);
    setNotice(null);
    try {
      const nextMoment = await startLiveVideoDropInMoment({ roomId: canonicalRoomId });
      if (goLiveAttemptRef.current !== attemptId) {
        return;
      }

      setRuntime((current) => ({
        ...current,
        activeMoment: nextMoment,
      }));
      setNotice("You're live! Fans will see the broadcast.");
    } catch (nextError) {
      if (goLiveAttemptRef.current !== attemptId) {
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Could not start live.");
    } finally {
      if (goLiveAttemptRef.current === attemptId) {
        setBusyAction(null);
      }
    }
  }, [busyAction, canonicalRoomId, canStartDropIn, hasActiveMoment]);

  const handleEndLive = useCallback(async () => {
    if (!canonicalRoomId || !canEndDropIn || busyAction !== null) return;

    if (!activeLiveVideoMoment) {
      setNotice("No live broadcast is active.");
      return;
    }

    setBusyAction("end");
    setError(null);
    setNotice(null);
    try {
      await endActiveRoomMoment(canonicalRoomId);
      setRuntime((current) => ({
        ...current,
        activeMoment: null,
      }));
      setNotice("Live broadcast ended.");
    } catch (nextError) {
      if (
        nextError instanceof CreatorApiError &&
        (nextError.status === 404 || nextError.status === 409 || nextError.status === 410)
      ) {
        setRuntime((current) => ({
          ...current,
          activeMoment: null,
        }));
        setNotice("Live broadcast already ended.");
        return;
      }

      setError(nextError instanceof Error ? nextError.message : "Could not end live.");
    } finally {
      setBusyAction(null);
    }
  }, [activeLiveVideoMoment, busyAction, canonicalRoomId, canEndDropIn]);

  const handleStartQna = useCallback(async () => {
    if (!canonicalRoomId || !canManageInteractiveMoments || busyAction !== null || hasActiveMoment) {
      if (hasActiveMoment && !activeQnaMoment) {
        setNotice("End the active moment before starting Q&A.");
      }
      return;
    }

    setBusyAction("qna");
    setError(null);
    setNotice(null);
    try {
      await activateRoomQna(canonicalRoomId);
      await refreshRoomTools();
      setNotice("Q&A moment started.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not start Q&A.");
    } finally {
      setBusyAction(null);
    }
  }, [activeQnaMoment, busyAction, canManageInteractiveMoments, canonicalRoomId, hasActiveMoment, refreshRoomTools]);

  const handleCloseQna = useCallback(async () => {
    if (!canonicalRoomId || !canManageInteractiveMoments || busyAction !== null) {
      return;
    }

    if (!activeQnaMoment) {
      setNotice("No active Q&A to close.");
      return;
    }

    setBusyAction("qna-close");
    setError(null);
    setNotice(null);
    try {
      await deactivateRoomQna(canonicalRoomId);
      await refreshRoomTools();
      setNotice("Q&A closed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not close Q&A.");
    } finally {
      setBusyAction(null);
    }
  }, [activeQnaMoment, busyAction, canManageInteractiveMoments, canonicalRoomId, refreshRoomTools]);

  const handleStartPoll = useCallback(async () => {
    if (!canonicalRoomId || !canManageInteractiveMoments || busyAction !== null || hasActiveMoment) {
      if (hasActiveMoment && !activePollMoment) {
        setNotice("End the active moment before starting a poll.");
      }
      return;
    }

    setBusyAction("poll");
    setError(null);
    setNotice(null);
    try {
      const nextQuestion = pollDraftQuestion.trim();
      if (nextQuestion.length === 0) {
        setNotice("Add a poll question before starting.");
        return;
      }

      const nextOptions = pollDraftOptions
        .map((option) => option.trim())
        .filter((text) => text.length > 0)
        .slice(0, 4);

      if (nextOptions.length < 2) {
        setNotice("Add at least two poll options before starting.");
        return;
      }

      await createRoomPoll({
        roomId: canonicalRoomId,
        question: nextQuestion,
        options: nextOptions,
        revealResultsAfterVote: true,
      });
      await refreshRoomTools();
      setNotice("Poll moment started.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not start poll.");
    } finally {
      setBusyAction(null);
    }
  }, [activePollMoment, busyAction, canManageInteractiveMoments, canonicalRoomId, hasActiveMoment, pollDraftOptions, pollDraftQuestion, refreshRoomTools]);

  const handleClosePoll = useCallback(async () => {
    if (!canonicalRoomId || !canManageInteractiveMoments || busyAction !== null) {
      return;
    }

    const activePollId = pollSnapshot?.activePollId;
    if (!activePollId) {
      setNotice("No active poll to close.");
      return;
    }

    setBusyAction("poll-close");
    setError(null);
    setNotice(null);
    try {
      await closeRoomPoll({ roomId: canonicalRoomId, pollId: activePollId });
      await refreshRoomTools();
      setNotice("Poll closed.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not close poll.");
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, canManageInteractiveMoments, canonicalRoomId, pollSnapshot?.activePollId, refreshRoomTools]);

  const handleEnableSupport = useCallback(async () => {
    if (!canonicalRoomId || !canActivateSupport || busyAction !== null) {
      return;
    }

    const normalizedDraft = supportGoalDraft.trim();
    let nextGoalCents: number | null = null;
    if (normalizedDraft.length > 0) {
      const parsedGoal = Number.parseFloat(normalizedDraft);
      if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
        setNotice("Enter a valid support goal amount.");
        return;
      }
      nextGoalCents = Math.round(parsedGoal * 100);
    }

    setBusyAction("support");
    setError(null);
    setNotice(null);
    try {
      const nextSupport = await activateRoomSupport({
        roomId: canonicalRoomId,
        enabled: true,
        goalCents: nextGoalCents,
      });
      setSupportSnapshot(nextSupport);
      await refreshRoomTools();
      setNotice("Support jar is live.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not enable support.");
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, canActivateSupport, canonicalRoomId, refreshRoomTools, supportGoalDraft]);

  const handleDisableSupport = useCallback(async () => {
    if (!canonicalRoomId || !canActivateSupport || busyAction !== null) {
      return;
    }

    setBusyAction("support-close");
    setError(null);
    setNotice(null);
    try {
      const nextSupport = await activateRoomSupport({
        roomId: canonicalRoomId,
        enabled: false,
        goalCents: null,
      });
      setSupportSnapshot(nextSupport);
      await refreshRoomTools();
      setNotice("Support jar turned off.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not disable support.");
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, canActivateSupport, canonicalRoomId, refreshRoomTools]);

  const handleAnswerQuestion = useCallback(async (question: RoomQuestionSnapshotItem) => {
    if (!canonicalRoomId || busyAction !== null) {
      return;
    }

    const answerText = qnaAnswerDraft.trim();
    if (answerText.length === 0) {
      setNotice("Write an answer before sending.");
      return;
    }

    setBusyAction("qna");
    setError(null);
    setNotice(null);
    try {
      await answerRoomQuestion({
        roomId: canonicalRoomId,
        questionId: question.id,
        answerText,
      });
      setQnaAnswerQuestionId(null);
      setQnaAnswerDraft("");
      await refreshRoomTools();
      setNotice("Answer published.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not publish answer.");
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, canonicalRoomId, qnaAnswerDraft, refreshRoomTools]);

  // ── Header subtitle ────────────────────────────────────────────────────

  const headerSubtitle = useMemo(() => {
    if (activeLiveVideoMoment) {
      return `Live now · ${listenerCount} watching`;
    }
    if (hasActiveMoment) {
      const label = stageLabel(effectiveActiveMoment);
      return label ? `${label} · ${listenerCount} here` : `${listenerCount} here`;
    }
    if (listenerCount > 0) {
      return `${listenerCount} listener${listenerCount === 1 ? "" : "s"} here`;
    }
    return "Room is open";
  }, [activeLiveVideoMoment, effectiveActiveMoment, hasActiveMoment, listenerCount]);

  const controlTabs: {
    mode: RoomControlMode;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { mode: "live", label: "Live", icon: "videocam" },
    { mode: "qa", label: "Q&A", icon: "help-circle-outline" },
    { mode: "poll", label: "Poll", icon: "bar-chart-outline" },
    { mode: "support", label: "Support", icon: "sparkles-outline" },
  ];

  const qnaQuestions = qnaSnapshot?.questions.slice(0, 3) ?? [];
  const pollOptions = pollSnapshot?.options.slice(0, 4) ?? [];

  const updatePollDraftOption = useCallback((index: number, nextText: string) => {
    setPollDraftOptions((current) => {
      const next = [...current];
      while (next.length < 4) {
        next.push("");
      }
      next[index] = nextText;
      return next.slice(0, 4);
    });
  }, []);

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenShell title="Live Room" subtitle="Opening your Room…">
        <Panel>
          <ActivityIndicator color={tokens.colors.accent} />
        </Panel>
      </ScreenShell>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────

  if (!detail || !entry) {
    return (
      <ScreenShell
        title="Room unavailable"
        subtitle="Your Room could not be opened."
        actions={<PillButton label="Back" onPress={() => router.back()} />}
      >
        {error ? <Panel title="Something went wrong" description={error} /> : null}
        <PillButton label="Try again" tone="accent" onPress={() => void load()} />
      </ScreenShell>
    );
  }

  // ── Production Room screen ──────────────────────────────────────────────

  return (
    <ScreenShell
      title=""
      headerTitle={detail.album.title}
      headerSubtitle={headerSubtitle}
    >
      {/* ── Notices & errors ─────────────────────────────────────────── */}
      {error ? <Panel title="Something went wrong" description={error} /> : null}
      {notice ? <Panel title="Room updated" description={notice} /> : null}

      <View style={styles.heroCard}>
        <LinearGradient
          colors={[
            "rgba(0, 0, 0, 0.18)",
            "rgba(7, 10, 16, 0.72)",
            "rgba(7, 10, 16, 0.96)",
          ]}
          style={StyleSheet.absoluteFillObject}
        />
        {detail.album.artworkUrl ? (
          <Image
            source={{ uri: detail.album.artworkUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={220}
          />
        ) : null}
        <BlurView
          intensity={52}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroGlow} />
        <View style={styles.heroContent}>
          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, activeLiveVideoMoment && styles.heroBadgeLive]}>
              <View
                style={[
                  styles.heroBadgeDot,
                  { backgroundColor: activeLiveVideoMoment ? tokens.colors.success : tokens.colors.accent },
                ]}
              />
              <Text style={styles.heroBadgeLabel}>
                {activeLiveVideoMoment ? "Live Room" : hasActiveMoment ? "Active Room" : "Room Control"}
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="people-outline" size={13} color={tokens.colors.textPrimary} />
              <Text style={styles.heroBadgeLabel}>{listenerCount} here</Text>
            </View>
          </View>

          <View style={styles.heroArtworkFrame}>
            <View style={styles.heroArtworkInner}>
              {detail.album.artworkUrl ? (
                <Image
                  source={{ uri: detail.album.artworkUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <LinearGradient
                  colors={["rgba(0,179,166,0.95)", "rgba(121,201,107,0.9)", "rgba(0,175,193,0.92)"]}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <View style={styles.heroArtworkOverlay} />
              <Text style={styles.heroArtworkInitials}>{getRoomInitials(detail.album.title)}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{detail.album.title}</Text>
          <Text style={styles.heroSubtitle}>
            {activeLiveVideoMoment ? "Room is live" : "Room is open"}
          </Text>
          <Text style={styles.heroDescription}>
            {listenerCount} listener{listenerCount === 1 ? "" : "s"} here · {hasActiveMoment ? "Moment running now" : "Choose a moment to start"}
          </Text>
        </View>
      </View>

      <View style={styles.controlStrip}>
        {controlTabs.map((tab) => (
          <AnimatedPressable
            key={tab.mode}
            style={[
              styles.controlTab,
              activeControl === tab.mode && styles.controlTabActive,
            ]}
            onPress={() => setActiveControl(tab.mode)}
            haptic="light"
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeControl === tab.mode ? tokens.colors.bgInk : tokens.colors.textSecondary}
            />
            <Text
              style={[
                styles.controlTabLabel,
                activeControl === tab.mode && styles.controlTabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      <View style={styles.stageCard}>
        {activeControl === "live" ? (
          <>
            <View style={styles.stageHeader}>
              <Ionicons name="videocam" size={18} color={tokens.colors.danger} />
              <Text style={styles.stageTitle}>Go Live video</Text>
            </View>
            <Text style={styles.stageSubtitle}>
              {activeLiveVideoMoment
                ? `${listenerCount} fan${listenerCount === 1 ? "" : "s"} watching right now`
                : hasActiveMoment
                  ? "A live moment is already active in this room"
                  : "Drop live video into the room without leaving the room feel behind."}
            </Text>

            <View style={styles.broadcastFrame}>
              <ArtistBroadcastSurface
                roomId={canonicalRoomId ?? ""}
                moment={effectiveActiveMoment}
                enabled={canStartDropIn}
                onEnded={() => {
                  setRuntime((current) => ({
                    ...current,
                    activeMoment: null,
                  }));
                  setNotice("Live broadcast ended.");
                }}
              />
            </View>

            <View style={styles.liveActions}>
              <AnimatedPressable
                style={[
                  styles.ctaButton,
                  styles.ctaGoLive,
                  (!canStartDropIn || isBusy) && styles.ctaDisabled,
                ]}
                onPress={handleGoLive}
                disabled={isBusy || !canStartDropIn}
                haptic="light"
              >
                <Ionicons name="videocam" size={20} color={tokens.colors.textPrimary} />
                <Text style={styles.ctaLabel}>
                  {busyAction === "start" ? "Going live…" : "Go Live"}
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.ctaButton, styles.ctaEndLive]}
                onPress={handleEndLive}
                disabled={isBusy || !canEndDropIn}
                haptic="light"
              >
                <Ionicons name="stop-circle-outline" size={20} color={tokens.colors.textPrimary} />
                <Text style={styles.ctaLabel}>
                  {busyAction === "end" ? "Ending…" : "End Live"}
                </Text>
              </AnimatedPressable>
            </View>

            {!canStartDropIn ? (
              <Text style={styles.permissionHint}>
                Live controls are not available for this Room right now.
              </Text>
            ) : null}
          </>
        ) : activeControl === "qa" ? (
          <>
            <View style={styles.stageHeader}>
              <Ionicons name="help-circle-outline" size={18} color={tokens.colors.accent} />
              <Text style={styles.stageTitle}>Q&A moment</Text>
            </View>
            <Text style={styles.stageSubtitle}>
              {qnaSnapshot?.enabled
                ? `${qnaSnapshot.openCount} open · ${qnaSnapshot.answeredCount} answered · ${qnaSnapshot.questionCount} total`
                : "Questions are quiet right now. Drop this mode in when you want to respond live."}
            </Text>

            <View style={styles.modeList}>
              {qnaQuestions.length > 0 ? (
                qnaQuestions.map((question) => (
                  <View key={question.id} style={styles.questionCard}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionAuthor}>{question.authorDisplayName}</Text>
                      <View style={styles.questionBadge}>
                        <Text style={styles.questionBadgeLabel}>{formatQuestionStatus(question)}</Text>
                      </View>
                    </View>
                    <Text style={styles.questionText}>{question.text}</Text>
                    {question.answerText ? (
                      <Text style={styles.questionAnswer}>{question.answerText}</Text>
                    ) : null}
                    {activeQnaMoment && question.status !== "answered" ? (
                      <View style={styles.qnaAnswerComposer}>
                        {qnaAnswerQuestionId === question.id ? (
                          <>
                            <TextInput
                              value={qnaAnswerDraft}
                              onChangeText={setQnaAnswerDraft}
                              placeholder="Type your answer"
                              placeholderTextColor={tokens.colors.textMuted}
                              style={styles.qnaAnswerInput}
                              maxLength={500}
                              multiline
                            />
                            <View style={styles.qnaAnswerActionsRow}>
                              <PillButton
                                label="Cancel"
                                tone="subtle"
                                onPress={() => {
                                  setQnaAnswerQuestionId(null);
                                  setQnaAnswerDraft("");
                                }}
                                disabled={busyAction !== null}
                              />
                              <PillButton
                                label={busyAction === "qna" ? "Sending..." : "Publish answer"}
                                tone="accent"
                                onPress={() => void handleAnswerQuestion(question)}
                                disabled={busyAction !== null || qnaAnswerDraft.trim().length === 0}
                              />
                            </View>
                          </>
                        ) : (
                          <PillButton
                            label="Answer"
                            tone="subtle"
                            onPress={() => {
                              setQnaAnswerQuestionId(question.id);
                              setQnaAnswerDraft("");
                            }}
                            disabled={busyAction !== null}
                          />
                        )}
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyStageCard}>
                  <Ionicons name="chatbubbles-outline" size={24} color={tokens.colors.textMuted} />
                  <Text style={styles.emptyStageText}>No fan questions yet. Keep Q&A open to collect listener submissions.</Text>
                </View>
              )}
            </View>

            <View style={styles.liveActions}>
              {activeQnaMoment ? (
                <AnimatedPressable
                  style={[styles.ctaButton, styles.ctaEndLive, (isBusy || !canManageInteractiveMoments) && styles.ctaDisabled]}
                  onPress={handleCloseQna}
                  disabled={isBusy || !canManageInteractiveMoments}
                  haptic="light"
                >
                  <Ionicons name="stop-circle-outline" size={18} color={tokens.colors.textPrimary} />
                  <Text style={styles.ctaLabel}>{busyAction === "qna-close" ? "Closing..." : "Close Q&A"}</Text>
                </AnimatedPressable>
              ) : (
                <AnimatedPressable
                  style={[styles.ctaButton, styles.ctaMoment, (!canManageInteractiveMoments || isBusy || hasActiveMoment) && styles.ctaDisabled]}
                  onPress={handleStartQna}
                  disabled={!canManageInteractiveMoments || isBusy || hasActiveMoment}
                  haptic="light"
                >
                  <Ionicons name="play-circle-outline" size={18} color={tokens.colors.textPrimary} />
                  <Text style={styles.ctaLabel}>{busyAction === "qna" ? "Starting..." : "Start Q&A"}</Text>
                </AnimatedPressable>
              )}
              <PillButton label={toolsLoading ? "Refreshing..." : "Refresh Q&A"} tone="subtle" onPress={() => void refreshRoomTools()} disabled={toolsLoading} />
            </View>
          </>
        ) : activeControl === "poll" ? (
          <>
            <View style={styles.stageHeader}>
              <Ionicons name="bar-chart-outline" size={18} color={tokens.colors.accent} />
              <Text style={styles.stageTitle}>Poll moment</Text>
            </View>
            <Text style={styles.stageSubtitle}>
              {pollSnapshot?.activePollId
                ? `${pollSnapshot.totalVotes} total votes across ${pollOptions.length} option${pollOptions.length === 1 ? "" : "s"}`
                : "No active poll is running. This mode is ready when you want quick room feedback."}
            </Text>

            <View style={styles.modeList}>
              {pollSnapshot?.activePollId ? (
                <View style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionAuthor}>Active poll</Text>
                    <View style={styles.questionBadge}>
                      <Text style={styles.questionBadgeLabel}>{pollSnapshot.totalVotes} votes</Text>
                    </View>
                  </View>
                  <Text style={styles.questionText}>{pollSnapshot.question ?? "Untitled poll"}</Text>
                  <View style={styles.pollOptions}>
                    {pollOptions.map((option) => (
                      <View key={option.id} style={styles.pollOptionRow}>
                        <Text style={styles.pollOptionText}>{option.text}</Text>
                        <Text style={styles.pollOptionCount}>{option.voteCount}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.pollDraftCard}>
                  <TextInput
                    value={pollDraftQuestion}
                    onChangeText={setPollDraftQuestion}
                    placeholder="Quick poll question"
                    placeholderTextColor={tokens.colors.textMuted}
                    style={styles.pollDraftInput}
                    maxLength={180}
                  />
                  <TextInput
                    value={pollDraftOptions[0] ?? ""}
                    onChangeText={(text) => updatePollDraftOption(0, text)}
                    placeholder="Choice 1"
                    placeholderTextColor={tokens.colors.textMuted}
                    style={styles.pollDraftInput}
                    maxLength={80}
                  />
                  <TextInput
                    value={pollDraftOptions[1] ?? ""}
                    onChangeText={(text) => updatePollDraftOption(1, text)}
                    placeholder="Choice 2"
                    placeholderTextColor={tokens.colors.textMuted}
                    style={styles.pollDraftInput}
                    maxLength={80}
                  />
                </View>
              )}
            </View>

            <View style={styles.liveActions}>
              {activePollMoment ? (
                <AnimatedPressable
                  style={[styles.ctaButton, styles.ctaEndLive, (isBusy || !canManageInteractiveMoments) && styles.ctaDisabled]}
                  onPress={handleClosePoll}
                  disabled={isBusy || !canManageInteractiveMoments}
                  haptic="light"
                >
                  <Ionicons name="stop-circle-outline" size={18} color={tokens.colors.textPrimary} />
                  <Text style={styles.ctaLabel}>{busyAction === "poll-close" ? "Closing..." : "Close Poll"}</Text>
                </AnimatedPressable>
              ) : (
                <AnimatedPressable
                  style={[styles.ctaButton, styles.ctaMoment, (!canManageInteractiveMoments || isBusy || hasActiveMoment) && styles.ctaDisabled]}
                  onPress={handleStartPoll}
                  disabled={!canManageInteractiveMoments || isBusy || hasActiveMoment}
                  haptic="light"
                >
                  <Ionicons name="play-circle-outline" size={18} color={tokens.colors.textPrimary} />
                  <Text style={styles.ctaLabel}>{busyAction === "poll" ? "Starting..." : "Start Poll"}</Text>
                </AnimatedPressable>
              )}
              <PillButton label={toolsLoading ? "Refreshing..." : "Refresh Polls"} tone="subtle" onPress={() => void refreshRoomTools()} disabled={toolsLoading} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.stageHeader}>
              <Ionicons name="sparkles-outline" size={18} color={tokens.colors.accent} />
              <Text style={styles.stageTitle}>Support moment</Text>
            </View>
            <Text style={styles.stageSubtitle}>
              {supportEnabled
                ? `${supportSnapshot?.backerCount ?? 0} supporter${(supportSnapshot?.backerCount ?? 0) === 1 ? "" : "s"} · $${(supportTotalCents / 100).toFixed(2)} raised`
                : "Enable your Support Jar before inviting fans to back this room."}
            </Text>

            <View style={styles.modeList}>
              {canViewSupport ? (
                <View style={styles.pollDraftCard}>
                  <View style={styles.supportHeaderRow}>
                    <Text style={styles.pollDraftLabel}>Current total</Text>
                    <Text style={styles.supportAmountText}>${(supportTotalCents / 100).toFixed(2)}</Text>
                  </View>
                  <View style={styles.supportHeaderRow}>
                    <Text style={styles.pollDraftLabel}>Goal</Text>
                    <Text style={styles.supportMetaText}>
                      {supportGoalCents && supportGoalCents > 0 ? `$${(supportGoalCents / 100).toFixed(2)}` : "No goal set"}
                    </Text>
                  </View>
                  <View style={styles.supportProgressTrack}>
                    <View style={[styles.supportProgressFill, { width: `${supportProgressPercent}%` }]} />
                  </View>
                  <Text style={styles.permissionHint}>{Math.round(supportProgressPercent)}% of goal reached</Text>
                  <Text style={styles.pollDraftLabel}>Goal amount (USD)</Text>
                  <TextInput
                    value={supportGoalDraft}
                    onChangeText={setSupportGoalDraft}
                    placeholder="500"
                    placeholderTextColor={tokens.colors.textMuted}
                    style={styles.pollDraftInput}
                    keyboardType="decimal-pad"
                    editable={busyAction === null}
                  />
                </View>
              ) : (
                <View style={styles.emptyStageCard}>
                  <Ionicons name="sparkles-outline" size={24} color={tokens.colors.textMuted} />
                  <Text style={styles.emptyStageText}>Support visibility is not enabled for this room.</Text>
                </View>
              )}
            </View>

            <View style={styles.liveActions}>
              {supportEnabled ? (
                <>
                  <AnimatedPressable
                    style={[styles.ctaButton, styles.ctaMoment, (!canActivateSupport || isBusy) && styles.ctaDisabled]}
                    onPress={() => void handleEnableSupport()}
                    disabled={!canActivateSupport || isBusy}
                    haptic="light"
                  >
                    <Ionicons name="create-outline" size={18} color={tokens.colors.textPrimary} />
                    <Text style={styles.ctaLabel}>{busyAction === "support" ? "Saving..." : "Update Goal"}</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[styles.ctaButton, styles.ctaEndLive, (!canActivateSupport || isBusy) && styles.ctaDisabled]}
                    onPress={() => void handleDisableSupport()}
                    disabled={!canActivateSupport || isBusy}
                    haptic="light"
                  >
                    <Ionicons name="stop-circle-outline" size={18} color={tokens.colors.textPrimary} />
                    <Text style={styles.ctaLabel}>{busyAction === "support-close" ? "Disabling..." : "Disable"}</Text>
                  </AnimatedPressable>
                </>
              ) : (
                <AnimatedPressable
                  style={[styles.ctaButton, styles.ctaMoment, (!canActivateSupport || isBusy) && styles.ctaDisabled]}
                  onPress={() => void handleEnableSupport()}
                  disabled={!canActivateSupport || isBusy}
                  haptic="light"
                >
                  <Ionicons name="play-circle-outline" size={18} color={tokens.colors.textPrimary} />
                  <Text style={styles.ctaLabel}>{busyAction === "support" ? "Starting..." : "Start Goal"}</Text>
                </AnimatedPressable>
              )}
              <PillButton label={toolsLoading ? "Refreshing..." : "Refresh Support"} tone="subtle" onPress={() => void refreshRoomTools()} disabled={toolsLoading} />
            </View>
            {!canActivateSupport ? (
              <Text style={styles.permissionHint}>
                Support activation requires room management and authorized payouts.
              </Text>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.audienceCard}>
        <View style={styles.audienceHeaderRow}>
          <Text style={styles.sectionTitle}>Audience in room</Text>
          <PillButton
            label={toolsLoading ? "Refreshing..." : "Refresh"}
            tone="subtle"
            onPress={() => void refreshRoomTools()}
            disabled={toolsLoading}
          />
        </View>
        {listeners.length === 0 ? (
          <View style={styles.emptyAudience}>
            <Ionicons name="people-outline" size={28} color={tokens.colors.textMuted} />
            <Text style={styles.emptyAudienceText}>
              Your Room is open. Fans will appear here in real-time when they enter.
            </Text>
          </View>
        ) : (
          <View style={styles.audienceList}>
            {listeners.map((fan) => (
              <View key={fan.uid} style={styles.fanRow}>
                <View style={styles.fanAvatar}>
                  <Text style={styles.fanAvatarLetter}>
                    {fan.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.fanInfo}>
                  <Text style={styles.fanName} numberOfLines={1}>
                    {fan.displayName}
                  </Text>
                  {fan.lastSeenAt ? (
                    <Text style={styles.fanMeta}>
                      {formatRelativeTime(new Date(fan.lastSeenAt * 1000).toISOString())}
                    </Text>
                  ) : null}
                </View>
                <AnimatedPressable
                  style={styles.audienceInviteButton}
                  onPress={() => setNotice(`Invite flow focused on ${fan.displayName}.`)}
                  haptic="light"
                >
                  <Text style={styles.audienceInviteLabel}>Invite</Text>
                </AnimatedPressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Status bar ──────────────────────────────────────────────────────────
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  statusTextLive: {
    color: tokens.colors.danger,
  },
  listenerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  listenerBadgeText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Hero / control surface ─────────────────────────────────────────────
  heroCard: {
    borderRadius: 28,
    overflow: "hidden",
    minHeight: 420,
    backgroundColor: tokens.colors.bgInk,
    justifyContent: "center",
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },
  heroContent: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 26,
    alignItems: "center",
    gap: 12,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeLive: {
    backgroundColor: "rgba(32,130,79,0.24)",
  },
  heroBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBadgeLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroArtworkFrame: {
    width: 138,
    height: 138,
    borderRadius: 26,
    padding: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  heroArtworkInner: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  heroArtworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,10,16,0.18)",
  },
  heroArtworkInitials: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.4,
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -1.4,
    textAlign: "center",
  },
  heroSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  heroDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 320,
  },
  controlStrip: {
    flexDirection: "row",
    gap: 8,
  },
  controlTab: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(13,20,30,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  controlTabActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(0,179,166,0.55)",
  },
  controlTabLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  controlTabLabelActive: {
    color: tokens.colors.textPrimary,
  },

  // ── Stage card ──────────────────────────────────────────────────────────
  stageCard: {
    marginTop: -10,
    backgroundColor: "rgba(10,16,24,0.88)",
    borderRadius: tokens.radiusSystem.container,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 20,
    gap: 16,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stageIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  stageHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  stageTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  stageSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  broadcastFrame: {
    borderRadius: tokens.radiusSystem.section,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgInk,
  },
  liveActions: {
    flexDirection: "row",
    gap: 10,
  },

  // ── CTA buttons ─────────────────────────────────────────────────────────
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: tokens.radiusSystem.control,
    paddingHorizontal: 20,
  },
  ctaGoLive: {
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.accent,
  },
  ctaEndLive: {
    backgroundColor: tokens.colors.bgElevated,
  },
  ctaMoment: {
    backgroundColor: tokens.colors.bgElevated,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  permissionHint: {
    color: tokens.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },

  modeList: {
    gap: 10,
  },
  questionCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 8,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  questionAuthor: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    flex: 1,
  },
  questionBadge: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: tokens.colors.bgElevated,
  },
  questionBadgeLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
  },
  questionText: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  questionAnswer: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyStageCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  emptyStageText: {
    color: tokens.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 260,
  },
  pollOptions: {
    gap: 8,
  },
  pollOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pollOptionText: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  pollOptionCount: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  pollDraftCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 10,
  },
  pollDraftLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pollDraftInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: tokens.colors.bgElevated,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  supportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  supportAmountText: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  supportMetaText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  supportProgressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  supportProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: tokens.colors.accent,
  },
  qnaAnswerComposer: {
    gap: 8,
  },
  qnaAnswerInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: tokens.colors.bgElevated,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  qnaAnswerActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  inviteAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  inviteAvatarLetter: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  inviteName: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  inviteMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },

  // ── Section header ──────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCount: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },

  sectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  // ── Tools card ─────────────────────────────────────────────────────────
  toolsCard: {
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.container,
    padding: 14,
  },
  toolsBlur: {
    gap: 10,
  },
  toolRow: {
    gap: 6,
  },
  toolLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  toolValue: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  toolsError: {
    color: tokens.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Audience card ───────────────────────────────────────────────────────
  audienceCard: {
    backgroundColor: "rgba(12,18,28,0.84)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  audienceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  emptyAudience: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },
  emptyAudienceText: {
    color: tokens.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 260,
  },
  audienceList: {
    gap: 12,
  },
  fanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fanAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  fanAvatarLetter: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  fanInfo: {
    flex: 1,
    gap: 2,
  },
  fanName: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  fanMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
  },
  audienceInviteButton: {
    minHeight: 32,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,179,166,0.18)",
  },
  audienceInviteLabel: {
    color: tokens.colors.accentLight,
    fontSize: 12,
    fontWeight: "800",
  },
});
