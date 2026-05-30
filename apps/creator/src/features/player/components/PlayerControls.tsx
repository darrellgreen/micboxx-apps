import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { usePlayerState } from "@/features/player/hooks/usePlayerState";
import { selectHasNext, selectHasPrevious } from "@/features/player/selectors";
import { hapticLight, hapticSelection } from "@/hooks/useHaptic";
import { tokens } from "@/theme/tokens";

export function PlayerControls({ compact = false }: { compact?: boolean }) {
  const { play, pause, skipNext, skipPrevious } = usePlayerControls();
  const { playbackState } = useNowPlaying();
  const state = usePlayerState();
  const isPlaying =
    playbackState === "playing" || playbackState === "buffering";
  const playProgress = useSharedValue(isPlaying ? 1 : 0);

  useEffect(() => {
    playProgress.value = withTiming(isPlaying ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [isPlaying, playProgress]);

  const primaryButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      playProgress.value,
      [0, 1],
      [tokens.colors.accent, tokens.colors.accentStrong],
    ),
    transform: [{ scale: interpolate(playProgress.value, [0, 1], [1, 1.04]) }],
  }));

  const secondaryButtonStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      playProgress.value,
      [0, 1],
      [tokens.colors.borderStrong, "rgba(255,255,255,0.18)"],
    ),
  }));

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {!compact ? (
        <AnimatedPressable style={styles.utilityButton} haptic="selection">
          <MaterialCommunityIcons
            name="shuffle-variant"
            size={18}
            color={tokens.colors.textSecondary}
          />
        </AnimatedPressable>
      ) : null}
      <AnimatedPressable
        onPress={() => {
          hapticSelection();
          void skipPrevious();
        }}
        disabled={!selectHasPrevious(state)}
        style={[
          styles.secondaryButton,
          compact && styles.compactSecondaryButton,
          !selectHasPrevious(state) && styles.disabled,
          secondaryButtonStyle,
        ]}
      >
        <Ionicons
          name="play-skip-back"
          size={compact ? 15 : 22}
          color={tokens.colors.textPrimary}
        />
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => {
          hapticLight();
          void (isPlaying ? pause() : play());
        }}
        scaleValue={0.93}
        style={[
          styles.primaryButton,
          compact && styles.compactPrimaryButton,
          primaryButtonStyle,
        ]}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={compact ? 18 : 28}
          color="#FFFFFF"
          style={!isPlaying ? styles.playOffset : undefined}
        />
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => {
          hapticSelection();
          void skipNext();
        }}
        disabled={!selectHasNext(state)}
        style={[
          styles.secondaryButton,
          compact && styles.compactSecondaryButton,
          !selectHasNext(state) && styles.disabled,
          secondaryButtonStyle,
        ]}
      >
        <Ionicons
          name="play-skip-forward"
          size={compact ? 15 : 22}
          color={tokens.colors.textPrimary}
        />
      </AnimatedPressable>
      {!compact ? (
        <AnimatedPressable style={styles.utilityButton} haptic="selection">
          <Ionicons
            name="repeat"
            size={18}
            color={tokens.colors.textSecondary}
          />
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  rowCompact: {
    gap: 8,
  },
  primaryButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.accent,
  },
  compactPrimaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.overlayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  compactSecondaryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  utilityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  playOffset: {
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.35,
  },
});
