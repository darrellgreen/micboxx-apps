import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Text,
  type StyleProp,
  type TextStyle,
} from "react-native";

interface AnimatedDashboardNumberProps {
  value: number;
  durationMs?: number;
  formatter?: (value: number) => string;
  reducedMotion?: boolean;
  style?: StyleProp<TextStyle>;
}

const DEFAULT_DURATION_MS = 520;

export function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReducedMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}

export function AnimatedDashboardNumber({
  value,
  durationMs = DEFAULT_DURATION_MS,
  formatter = (nextValue) => String(nextValue),
  reducedMotion = false,
  style,
}: AnimatedDashboardNumberProps) {
  const [displayValue, setDisplayValue] = useState(reducedMotion || value === 0 ? value : 0);
  const hasAnimatedRef = useRef(reducedMotion || value === 0);

  useEffect(() => {
    if (reducedMotion) {
      hasAnimatedRef.current = true;
      setDisplayValue(value);
      return;
    }

    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    if (hasAnimatedRef.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimatedRef.current = true;
    const startedAt = performance.now();
    let frameId: number | null = null;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [durationMs, reducedMotion, value]);

  return <Text style={style}>{formatter(displayValue)}</Text>;
}
