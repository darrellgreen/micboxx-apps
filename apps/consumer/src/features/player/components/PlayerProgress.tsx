import { useEffect, useState } from "react";
import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { hapticSelection } from "@/hooks/useHaptic";
import { formatDuration } from "@/lib/formatters";
import { tokens } from "@/theme/tokens";

export function PlayerProgress() {
  const { position } = useNowPlaying();
  const { seekTo } = usePlayerControls();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubProgress = useSharedValue(0);

  useEffect(() => {
    scrubProgress.value = withTiming(isScrubbing ? 1 : 0, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
    });
  }, [isScrubbing, scrubProgress]);

  const frameStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrubProgress.value,
      [0, 1],
      ["rgba(255,255,255,0)", "rgba(255,255,255,0.04)"],
    ),
    borderColor: interpolateColor(
      scrubProgress.value,
      [0, 1],
      ["rgba(255,255,255,0)", "rgba(255,255,255,0.08)"],
    ),
  }));

  return (
    <Animated.View style={[styles.container, frameStyle]}>
      <Slider
        minimumValue={0}
        maximumValue={Math.max(position.durationSec, 1)}
        value={position.positionSec}
        minimumTrackTintColor={tokens.colors.accent}
        maximumTrackTintColor="rgba(255,255,255,0.12)"
        thumbTintColor={tokens.colors.textPrimary}
        onSlidingStart={() => setIsScrubbing(true)}
        onSlidingComplete={(value) => {
          setIsScrubbing(false);
          hapticSelection();
          void seekTo(value);
        }}
        style={styles.slider}
      />
      <View style={styles.labels}>
        <Text style={styles.label}>{formatDuration(position.positionSec)}</Text>
        <Text style={styles.label}>{formatDuration(position.durationSec)}</Text>
      </View>
    </Animated.View>
  );
}

export function PlayerProgressCompact() {
  const { position, progressPercent } = useNowPlaying();
  const clampedProgress = Math.max(0, Math.min(1, progressPercent));

  return (
    <View style={styles.compactWrap}>
      <View style={styles.compactLabels}>
        <Text style={styles.compactLabel}>
          {formatDuration(position.positionSec)}
        </Text>
        <Text style={styles.compactLabel}>
          {formatDuration(position.durationSec)}
        </Text>
      </View>
      <View style={styles.compactTrack}>
        <View
          style={[
            styles.compactFill,
            { width: `${Math.max(0, Math.min(100, clampedProgress * 100))}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    paddingHorizontal: 6,
    paddingTop: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  slider: {
    marginHorizontal: -4,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  compactWrap: {
    gap: 4,
  },
  compactLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  compactLabel: {
    color: "rgba(169,180,192,0.64)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  compactTrack: {
    height: 3,
    width: "100%",
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  compactFill: {
    height: "100%",
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.teal,
    shadowColor: tokens.colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
