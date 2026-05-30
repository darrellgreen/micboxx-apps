import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { tokens } from "@/theme/tokens";

const BTN = 38;
const RING_SIZE = BTN + 6;
const RING_STROKE = 2.5;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function PlayButton({
  active,
  playing,
  onPress,
  progressValue,
}: {
  active: boolean;
  playing: boolean;
  onPress: () => void;
  progressValue: SharedValue<number>;
}) {
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, activeProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - progressValue.value),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(activeProgress.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(activeProgress.value, [0, 1], [0.8, 1]) }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      ["rgba(0,179,166,0.28)", "rgba(0,179,166,0.42)"],
    ),
    transform: [{ scale: interpolate(activeProgress.value, [0, 1], [1, 1.04]) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      hitSlop={8}
      scaleValue={0.9}
      style={s.playBtnWrap}
    >
      {active ? (
        <Animated.View style={[s.ringAbsolute, ringStyle]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke="rgba(0,179,166,0.18)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={tokens.colors.brandSecondary}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRC}`}
              animatedProps={animatedProps}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[s.actionBtn, buttonStyle]}>
        <Ionicons
          name={active && playing ? "pause" : "play"}
          size={15}
          color={tokens.colors.textPrimary}
          style={!active || !playing ? s.playOffset : undefined}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

export { RING_SIZE };

const s = StyleSheet.create({
  playBtnWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ringAbsolute: {
    position: "absolute",
  },
  actionBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: "rgba(0,179,166,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  playOffset: { marginLeft: 2 },
});
