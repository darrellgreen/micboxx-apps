import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef } from "react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
    ActivityIndicator,
    Alert,
    AppState,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { TrackRow } from "@/components/discover";
import { VerifiedBadge } from "@micboxx/ui";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/provider";
import {
    DetailRouteHeader,
    DetailStatusPanel,
} from "@/features/catalog/components/detail-shared";
import type { DetailActionItem } from "@/features/catalog/detail-models";
import {
    joinMetaParts,
    resolveAlbumRoute,
    resolveUserRoute,
} from "@micboxx/utils";
import { useDetailPlayback } from "@/features/catalog/hooks/useDetailPlayback";
import {
    buildTrackAccessContext,
    resolveTrackPlaybackState,
} from "@/features/catalog/track-access";
import { TrackWaveform } from "@/features/player/components/TrackWaveform";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { TrackComments } from "@/features/social/components/TrackComments";
import { useTrackSocialState } from "@/features/social/hooks/useTrackSocialState";
import {
  formatDuration,
  formatRelativeTime,
} from "@micboxx/api";
import { useGetTrackPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

export default function TrackDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const router = useRouter();
  const { session } = useAuth();
  const progressValue = useSharedValue(0);
  const trackAccessContext = useMemo(
    () => buildTrackAccessContext(session),
    [session],
  );

  const { data, isLoading, error, refetch } = useGetTrackPageQuery(
    slug ?? "",
    {
      skip: !slug,
    },
  );

  const track = data?.track;
  const queueTracks = track ? [track, ...(data?.relatedTracks ?? [])] : [];
  const { activeTrackId, isPlaying, playFromTrack, enqueueAll } =
    useDetailPlayback(
      queueTracks,
      {
        type: "track",
        slug: track?.slug ?? slug ?? null,
        title: track?.title ?? null,
      },
      trackAccessContext,
    );
  const { progressPercent } = useNowPlaying();

  const trackAccess = track
    ? resolveTrackPlaybackState(track, trackAccessContext)
    : null;
  const socialTrackUuid = track?.uuid ?? "";
  const socialTrackOwnerUid = track?.artist?.uuid ?? null;
  const socialTrackTitle = track?.title ?? "";
  const socialTrackHref = track?.href ?? null;
  const socialInitialComments = track?.stats.comments ?? 0;
  const socialInitialLikes = track?.stats.likes ?? 0;
  const socialInitialFavourites = track?.stats.favourites ?? 0;
  const pendingRefreshPolicyRef = useRef<
    "none" | "on_focus" | "after_web_return" | null
  >(null);
  const lastAppStateRef = useRef(AppState.currentState);
  const {
    configured: socialConfigured,
    authPending: socialAuthPending,
    likeCount,
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
  } = useTrackSocialState({
    trackUuid: socialTrackUuid,
    trackOwnerUid: socialTrackOwnerUid,
    trackTitle: socialTrackTitle,
    trackHref: socialTrackHref,
    initialComments: socialInitialComments,
    initialLikes: socialInitialLikes,
    initialFavourites: socialInitialFavourites,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const returnedToForeground =
        /inactive|background/.test(lastAppStateRef.current) &&
        nextAppState === "active";

      lastAppStateRef.current = nextAppState;

      if (!returnedToForeground || !pendingRefreshPolicyRef.current) {
        return;
      }

      pendingRefreshPolicyRef.current = null;
      void refetch();
    });

    return () => subscription.remove();
  }, [refetch]);

  useEffect(() => {
    if (activeTrackId !== null) {
      progressValue.value = withTiming(progressPercent, {
        duration: 240,
        easing: Easing.linear,
      });
      return;
    }

    progressValue.value = withTiming(0, {
      duration: 180,
      easing: Easing.linear,
    });
  }, [activeTrackId, progressPercent, progressValue]);

  useEffect(() => {
    if (!interactionError) {
      return;
    }

    Alert.alert("Social unavailable", interactionError, [
      {
        text: "OK",
        onPress: clearInteractionError,
      },
    ]);
  }, [clearInteractionError, interactionError]);

  async function handleShareTrack() {
    if (!track) {
      return;
    }

    const artistName = track.artist?.displayName ?? "Unknown artist";
    const shareUrl = env.micboxxWebBaseUrl
      ? `${env.micboxxWebBaseUrl.replace(/\/$/, "")}${track.href}`
      : null;
    const shareMessage = shareUrl
      ? `Listen to ${track.title} by ${artistName} on MicBoxx\n${shareUrl}`
      : `${track.title} by ${artistName} on MicBoxx`;

    try {
      await Share.share({
        title: `${track.title} • ${artistName}`,
        message: shareMessage,
        ...(shareUrl ? { url: shareUrl } : {}),
      });
    } catch {
      if (shareUrl) {
        await WebBrowser.openBrowserAsync(shareUrl, {
          controlsColor: tokens.colors.accent,
        });
        return;
      }

      Alert.alert(
        "Unable to share",
        "Sharing is not available on this device right now.",
      );
    }
  }

  if (!slug) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.page}>
          <DetailRouteHeader title="Track" />
          <DetailStatusPanel
            title="Track unavailable"
            body="No track slug was supplied for this route. Return to Home or Search and try again."
          />
          <View style={styles.stateActionsRow}>
            <Pressable
              onPress={() => router.replace("/(tabs)/home")}
              style={({ pressed }) => [
                styles.stateAction,
                styles.stateActionPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.stateActionPrimaryLabel}>Go home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!track || error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.page}>
          <DetailRouteHeader title="Track" />
          <DetailStatusPanel
            title="Unable to load track"
            body="This detail route could not be loaded right now. Try again from Home or Search."
          />
          <View style={styles.stateActionsRow}>
            <Pressable
              onPress={() => void refetch()}
              style={({ pressed }) => [
                styles.stateAction,
                styles.stateActionPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.stateActionPrimaryLabel}>Retry</Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/(tabs)/home")}
              style={({ pressed }) => [
                styles.stateAction,
                styles.stateActionSecondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.stateActionSecondaryLabel}>Go home</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isTrackActive = activeTrackId === track.id;
  const previewOnly =
    trackAccess?.isPreviewOnly ?? Boolean(track.playback?.isDemoOnly);
  const badgeLabel = trackAccess?.isOwned
    ? "Owned track"
    : previewOnly
      ? "Preview available"
      : track.isSubscriberOnly
        ? "Subscriber only"
        : track.commerce?.isPurchasable
          ? "Purchasable track"
          : "Track";

  const primaryAction: DetailActionItem =
    {
      key: "play",
      label:
        isTrackActive && isPlaying
          ? "Pause"
          : isTrackActive
            ? "Resume"
            : previewOnly
              ? "Play preview"
              : "Play",
      icon: isTrackActive && isPlaying ? "pause" : "play",
      onPress: () => void playFromTrack(track),
    };

  const secondaryAction: DetailActionItem = isTrackActive
    ? {
        key: "now-playing",
        label: "Open player",
        icon: "radio-outline",
        onPress: () =>
          router.push({
            pathname: "/now-playing",
            params: { slug: track.slug },
          } as any),
      }
    : {
        key: "queue",
        label: "Add queue",
        icon: "add-circle-outline",
        onPress: () => void enqueueAll(),
      };

  const shareAction: DetailActionItem = {
    key: "share",
    label: "Share",
    icon: "share-social-outline",
    onPress: () => void handleShareTrack(),
  };

  const heroMeta = joinMetaParts([
    formatRelativeTime(track.timestamps.createdAt),
    track.genre?.name,
    track.album?.title,
    formatDuration(track.duration),
  ]);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <DetailRouteHeader title="Track" />

        <View style={styles.heroCard}>
          {track.assets.artworkUrl ? (
            <Image
              source={{ uri: track.assets.artworkUrl }}
              style={styles.heroBackdropArt}
              contentFit="cover"
              transition={180}
            />
          ) : null}
          <LinearGradient
            colors={[
              "rgba(23,23,25,0.98)",
              "rgba(18,18,20,0.98)",
              "rgba(12,12,13,0.98)",
            ]}
            locations={[0, 0.45, 1]}
            style={styles.heroBackdropGradient}
          />
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.12)",
              "rgba(0,0,0,0.28)",
              "rgba(0,0,0,0.74)",
            ]}
            locations={[0, 0.45, 1]}
            style={styles.heroBackdropOverlay}
          />

          <View style={styles.heroTop}>
            <View style={styles.artworkWrap}>
              {track.assets.artworkUrl ? (
                <Image
                  source={{ uri: track.assets.artworkUrl }}
                  style={styles.artwork}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <View style={styles.artworkFallback}>
                  <Text style={styles.artworkFallbackLabel}>
                    {track.title.slice(0, 1).toUpperCase() || "T"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.heroCopy}>
              <Pressable
                disabled={!track.artist}
                onPress={() => {
                  if (track.artist) {
                    router.push(resolveUserRoute(track.artist) as never);
                  }
                }}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={styles.artistRow}>
                  <Text numberOfLines={1} style={styles.artistLink}>
                    {track.artist?.displayName ?? "Unknown artist"}
                  </Text>
                  <VerifiedBadge size={14} />
                </View>
              </Pressable>

              <Text style={styles.trackTitle}>{track.title}</Text>

              {badgeLabel ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillLabel}>{badgeLabel}</Text>
                </View>
              ) : null}

              {heroMeta ? (
                <Text style={styles.heroMeta}>{heroMeta}</Text>
              ) : null}

              <View style={styles.socialStatsRow}>
                <SocialStat
                  icon="play"
                  count={track.stats.plays}
                  label="Plays"
                />
                <SocialStat
                  icon={liked ? "heart" : "heart-outline"}
                  count={likeCount}
                  label="Likes"
                  active={liked}
                  pending={likePending}
                  disabled={
                    likePending ||
                    favouritePending ||
                    socialAuthPending ||
                    !socialConfigured ||
                    !track.artist?.uuid
                  }
                  onPress={() => void toggleLike()}
                />
                <SocialStat
                  icon="chatbubble-ellipses-outline"
                  count={commentCount}
                  label="Comments"
                />
                <SocialStat
                  icon={favourited ? "bookmark" : "bookmark-outline"}
                  count={favoriteCount}
                  label="Bookmarks"
                  active={favourited}
                  pending={favouritePending}
                  disabled={
                    likePending ||
                    favouritePending ||
                    socialAuthPending ||
                    !socialConfigured ||
                    !track.artist?.uuid
                  }
                  onPress={() => void toggleFavourite()}
                />
              </View>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <HeroActionButton action={primaryAction} tone="primary" />
            <HeroActionButton action={shareAction} tone="glass" />
            <HeroActionButton action={secondaryAction} tone="glass" />
          </View>

          <View style={styles.waveformWrap}>
            <TrackWaveform
              darkWaveformUrl={track.assets.waveforms.dark}
              lightWaveformUrl={track.assets.waveforms.light}
              fallbackWaveformUrl={track.assets.waveforms.day}
              progressPercent={isTrackActive ? progressPercent : 0}
              height={72}
            />
          </View>
        </View>

        {track.description ? (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionEyebrow}>Description</Text>
            <Text style={styles.bodyText}>{track.description}</Text>

            <View style={styles.linkRow}>
              {track.genre ? (
                <Pressable
                  onPress={() =>
                    router.push(`/genre/${encodeURIComponent(track.genre!.slug)}` as never)
                  }
                  style={({ pressed }) => [
                    styles.inlineLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.inlineLinkLabel}>
                    #{track.genre.name}
                  </Text>
                </Pressable>
              ) : null}

              {track.artist ? (
                <Pressable
                  onPress={() =>
                    router.push(resolveUserRoute(track.artist!) as never)
                  }
                  style={({ pressed }) => [
                    styles.inlineLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.inlineLinkLabel}>Open profile</Text>
                </Pressable>
              ) : null}

              {track.album ? (
                <Pressable
                  onPress={() =>
                    router.push(resolveAlbumRoute(track.album!) as never)
                  }
                  style={({ pressed }) => [
                    styles.inlineLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.inlineLinkLabel}>View album</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <TrackComments
          trackUuid={track.uuid}
          trackOwnerUid={track.artist?.uuid ?? null}
          trackTitle={track.title}
          trackHref={track.href}
          commentCount={commentCount}
          commentsAllowed={track.interactionPolicy.commentsAllowed}
        />

        <View style={styles.relatedSection}>
          <Text style={styles.sectionEyebrow}>More tracks</Text>
          <View style={styles.relatedList}>
            {data.relatedTracks.length ? (
              data.relatedTracks.map((relatedTrack, index) => {
                const active = relatedTrack.id === activeTrackId;

                return (
                  <TrackRow
                    key={relatedTrack.id}
                    track={relatedTrack}
                    laneTracks={queueTracks}
                    active={active}
                    playing={active && isPlaying}
                    progressValue={progressValue}
                    rank={index + 1}
                    onAction={(selectedTrack) =>
                      void playFromTrack(selectedTrack)
                    }
                  />
                );
              })
            ) : (
              <DetailStatusPanel
                title="No related tracks yet"
                body="More listening suggestions will appear here once the catalog expands."
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatStatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, value));
}

function SocialStat({
  icon,
  count,
  label,
  active = false,
  pending = false,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  label: string;
  active?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onPress?: (() => void) | null;
}) {
  const iconColor = active
    ? tokens.colors.accent
    : "rgba(255,255,255,0.42)";
  const labelStyle = [
    styles.socialStatLabel,
    active ? styles.socialStatLabelActive : null,
  ];

  if (!onPress) {
    return (
      <View style={styles.socialStat} accessibilityLabel={`${label}: ${count}`}>
        <Ionicons name={icon} size={14} color={iconColor} />
        <Text style={labelStyle}>{formatStatCount(count)}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${count}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialStat,
        styles.socialStatButton,
        active ? styles.socialStatButtonActive : null,
        disabled ? styles.socialStatButtonDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <Ionicons name={icon} size={14} color={iconColor} />
      )}
      <Text style={labelStyle}>{formatStatCount(count)}</Text>
    </Pressable>
  );
}

function HeroActionButton({
  action,
  tone,
}: {
  action: DetailActionItem;
  tone: "primary" | "glass";
}) {
  return (
    <Pressable
      disabled={action.disabled}
      onPress={() => void action.onPress()}
      style={({ pressed }) => [
        styles.heroActionButton,
        tone === "primary"
          ? styles.heroActionButtonPrimary
          : styles.heroActionButtonGlass,
        action.disabled && styles.heroActionButtonDisabled,
        pressed && !action.disabled && styles.pressed,
      ]}
    >
      <Ionicons
        name={action.icon}
        size={15}
        color={
          tone === "primary"
            ? tokens.colors.bgApp
            : tokens.colors.textPrimary
        }
      />
      <Text
        style={[
          styles.heroActionLabel,
          tone === "primary" && styles.heroActionLabelPrimary,
        ]}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  scroll: {
    flex: 1,
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 18,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stateActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  stateAction: {
    minWidth: 120,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stateActionPrimary: {
    backgroundColor: tokens.colors.accent,
  },
  stateActionSecondary: {
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
  },
  stateActionPrimaryLabel: {
    color: tokens.colors.bgApp,
    fontSize: 13,
    fontWeight: "800",
  },
  stateActionSecondaryLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  heroCard: {
    position: "relative",
    borderRadius: tokens.radii.xl,
    overflow: "hidden",
    padding: 18,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.28,
    shadowRadius: 60,
    elevation: 10,
  },
  heroBackdropArt: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.16,
    transform: [{ scale: 1.12 }],
  },
  heroBackdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTop: {
    flexDirection: "row",
    gap: 16,
    zIndex: 1,
  },
  artworkWrap: {
    width: 108,
    height: 108,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
    flexShrink: 0,
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  artworkFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  artworkFallbackLabel: {
    color: tokens.colors.accentLight,
    fontSize: 32,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  artistLink: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "700",
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  badgePill: {
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  badgePillLabel: {
    color: tokens.colors.accentLight,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    zIndex: 1,
  },
  heroActionButton: {
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  heroActionButtonPrimary: {
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.cta,
  },
  heroActionButtonGlass: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroActionButtonDisabled: {
    opacity: 0.45,
  },
  heroActionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  heroActionLabelPrimary: {
    color: tokens.colors.bgApp,
  },
  waveformWrap: {
    borderRadius: tokens.radii.lg,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 1,
  },
  descriptionSection: {
    gap: 10,
  },
  relatedSection: {
    gap: 10,
  },
  relatedList: {
    gap: 8,
  },
  sectionEyebrow: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  bodyText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  socialStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 16,
  },
  socialStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  socialStatButton: {
    minHeight: 28,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 6,
  },
  socialStatButtonActive: {
    backgroundColor: "rgba(8,218,255,0.08)",
  },
  socialStatButtonDisabled: {
    opacity: 0.6,
  },
  socialStatLabel: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 12,
    fontWeight: "600",
  },
  socialStatLabelActive: {
    color: tokens.colors.accent,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineLink: {
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  inlineLinkLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.84,
  },
});
