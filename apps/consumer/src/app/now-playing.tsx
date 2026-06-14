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
import type { PlayerItem } from "@micboxx/contracts";
import { useGetTrackPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import { Skeleton } from "@micboxx/ui";

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
  const { data: trackPageData } = useGetTrackPageQuery(slug ?? "", {
    skip: !slug,
  });

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
   * the old track's values for a frame or two. Track the ID we just
   * started so we can force progress to 0 until the engine catches up.
   */
  const justStartedIdRef = useRef<string | null>(null);
  if (
    justStartedIdRef.current &&
    currentItem?.id === justStartedIdRef.current &&
    position.positionSec < 1
  ) {
    // Engine has caught up — clear the flag
    justStartedIdRef.current = null;
  }
  const positionStale =
    justStartedIdRef.current !== null &&
    currentItem?.id === justStartedIdRef.current;

  const track = trackPageData?.track ?? null;
  const {
    likeCount,
    liked,
    likePending,
    interactionError,
    clearInteractionError,
    toggleLike,
  } = useTrackSocialState({
    trackUuid: track?.uuid ?? "",
    trackOwnerUid: track?.artist?.uuid ?? null,
    trackTitle: track?.title ?? "",
    trackHref: track?.href ?? null,
    initialComments: track?.stats.comments ?? 0,
    initialLikes: track?.stats.likes ?? 0,
    initialFavourites: track?.stats.favourites ?? 0,
  });

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

    const track = trackPageData.track;
    const item = mapTrackToPlayerItem(track);
    const relatedItems = (trackPageData.relatedTracks ?? []).map((t) =>
      mapTrackToPlayerItem(t),
    );

    justStartedIdRef.current = item.id;

    startPlayback({
      items: [item, ...relatedItems],
      startIndex: 0,
      context: { type: "track", slug: track.slug, title: track.title },
      autoplay: true,
    });
  }, [isActiveTrack, playbackState, pause, play, trackPageData, startPlayback]);

  const repeatMode = playerState.queue.repeatMode;
  const hasPrevious = selectHasPrevious(playerState);
  const hasNext = selectHasNext(playerState);

  const cycleRepeatMode = useCallback(() => {
    const nextMode =
      repeatMode === "off"
        ? "queue"
        : repeatMode === "queue"
          ? "track"
          : "off";
    void setRepeatMode(nextMode);
  }, [repeatMode, setRepeatMode]);

  if (!displayItem) {
    return (
      <View style={s.container}>
        <View style={s.loadingWrap}>
          <Skeleton width={280} height={280} borderRadius={20} />
          <View style={{ gap: 10, marginTop: 28, width: 280 }}>
            <Skeleton width="70%" height={22} borderRadius={8} />
            <Skeleton width="45%" height={15} borderRadius={6} />
          </View>
          <View style={{ flexDirection: "row", gap: 32, marginTop: 32 }}>
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} width={36} height={36} borderRadius={18} />)}
          </View>
        </View>
      </View>
    );
  }

  const artworkUrl = selectDisplayArtwork(displayItem);

  return (
    <View style={s.container}>
      {/* ── Blurred background ───────────────────────────────────────── */}
      {artworkUrl ? (
        <Image
          source={{ uri: artworkUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={60}
          transition={220}
        />
      ) : null}
      <Animated.View
        entering={FadeIn.duration(260)}
        style={[StyleSheet.absoluteFill, s.scrim]}
      />

      <SafeAreaView style={s.safe} edges={["bottom"]}>
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
          />
          <View style={s.centerSpacer} />
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
            onCycleRepeat={cycleRepeatMode}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            repeatMode={repeatMode}
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
  scrim: { backgroundColor: "rgba(10,14,20,0.55)" },
  safe: { flex: 1 },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgApp,
  },

  centerGroup: {
    flex: 1,
    alignItems: "center",
    paddingTop: 4,
  },

  centerSpacer: {
    flex: 1,
    maxHeight: 48,
  },

  bottomGroup: {
    paddingBottom: 16,
  },
});
