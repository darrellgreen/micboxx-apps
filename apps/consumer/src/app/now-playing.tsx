import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  PlayerActions,
  PlayerArtworkRing,
  PlayerTopBar,
  PlayerTrackInfo,
  PlayerTransport,
} from "@/components/player";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { usePlayerState } from "@/features/player/hooks/usePlayerState";
import { mapTrackToPlayerItem } from "@/features/player/mapper/playerItemMapper";
import {
  selectDisplayArtwork,
  selectHasNext,
  selectHasPrevious,
} from "@/features/player/selectors";
import { useTrackSocialState } from "@/features/social/hooks/useTrackSocialState";
import { useGetTrackPageQuery } from "@micboxx/api";
import type { PlayerItem } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";
import { BodyText, Skeleton } from "@micboxx/ui";

export default function NowPlayingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const { currentItem, playbackState, position, progressPercent } =
    useNowPlaying();
  const { play, pause, skipNext, skipPrevious, setRepeatMode } =
    usePlayerControls();
  const { startPlayback } = usePlayerQueue();
  const playerState = usePlayerState();

  /*
   * Always fetch by slug so we can display track info independently
   * of what the global player is currently playing.
   */
  const {
    data: trackPageData,
    isLoading: trackLoading,
    isError: trackError,
  } = useGetTrackPageQuery(slug ?? "", { skip: !slug });

  /*
   * The "display item" is the track we show on this screen.
   * If the player already has the same track loaded, prefer that immediately
   * so "Open player" never blocks on a redundant track-page fetch.
   */
  const displayItem: PlayerItem | null = useMemo(() => {
    if (trackPageData?.track) {
      return mapTrackToPlayerItem(trackPageData.track);
    }

    if (currentItem && (!slug || currentItem.slug === slug)) {
      return currentItem;
    }

    if (slug) {
      return null;
    }

    return currentItem;
  }, [trackPageData, currentItem, slug]);

  /* Is this screen showing the same track that's actively loaded? */
  const isActiveTrack = !!displayItem && displayItem.id === currentItem?.id;
  const isPlaying = isActiveTrack && playbackState === "playing";

  /*
   * When we start a different track, the engine's position still holds
   * the old track's values for a frame or two. We track the ID we just
   * started so we can force progress to 0 until the engine catches up.
   * Reading/clearing a ref during render is safe here — refs don't trigger
   * re-renders, and this avoids a setState on every position tick.
   */
  const justStartedIdRef = useRef<string | null>(null);
  const engineCaughtUp =
    justStartedIdRef.current !== null &&
    currentItem?.id === justStartedIdRef.current &&
    position.positionSec >= 1;
  if (engineCaughtUp) {
    justStartedIdRef.current = null;
  }
  const positionStale = justStartedIdRef.current !== null;

  const track = trackPageData?.track ?? null;
  const {
    likeCount,
    liked,
    likePending,
    interactionError,
    clearInteractionError,
    toggleLike,
  } = useTrackSocialState({
    enabled: !!track,
    trackUuid: track?.uuid ?? "",
    trackOwnerUid: track?.artist?.uuid ?? null,
    trackTitle: track?.title ?? "",
    trackHref: track?.href ?? null,
    initialComments: track?.stats.comments ?? 0,
    initialLikes: track?.stats.likes ?? 0,
    initialFavourites: track?.stats.favourites ?? 0,
  });

  useEffect(() => {
    if (!interactionError) return;

    Alert.alert("Social unavailable", interactionError, [
      { text: "OK", onPress: clearInteractionError },
    ]);
  }, [clearInteractionError, interactionError]);

  const togglePlay = useCallback(() => {
    if (isActiveTrack) {
      /* Same track — just toggle */
      if (playbackState === "playing") {
        pause();
      } else {
        play();
      }
      return;
    }

    /* Different track or nothing playing — load + play */
    if (!trackPageData?.track) return;

    const item = mapTrackToPlayerItem(trackPageData.track);
    const relatedItems = (trackPageData.relatedTracks ?? []).map((t) =>
      mapTrackToPlayerItem(t),
    );

    justStartedIdRef.current = item.id;

    startPlayback({
      items: [item, ...relatedItems],
      startIndex: 0,
      context: {
        type: "track",
        slug: trackPageData.track.slug,
        title: trackPageData.track.title,
      },
      autoplay: true,
    });
  }, [isActiveTrack, playbackState, pause, play, trackPageData, startPlayback]);

  const repeatMode = playerState.queue.repeatMode;
  const hasPrevious = selectHasPrevious(playerState);
  const hasNext = selectHasNext(playerState);

  const cycleRepeatMode = useCallback(() => {
    const nextMode =
      repeatMode === "off" ? "queue" : repeatMode === "queue" ? "track" : "off";
    void setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  /* ── Loading ─────────────────────────────────────────────────────────────── */

  if (!displayItem && trackLoading) {
    return (
      <View style={s.container}>
        <View style={s.loadingWrap}>
          <Skeleton width={280} height={280} borderRadius={20} />
          <View style={s.loadingMeta}>
            <Skeleton width="70%" height={22} borderRadius={8} />
            <Skeleton width="45%" height={15} borderRadius={6} />
          </View>
          <View style={s.loadingActions}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} width={36} height={36} borderRadius={18} />
            ))}
          </View>
        </View>
      </View>
    );
  }

  /* ── Error / not found ───────────────────────────────────────────────────── */

  if (!displayItem) {
    return (
      <View style={[s.container, s.loadingWrap]}>
        <BodyText color="secondary">Track not available</BodyText>
      </View>
    );
  }

  const artworkUrl = selectDisplayArtwork(displayItem);

  /* ── Player ──────────────────────────────────────────────────────────────── */

  return (
    <View style={s.container}>
      {/* ── Blurred background ───────────────────────────────────────── */}
      <View style={s.backgroundBase} />
      {artworkUrl ? (
        <Image
          source={{ uri: artworkUrl }}
          style={s.bgImage}
          contentFit="cover"
          blurRadius={50}
          transition={220}
        />
      ) : null}
      <Animated.View
        entering={FadeIn.duration(260)}
        style={[StyleSheet.absoluteFill, s.scrim]}
      />

      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <Animated.View entering={FadeInUp.duration(240)}>
          <PlayerTopBar onBack={() => router.back()} />
        </Animated.View>

        <Animated.View entering={FadeIn.duration(260)} style={s.centerGroup}>
          <PlayerArtworkRing artworkUrl={artworkUrl} />
          <PlayerTrackInfo
            title={displayItem.title}
            artistName={displayItem.artistName}
            plays={track?.stats.plays ?? null}
            likes={track ? likeCount : null}
          />
          <PlayerActions
            liked={liked}
            likePending={likePending}
            onToggleLike={() => void toggleLike()}
            repeatMode={repeatMode}
            onCycleRepeat={cycleRepeatMode}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(280)} style={s.bottomGroup}>
          <PlayerTransport
            playing={isPlaying}
            progress={isActiveTrack && !positionStale ? progressPercent : 0}
            currentTime={
              isActiveTrack && !positionStale ? position.positionSec : 0
            }
            duration={
              isActiveTrack && !positionStale
                ? position.durationSec || displayItem.durationSec || 0
                : displayItem.durationSec || 0
            }
            onTogglePlay={togglePlay}
            onSkipPrevious={() => void skipPrevious()}
            onSkipNext={() => void skipNext()}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            waveformDarkUrl={displayItem.waveformDarkUrl}
            waveformLightUrl={displayItem.waveformLightUrl}
            waveformFallbackUrl={displayItem.waveformFallbackUrl}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bgApp },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.colors.bgApp,
  },
  bgImage: {
    position: "absolute",
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    transform: [{ scale: 1.2 }],
    backgroundColor: tokens.colors.bgApp,
  },
  scrim: { backgroundColor: "rgba(10,14,20,0.78)" },
  safe: { flex: 1 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingMeta: {
    gap: 10,
    marginTop: 28,
    width: 280,
  },
  loadingActions: {
    flexDirection: "row",
    gap: 32,
    marginTop: 32,
  },

  centerGroup: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
    justifyContent: "center",
  },
  bottomGroup: {
    paddingBottom: 16,
  },
});
