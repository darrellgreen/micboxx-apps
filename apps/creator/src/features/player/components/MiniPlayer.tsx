import { BlurView } from "expo-blur";
import { router, useSegments } from "expo-router";
import { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerArtwork } from "@/features/player/components/PlayerArtwork";
import { PlayerControls } from "@/features/player/components/PlayerControls";
import { PlayerProgressCompact } from "@/features/player/components/PlayerProgress";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerContext } from "@/features/player/provider";
import { selectDisplaySubtitle } from "@/features/player/selectors";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { hapticLight, hapticSuccess } from "@/hooks/useHaptic";
import { tokens } from "@/theme/tokens";

const SCREEN_WIDTH = Dimensions.get("window").width;

// The player card is left:12 + right:12 = 24 px of total horizontal margin, so
// it nearly spans the full screen.  Dismiss once the card has travelled ~45 % of
// the screen width — at that point its leading edge is roughly at the screen
// boundary, so it feels like it's been pushed all the way to the edge.
const DISMISS_THRESHOLD = Math.round(SCREEN_WIDTH * 0.45);

// Velocity (px/s) that also triggers a dismiss even on a short fast flick.
const DISMISS_VELOCITY = 800;

// Keep the card fully opaque until the very last 20 px before it flies off.
const FADE_START = DISMISS_THRESHOLD - 20;

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { actions } = usePlayerContext();
  const { currentItem } = useNowPlaying();

  // Only add tab-bar clearance when we're actually inside the (tabs) group.
  // On modals and other stack screens there is no tab bar so the player sits
  // lower, flush with the safe-area bottom edge.
  const isInTabs = segments[0] === "(tabs)";

  const translateX = useSharedValue(0);

  // Snap back to center whenever a new track starts playing so the player
  // always enters at its natural position.
  useEffect(() => {
    translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
  }, [currentItem?.id, translateX]);

  function stopMusic() {
    void actions.clearQueue();
  }

  function openNowPlaying() {
    hapticLight();
    router.push("/");
  }

  const dismissHapticFired = useSharedValue(false);

  const pan = Gesture.Pan()
    // Only recognise after 10 px of horizontal movement …
    .activeOffsetX([-10, 10])
    // … and immediately fail if the user is clearly scrolling vertically.
    .failOffsetY([-15, 15])
    .onStart(() => {
      dismissHapticFired.value = false;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      // Fire haptic once when user crosses the dismiss threshold
      if (
        !dismissHapticFired.value &&
        Math.abs(e.translationX) > DISMISS_THRESHOLD
      ) {
        dismissHapticFired.value = true;
        runOnJS(hapticSuccess)();
      }
    })
    .onEnd((e) => {
      const pastDistance = Math.abs(translateX.value) > DISMISS_THRESHOLD;
      const pastVelocity = Math.abs(e.velocityX) > DISMISS_VELOCITY;

      if (pastDistance || pastVelocity) {
        // Fling off screen in the direction of the swipe, then stop music.
        const direction = translateX.value >= 0 ? 1 : -1;
        translateX.value = withSpring(
          direction * 600,
          { damping: 22, stiffness: 180, velocity: e.velocityX },
          () => {
            runOnJS(stopMusic)();
          },
        );
      } else {
        // Not far enough — spring back to centre.
        translateX.value = withSpring(0, { damping: 22, stiffness: 220 });
      }
    });

  const swipeUp = Gesture.Pan()
    .activeOffsetY(-20)
    .failOffsetX([-15, 15])
    .onEnd((e) => {
      if (e.translationY < -40 || e.velocityY < -400) {
        runOnJS(hapticLight)();
        runOnJS(openNowPlaying)();
      }
    });

  const composed = Gesture.Race(swipeUp, pan);

  // Full opacity until FADE_START, then fades to 0 over the final stretch
  // before the dismiss threshold so the card only visibly disappears when
  // it's about to fly off.
  const animatedStyle = useAnimatedStyle(() => {
    const absX = Math.abs(translateX.value);
    const opacity =
      absX < FADE_START
        ? 1
        : Math.max(
            0,
            1 - (absX - FADE_START) / (DISMISS_THRESHOLD - FADE_START),
          );
    return {
      opacity,
      transform: [{ translateX: translateX.value }],
    };
  });

  if (!currentItem) {
    return null;
  }

  const bottomOffset =
    insets.bottom + (isInTabs ? tokens.tabBar.height : 0) + 14;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: bottomOffset }]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <BlurView intensity={72} tint="dark" style={styles.blur}>
            <AnimatedPressable
              style={styles.touchTarget}
              scaleValue={0.988}
              onPress={openNowPlaying}
            >
              <View style={styles.header}>
                <PlayerArtwork size={42} />
                <View style={styles.copy}>
                  <Text style={styles.kicker}>Now playing</Text>
                  <Text numberOfLines={1} style={styles.title}>
                    {currentItem.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {selectDisplaySubtitle(currentItem)}
                  </Text>
                </View>
                <PlayerControls compact />
              </View>
              <PlayerProgressCompact />
            </AnimatedPressable>
          </BlurView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
  },
  blur: {
    overflow: "hidden",
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(13,17,23,0.82)",
    ...tokens.shadows.md,
  },
  touchTarget: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
    minHeight: 74,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  kicker: {
    color: tokens.colors.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
  },
});
