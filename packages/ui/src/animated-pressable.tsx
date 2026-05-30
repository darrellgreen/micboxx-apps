import React, { useCallback } from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { hapticLight, hapticSelection } from "./useHaptic";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticType = "light" | "selection" | "none";

interface AnimatedPressableProps extends PressableProps {
  /** Scale factor when pressed (0–1). Default 0.97. */
  scaleValue?: number;
  /** Haptic feedback on press-in. Default "light". */
  haptic?: HapticType;
}

const HAPTIC_MAP: Record<Exclude<HapticType, "none">, () => void> = {
  light: hapticLight,
  selection: hapticSelection,
};

/**
 * Drop-in Pressable replacement with spring-scale press feedback and
 * optional haptic. Replaces the flat opacity:0.8 pattern throughout the app.
 */
export const AnimatedPressable = React.memo(
  React.forwardRef<React.ElementRef<typeof Pressable>, AnimatedPressableProps>(
    function AnimatedPressable(
      {
        scaleValue = 0.97,
        haptic = "light",
        disabled,
        onPressIn,
        onPressOut,
        style,
        ...rest
      },
      ref,
    ) {
      const scale = useSharedValue(1);

      const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
      }));

      const handlePressIn = useCallback(
        (e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) => {
          scale.value = withTiming(scaleValue, {
            duration: 110,
            easing: Easing.out(Easing.cubic),
          });
          if (!disabled && haptic !== "none") HAPTIC_MAP[haptic]();
          onPressIn?.(e);
        },
        [scale, scaleValue, disabled, haptic, onPressIn],
      );

      const handlePressOut = useCallback(
        (e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) => {
          scale.value = withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
          });
          onPressOut?.(e);
        },
        [scale, onPressOut],
      );

      return (
        <ReanimatedPressable
          ref={ref}
          disabled={disabled}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[animatedStyle, style as ViewStyle]}
          {...rest}
        />
      );
    },
  ),
);
