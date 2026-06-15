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

import { AnimatedPressable } from "@micboxx/ui";
import { hapticLight, hapticSelection } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export interface PlayerControlsProps {
  compact?: boolean;
  isPlaying: boolean;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onTogglePlay: () => void;
  onSkipPrevious?: () => void;
  onSkipNext?: () => void;
}

export function PlayerControls({
  compact = false,
  isPlaying,
  hasPrevious = false,
  hasNext = false,
  onTogglePlay,
  onSkipPrevious,
  onSkipNext,
}: PlayerControlsProps) {
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
      {!compact ? (
        <AnimatedPressable
          onPress={() => {
            hapticSelection();
            onSkipPrevious?.();
          }}
          disabled={!hasPrevious}
          style={[
            styles.secondaryButton,
            !hasPrevious && styles.disabled,
            secondaryButtonStyle,
          ]}
        >
          <Ionicons
            name="play-skip-back"
            size={22}
            color={tokens.colors.textPrimary}
          />
        </AnimatedPressable>
      ) : null}
      <AnimatedPressable
        onPress={() => {
          hapticLight();
          onTogglePlay();
        }}
        scaleValue={0.93}
        style={[
          styles.primaryButton,
          compact && styles.compactPrimaryButton,
          !compact && primaryButtonStyle,
        ]}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={compact ? 18 : 28}
          color="#FFFFFF"
          style={!isPlaying ? styles.playOffset : undefined}
        />
      </AnimatedPressable>
      {!compact ? (
        <AnimatedPressable
          onPress={() => {
            hapticSelection();
            onSkipNext?.();
          }}
          disabled={!hasNext}
          style={[
            styles.secondaryButton,
            !hasNext && styles.disabled,
            secondaryButtonStyle,
          ]}
        >
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={tokens.colors.textPrimary}
          />
        </AnimatedPressable>
      ) : null}
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
    alignItems: "center",
    justifyContent: "center",
    ...tokens.shadows.accent,
  },
  compactPrimaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
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
