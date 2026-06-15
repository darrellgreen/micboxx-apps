import React, { useEffect } from "react";
import { BackHandler, Dimensions, Platform, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { usePlayerSheet } from "../context/PlayerSheetContext";
import { NowPlayingPanel } from "./NowPlayingPanel";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function PlayerSheetHost() {
  const { progress, collapse, activeSlug, isExpandedState, isDragging } = usePlayerSheet();
  const startProgress = useSharedValue(0);

  // Android hardware back button handling
  useEffect(() => {
    if (Platform.OS !== "android" || !isExpandedState) return;

    const onBackPress = () => {
      if (progress.value > 0.5) {
        collapse();
        return true; // Intercept
      }
      return false; // Propagate
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, [collapse, progress, isExpandedState]);

  // Vertical swipe down gesture to collapse the sheet
  const panGesture = Gesture.Pan()
    .activeOffsetY(10) // Only activate when dragging down by at least 10px
    .failOffsetX([-15, 15]) // Fail if dragging horizontally (e.g. seeking waveform)
    .onStart(() => {
      startProgress.value = progress.value;
    })
    .onUpdate((e) => {
      // Dragging down yields positive e.translationY, reducing progress
      const newProgress = startProgress.value - e.translationY / SCREEN_HEIGHT;
      progress.value = Math.max(0, Math.min(1, newProgress));
    })
    .onEnd((e) => {
      const pastDistance = e.translationY > 120;
      const pastVelocity = e.velocityY > 600;

      if (pastDistance || pastVelocity) {
        runOnJS(collapse)();
      } else {
        progress.value = withTiming(1, { duration: 200 });
      }
    });

  // Gesture.Native() runs simultaneously with the pan gesture, which allows
  // React Native Pressable (JS responder system) to receive taps inside the
  // panel even while RNGH is watching for a swipe-down gesture.
  const gesture = Gesture.Simultaneous(panGesture, Gesture.Native());

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = (1 - progress.value) * SCREEN_HEIGHT;
    return {
      transform: [{ translateY }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.container, animatedStyle]}
        pointerEvents={isExpandedState && !isDragging ? "auto" : "none"}
      >
        <NowPlayingPanel slug={activeSlug} onBack={collapse} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999, // Ensure it draws over all navigation stacks
    backgroundColor: "transparent",
  },
});
