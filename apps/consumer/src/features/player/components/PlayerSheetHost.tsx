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
  const { progress, collapse, activeSlug, isExpandedState } = usePlayerSheet();
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

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = (1 - progress.value) * SCREEN_HEIGHT;
    return {
      transform: [{ translateY }],
    };
  });

  if (!isExpandedState) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.container, animatedStyle]}
        pointerEvents="auto"
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
