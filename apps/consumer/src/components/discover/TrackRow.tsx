import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@micboxx/ui";
import type { PublicTrackSummary } from "@micboxx/contracts";
import { resolveTrackRoute } from "@micboxx/utils";
import { formatDuration, usePrefetch } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

import { AnimatedEQ } from "./AnimatedEQ";
import { PlayButton } from "./PlayButton";

const ART = 52;

export const TrackRow = React.memo(function TrackRow({
  track,
  laneTracks,
  active,
  playing,
  onAction,
  progressValue,
  rank,
}: {
  track: PublicTrackSummary;
  laneTracks?: PublicTrackSummary[];
  active: boolean;
  playing: boolean;
  onAction: (
    track: PublicTrackSummary,
    allTracks?: PublicTrackSummary[],
  ) => void;
  progressValue: SharedValue<number>;
  rank?: number;
}) {
  const router = useRouter();
  const prefetchTrack = usePrefetch("getTrackPage", { ifOlderThan: 300 });
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activeProgress]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ["rgba(255,255,255,0.035)", "rgba(0,179,166,0.12)"],
    ),
    transform: [{ scale: interpolate(activeProgress.value, [0, 1], [1, 1.01]) }],
  }));

  const artGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0, 0.18]),
    transform: [{ scale: interpolate(activeProgress.value, [0, 1], [1.08, 1]) }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [tokens.colors.textPrimary, "#F9FFDF"],
    ),
  }));

  const artistStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [tokens.colors.textSecondary, "rgba(226,244,244,0.82)"],
    ),
  }));

  const durationStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [tokens.colors.textSecondary, tokens.colors.textPrimary],
    ),
    opacity: interpolate(activeProgress.value, [0, 1], [0.82, 1]),
    transform: [{ translateX: interpolate(activeProgress.value, [0, 1], [0, -1]) }],
  }));

  const handlePlay = useCallback(
    () => onAction(track, laneTracks),
    [onAction, track, laneTracks],
  );

  const inner = (
    <>
      {typeof rank === "number" ? (
        <Text style={s.rank}>{rank}</Text>
      ) : null}

      <AnimatedPressable
        onPress={() => {
          router.push(resolveTrackRoute(track) as never);
        }}
        onPressIn={() => {
          if (track.slug) {
            prefetchTrack(track.slug);
          }
        }}
        haptic="none"
        style={s.artWrap}
      >
        <Image
          source={
            track.artworkUrl
              ? { uri: track.artworkUrl }
              : require("../../../assets/images/icon.png")
          }
          style={s.artImg}
          contentFit="cover"
          transition={180}
        />
        <Animated.View pointerEvents="none" style={[s.artGlow, artGlowStyle]} />
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => {
          router.push(resolveTrackRoute(track) as never);
        }}
        onPressIn={() => {
          if (track.slug) {
            prefetchTrack(track.slug);
          }
        }}
        haptic="none"
        style={s.trackText}
      >
        <Animated.Text numberOfLines={1} style={[s.trackTitle, titleStyle]}>
          {track.title}
        </Animated.Text>
        <Animated.Text numberOfLines={1} style={[s.trackArtist, artistStyle]}>
          {track.artist?.displayName ?? "Unknown Artist"}
        </Animated.Text>
      </AnimatedPressable>

      <AnimatedEQ active={active} playing={playing} />

      <Animated.Text style={[s.trackDur, durationStyle]}>
        {formatDuration(track.duration)}
      </Animated.Text>

      <PlayButton
        active={active}
        playing={playing}
        onPress={handlePlay}
        progressValue={progressValue}
      />
    </>
  );

  return <Animated.View style={[s.row, rowStyle]}>{inner}</Animated.View>;
});

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 10,
    height: 74,
    gap: 12,
    borderRadius: tokens.radii.sm,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  rank: {
    width: 18,
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  artWrap: {
    width: ART,
    height: ART,
    borderRadius: tokens.radii.lg,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: tokens.colors.bgElevated,
  },
  artImg: { width: ART, height: ART },
  artGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(185,255,93,0.18)",
  },
  trackText: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 2,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  trackArtist: { color: tokens.colors.textSecondary, fontSize: 12 },
  trackDur: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    minWidth: 38,
    textAlign: "right",
  },
});
