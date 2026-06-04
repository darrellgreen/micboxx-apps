import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RoomMomentState } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { ArtistDropInBanner } from "@/features/rooms/components/ArtistDropInBanner";
import { RoomChatPanel } from "@/features/rooms/components/RoomChatPanel";
import { RoomHeader } from "@/features/rooms/components/RoomHeader";
import { RoomNowPlaying } from "@/features/rooms/components/RoomNowPlaying";
import { RoomPresenceBar } from "@/features/rooms/components/RoomPresenceBar";
import { useMobileRoom } from "@/features/rooms/hooks/useMobileRoom";
import { LiveVideoTakeoverSurface } from "@/features/rooms/live-video/LiveVideoTakeoverSurface";
import { useGetAlbumPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import { Skeleton } from "@micboxx/ui";

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AlbumRoomScreen() {
  const { signIn, isSigningIn, session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = normalizeParam(params.slug);
  const albumQuery = useGetAlbumPageQuery(slug ?? "", { skip: !slug });
  const playerQueue = usePlayerQueue();
  const room = useMobileRoom({
    releaseIdentifier: slug ?? null,
    releaseTracks: albumQuery.data?.tracks ?? [],
  });

  useEffect(() => {
    return () => {
      if (playerQueue.context?.id?.startsWith("room:")) {
        void playerQueue.clearQueue();
      }
    };
  }, [playerQueue.clearQueue, playerQueue.context?.id]);

  const capabilities = room.capabilities;
  const artworkUrl = albumQuery.data?.album.artworkUrl ?? null;
  const releaseTitle = room.release?.title ?? albumQuery.data?.album.title ?? "Release Room";
  const artistName =
    room.release?.artist?.display_name?.trim() ||
    room.release?.artist?.username?.trim() ||
    albumQuery.data?.album.artist?.displayName?.trim() ||
    albumQuery.data?.album.artist?.username?.trim() ||
    "Artist";
  const canShowComposerSupport = capabilities?.can_show_support === true && !room.isCurrentUserBlocked;
  const composerSupportDisabled =
    capabilities?.can_send_support !== true
    || (room.supportBalance?.available_amount_cents ?? 0) < 100;
  const activeOverlayMoment =
    room.activeMoment && (room.activeMoment.presentation === "overlay" || room.activeMoment.presentation === "banner")
      ? room.activeMoment
      : null;
  const activeStageMoment =
    room.activeMoment?.presentation === "stage_takeover" ? room.activeMoment : null;
  const liveVideoStageMoment = isLiveVideoStageTakeover(activeStageMoment)
    ? activeStageMoment
    : null;

  if (albumQuery.isLoading || room.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loading, { padding: 20, paddingTop: 60 }]}>
           <Skeleton width="100%" height={300} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!slug || albumQuery.error || room.error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <RoomHeader release={room.release} artistName={artistName} capabilities={capabilities} onBack={() => router.back()} />
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Unable to enter Room</Text>
          <Text style={styles.statusText}>{room.error ?? "The release could not be loaded right now."}</Text>
          <Pressable onPress={() => router.back()} style={styles.statusButton}>
            <Text style={styles.statusButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <RoomBackdrop artworkUrl={artworkUrl} />
      {liveVideoStageMoment ? (
        <LiveVideoTakeoverSurface
          roomId={room.room?.id ?? liveVideoStageMoment.roomId}
          moment={liveVideoStageMoment}
          artistName={artistName}
          accessToken={session?.accessToken ?? null}
          enabled={!room.isCurrentUserBlocked}
        />
      ) : activeStageMoment ? (
        <MomentStageBackdrop moment={activeStageMoment} />
      ) : null}
      <View style={styles.shell}>
        <RoomHeader release={room.release} artistName={artistName} capabilities={capabilities} onBack={() => router.back()} />

        {room.interactionError ? (
          <Pressable onPress={room.clearInteractionError} style={styles.notice}>
            <Text style={styles.noticeText}>{room.interactionError}</Text>
          </Pressable>
        ) : null}

        <ArtistDropInBanner
          artistPresence={capabilities?.can_view_artist_presence ? room.artistPresence : null}
          pinnedNote={room.pinnedNote}
          artistName={artistName}
        />
        {activeOverlayMoment && room.isMomentReconnecting ? (
          <View style={styles.reconnectingBannerWrap} pointerEvents="none">
            <Text style={styles.reconnectingBannerText}>Reconnecting...</Text>
          </View>
        ) : null}
        {activeOverlayMoment ? (
          <MomentOverlaySignal moment={activeOverlayMoment} artistName={artistName} />
        ) : null}
        <View style={styles.stage}>
          {liveVideoStageMoment ? null : activeStageMoment ? (
            <MomentStageChrome moment={activeStageMoment} artistName={artistName} />
          ) : (
            <RoomNowPlaying
              clockState={room.clockState}
              releaseTitle={releaseTitle}
              artistName={artistName}
              artworkUrl={artworkUrl}
              awakenedAt={room.room?.awakened_at ?? null}
              presenceCount={room.presence.length}
            />
          )}
          {!activeStageMoment && capabilities?.can_show_presence ? (
            <RoomPresenceBar presence={room.presence} />
          ) : null}
        </View>
        <RoomChatPanel
          messages={room.chat}
          currentUserUuid={room.currentUserUuid}
          canComment={capabilities?.can_comment === true}
          muted={room.isCurrentUserMuted}
          blocked={room.isCurrentUserBlocked}
          submitting={room.isSubmittingChat}
          onSend={room.sendChat}
          pinnedMessageText={room.pinnedMessage?.isPinned ? room.pinnedMessage.messageText : null}
          canReact={capabilities?.can_react === true && !room.isCurrentUserBlocked}
          canShowReactions={capabilities?.can_show_reactions === true}
          reactions={room.reactions}
          onReact={room.react}
          showSupportButton={canShowComposerSupport}
          supportButtonDisabled={composerSupportDisabled}
          isSigningIn={isSigningIn}
          onPressSignIn={() => {
            void signIn();
          }}
          onPressSupport={() => {
            if (!composerSupportDisabled) {
              void room.sendSupportFromBalance(100).catch(() => undefined);
            }
          }}
          artistPresenceActive={room.artistPresence?.isActive === true}
          variant="overlay"
        />
      </View>
    </SafeAreaView>
  );
}

function isLiveVideoStageTakeover(moment: RoomMomentState | null): moment is RoomMomentState {
  const sourceKind = typeof moment?.source?.kind === "string" ? String(moment.source.kind) : "";
  const metadata = moment?.metadata && typeof moment.metadata === "object"
    ? moment.metadata as Record<string, unknown>
    : null;
  const description = moment?.description?.toLowerCase() ?? "";
  const isLiveKitSource =
    sourceKind === "livekit_room" ||
    sourceKind === "livekitRoom" ||
    sourceKind.toLowerCase().includes("livekit");
  const isQaLiveVideoMoment =
    metadata?.qaHarness === "live-video-runtime" ||
    description.includes("livekit room moment") ||
    description.includes("live video");

  return moment?.type === "artist_video_drop_in" &&
    moment.presentation === "stage_takeover" &&
    (isLiveKitSource || isQaLiveVideoMoment);
}

function MomentOverlaySignal({
  moment,
  artistName,
}: {
  moment: RoomMomentState;
  artistName: string;
}) {
  const badgeLabel = getMomentBadgeLabel(moment.type);
  const title = moment.title ?? getMomentFallbackTitle(moment.type, artistName);

  return (
    <View pointerEvents="none" style={styles.overlayMomentSignalWrap}>
      <View style={styles.overlayMomentSignalCard}>
        <Text style={styles.overlayMomentSignalBadge}>{badgeLabel}</Text>
        <Text style={styles.overlayMomentSignalTitle}>{title}</Text>
        {moment.description ? (
          <Text style={styles.overlayMomentSignalDescription} numberOfLines={2}>{moment.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

function getMomentBadgeLabel(type: RoomMomentState["type"]): string {
  switch (type) {
    case "pinned_message":
      return "Pinned message";
    case "qa_opened":
      return "Q&A live";
    case "poll_opened":
      return "Poll live";
    case "support_goal_reached":
      return "Support milestone";
    default:
      return "Live Room moment";
  }
}

function getMomentFallbackTitle(type: RoomMomentState["type"], artistName: string): string {
  switch (type) {
    case "pinned_message":
      return `${artistName} pinned a message`;
    case "qa_opened":
      return "Q&A is open";
    case "poll_opened":
      return "A live poll is open";
    case "support_goal_reached":
      return "Support goal reached";
    default:
      return "Live Room moment";
  }
}

function MomentStageBackdrop({
  moment,
}: {
  moment: RoomMomentState;
}) {
  const sourceUrl = moment.source.url;
  const looksLikeImage = typeof sourceUrl === "string" && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(sourceUrl);
  const canRenderImage =
    typeof sourceUrl === "string" &&
    sourceUrl.length > 0 &&
    (moment.source.kind === "image" || looksLikeImage);

  return (
    <View pointerEvents="none" style={styles.liveVideoBackdrop}>
      {canRenderImage ? (
        <Image
          source={{ uri: sourceUrl }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={["#0c1017", "#1a1230", "#07110d"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View style={styles.liveVideoScrim} />
    </View>
  );
}

function MomentStageChrome({
  moment,
  artistName,
}: {
  moment: RoomMomentState;
  artistName: string;
}) {
  return (
    <View pointerEvents="none" style={styles.momentStageChrome}>
      <Text style={styles.momentEyebrow}>Live Room moment</Text>
      <Text style={styles.momentTitle}>{moment.title ?? `${artistName} is live`}</Text>
      {moment.description ? (
        <Text style={styles.momentDescription}>{moment.description}</Text>
      ) : null}
    </View>
  );
}

function RoomBackdrop({ artworkUrl }: { artworkUrl: string | null }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {artworkUrl ? (
        <Image
          source={{ uri: artworkUrl }}
          style={styles.backdropImage}
          contentFit="cover"
          blurRadius={34}
        />
      ) : (
        <LinearGradient
          colors={["#fff06b", "#f15f31", "#078c70"]}
          locations={[0, 0.44, 1]}
          start={{ x: 0.08, y: 0.12 }}
          end={{ x: 0.94, y: 0.96 }}
          style={styles.backdropFallback}
        />
      )}
      <View style={styles.backdropScrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06070a" },
  shell: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    zIndex: 2,
  },
  liveVideoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  liveVideoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  momentStageChrome: {
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 132,
  },
  momentEyebrow: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(61,220,132,0.14)",
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  momentTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    maxWidth: 300,
  },
  momentDescription: {
    color: "rgba(238,238,242,0.74)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
  loading: { flex: 1 },
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.34,
    transform: [{ scale: 1.16 }],
  },
  backdropFallback: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.38,
    transform: [{ scale: 1.14 }],
  },
  backdropScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,7,10,0.76)",
  },
  stage: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    justifyContent: "flex-start",
    paddingTop: 18,
    paddingBottom: 28,
  },
  overlayMomentSignalWrap: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
    zIndex: 30,
  },
  overlayMomentSignalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(6,7,10,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reconnectingBannerWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    alignItems: "center",
    zIndex: 4,
  },
  reconnectingBannerText: {
    color: "rgba(235,236,240,0.92)",
    backgroundColor: "rgba(8,11,16,0.68)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  overlayMomentSignalBadge: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(61,220,132,0.14)",
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  overlayMomentSignalTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
  },
  overlayMomentSignalDescription: {
    color: "rgba(238,238,242,0.76)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  notice: {
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  noticeText: { color: tokens.colors.textSecondary, fontSize: 13 },
  statusCard: {
    margin: 20,
    padding: 18,
    borderRadius: 8,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    gap: 10,
  },
  statusTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "800" },
  statusText: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  statusButton: { alignSelf: "flex-start", backgroundColor: tokens.colors.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  statusButtonText: { color: "#fff", fontWeight: "800" },
});
