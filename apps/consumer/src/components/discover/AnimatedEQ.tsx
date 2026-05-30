import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@micboxx/theme";

function EQBar({ playing, index }: { playing: boolean; index: number }) {
  const peaks = [14, 9, 12];
  const durations = [320, 400, 360];
  const height = useSharedValue(4);

  useEffect(() => {
    if (playing) {
      const peak = peaks[index] ?? 14;
      const valley = 4 + index;
      const dur = durations[index] ?? 340;
      height.value = withRepeat(
        withSequence(
          withTiming(peak, { duration: dur, easing: Easing.inOut(Easing.sin) }),
          withTiming(valley, {
            duration: dur * 0.8,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
        true,
      );
    } else {
      height.value = withTiming(4, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- peaks/durations are inline constants, height is a stable SharedValue, index is keyed
  }, [playing]);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[s.eqBar, animStyle]} />;
}

export function AnimatedEQ({
  playing,
  active,
}: {
  playing: boolean;
  active: boolean;
}) {
  const visibility = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    visibility.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, visibility]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [
      { translateX: interpolate(visibility.value, [0, 1], [-4, 0]) },
      { scale: interpolate(visibility.value, [0, 1], [0.92, 1]) },
    ],
  }));

  return (
    <Animated.View style={[s.eqWrap, wrapStyle]}>
      {[0, 1, 2].map((i) => (
        <EQBar key={i} playing={playing && active} index={i} />
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  eqWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2.5,
    height: 16,
    flexShrink: 0,
  },
  eqBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: tokens.colors.brandSecondary,
  },
});
