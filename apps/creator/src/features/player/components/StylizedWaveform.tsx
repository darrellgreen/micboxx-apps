import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    type SharedValue,
} from "react-native-reanimated";

import { tokens } from "@micboxx/theme";

/* ─── Bar pattern generator ──────────────────────────────────────────────── */

/** Deterministic pseudo-random using a simple hash so the shape is stable. */
function generateBars(count: number, seed = 42): number[] {
  const out: number[] = [];
  let h = seed;
  for (let i = 0; i < count; i++) {
    h = (h * 16807 + 7) % 2147483647;
    const v = 0.15 + (h / 2147483647) * 0.85;
    out.push(v);
  }
  const mid = count / 2;
  for (let i = 0; i < count; i++) {
    const envelope = 1 - 0.35 * Math.pow(Math.abs(i - mid) / mid, 1.4);
    out[i] *= envelope;
  }
  return out;
}

/* ─── Animated bar ───────────────────────────────────────────────────────── */

function WaveformBar({
  fraction,
  barH,
  barW,
  gap,
  isLast,
  progress,
  activeColor,
  inactiveColor,
}: {
  fraction: number;
  barH: number;
  barW: number;
  gap: number;
  isLast: boolean;
  progress: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = fraction <= progress.value;
    return {
      backgroundColor: isActive ? activeColor : inactiveColor,
      opacity: isActive ? 1 : 0.7,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: Math.max(2, barW),
          height: barH,
          marginRight: isLast ? 0 : gap,
        },
        animatedStyle,
      ]}
    />
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

interface StylizedWaveformProps {
  /** 0 – 1 playback progress */
  progress: number;
  /** Total component height */
  height?: number;
  /** Played-portion colour */
  activeColor?: string;
  /** Unplayed-portion colour */
  inactiveColor?: string;
  /** Number of bars to render */
  barCount?: number;
  /** Callback when user taps a position (0–1) to seek */
  onSeek?: (position: number) => void;
}

export function StylizedWaveform({
  progress,
  height = 52,
  activeColor = tokens.colors.accent,
  inactiveColor = "rgba(255,255,255,0.15)",
  barCount = 56,
  onSeek,
}: StylizedWaveformProps) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const layoutWidth = useSharedValue(0);
  const progressSV = useSharedValue(progress);

  useEffect(() => {
    progressSV.value = progress;
  }, [progress, progressSV]);

  const bars = useMemo(() => generateBars(barCount), [barCount]);
  const gap = 2;
  const barW =
    measuredWidth > 0
      ? Math.max(2, (measuredWidth - gap * (barCount - 1)) / barCount)
      : 3;

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const nextWidth = e.nativeEvent.layout.width;
      layoutWidth.value = nextWidth;
      setMeasuredWidth(nextWidth);
    },
    [layoutWidth],
  );

  const handlePress = useCallback(
    (e: { nativeEvent: { locationX: number } }) => {
      if (layoutWidth.value > 0 && onSeek) {
        onSeek(
          Math.max(0, Math.min(1, e.nativeEvent.locationX / layoutWidth.value)),
        );
      }
    },
    [layoutWidth, onSeek],
  );

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, { height }]}
      onLayout={onLayout}
    >
      {bars.map((amp, i) => {
        const barH = Math.max(4, amp * height);
        const fraction = (i + 0.5) / barCount;
        return (
          <WaveformBar
            key={i}
            fraction={fraction}
            barH={barH}
            barW={barW}
            gap={gap}
            isLast={i === barCount - 1}
            progress={progressSV}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
          />
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  bar: {
    borderRadius: 999,
  },
});
