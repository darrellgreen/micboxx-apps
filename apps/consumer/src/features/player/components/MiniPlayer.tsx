import { useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, State } from "react-native-gesture-handler";
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PlayerArtwork } from "@/features/player/components/PlayerArtwork";
import { PlayerControls } from "@/features/player/components/PlayerControls";
import { PlayerProgressCompact } from "@/features/player/components/PlayerProgress";
import { usePlaybackController } from "@/features/player/hooks/usePlaybackController";
import { selectDisplaySubtitle } from "@/features/player/selectors";
import { useAppSelector } from "@/store/hooks";
import { usePlayerSheet } from "../context/PlayerSheetContext";
import { AnimatedPressable } from "@micboxx/ui";
import { hapticLight, hapticSuccess } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Drag distance to fully open the sheet. Shorter = more responsive to a thumb swipe.
const EXPAND_DISTANCE = 320;

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
  const playback = usePlaybackController();
  const { currentItem, isPlaying } = playback;
  const playerInitialized = useAppSelector((state) => state.player.initialized);
  const playerRestoring = useAppSelector((state) => state.player.restoring);
  const { expand, collapse, progress, isExpandedState, isDragging, startDrag, finishDrag } = usePlayerSheet();

  const canRenderMiniPlayer = playerInitialized && !playerRestoring;

  // Keep reference of the last active track only for deliberate fade-out after
  // a real session ends. During startup/restore/loading churn, stale content
  // should not flash over skeleton screens.
  const lastTrack = useRef(currentItem);
  if (canRenderMiniPlayer && currentItem) {
    lastTrack.current = currentItem;
  }
  const displayItem = canRenderMiniPlayer
    ? currentItem ?? lastTrack.current
    : null;

  // Declarative visibility animation based on active track existence
  const isPlayerActive = canRenderMiniPlayer && currentItem !== null;
  const visibility = useSharedValue(isPlayerActive ? 1 : 0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (isPlayerActive) {
      visibility.value = withTiming(1, { duration: 200 });
    } else {
      // Delay the hide animation slightly (e.g. 150ms) to allow transient null states
      // during track transitions to resolve without animating the mini-player away and back.
      timeoutId = setTimeout(() => {
        visibility.value = withTiming(0, { duration: 200 });
      }, 150);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPlayerActive, visibility]);

  // Only add tab-bar clearance when we're actually inside the (tabs) group.
  // On modals and other stack screens there is no tab bar so the player sits
  // lower, flush with the safe-area bottom edge.
  const isInTabs = segments[0] === "(tabs)";

  const translateX = useSharedValue(0);

  // Instantly reset translation when a new track starts playing
  useEffect(() => {
    if (currentItem) {
      translateX.value = 0;
    }
  }, [currentItem, translateX]);

  function handleDismissSession() {
    void playback.dismissSession();
  }

  function openNowPlaying() {
    hapticLight();
    expand({ slug: displayItem?.slug });
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
        // Dismiss the playback session (stops audio, clears queue and persisted state)
        runOnJS(handleDismissSession)();

        // Fling off screen in the direction of the swipe.
        const direction = translateX.value >= 0 ? 1 : -1;
        translateX.value = withSpring(
          direction * 600,
          { damping: 22, stiffness: 180, velocity: e.velocityX }
        );
      } else {
        // Not far enough — ease back to centre without bounce.
        translateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      }
    });

  const swipeUp = Gesture.Pan()
    .activeOffsetY(-8)
    .failOffsetX([-15, 15])
    .onStart(() => {
      // startDrag: sets isExpandedState=true, resets progress=0, mounts sheet off-screen
      runOnJS(startDrag)({ slug: displayItem?.slug });
    })
    .onUpdate((e) => {
      // progress directly follows the finger — sheet physically tracks the drag
      progress.value = Math.max(0, Math.min(1, -e.translationY / EXPAND_DISTANCE));
    })
    .onEnd((e) => {
      const shouldExpand = progress.value > 0.35 || e.velocityY < -700;
      if (shouldExpand) {
        runOnJS(hapticLight)();
        // isExpandedState already true from startDrag — just snap progress to 1
        progress.value = withTiming(
          1,
          { duration: 220, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) {
              runOnJS(finishDrag)();
            }
          },
        );
      } else {
        // collapse handles progress→0 animation + setIsExpandedState(false)
        runOnJS(collapse)();
      }
    })
    .onFinalize((e) => {
      // Gesture cancelled or interrupted — collapse the sheet
      if (e.state === State.CANCELLED || e.state === State.FAILED) {
        runOnJS(collapse)();
      }
    });

  // Gesture.Native() allows React Native Pressable (JS responder system) to
  // receive taps inside the card while RNGH watches for swipe gestures.
  const composed = Gesture.Simultaneous(Gesture.Race(swipeUp, pan), Gesture.Native());

  const animatedStyle = useAnimatedStyle(() => {
    // Horizontal swipe-to-dismiss opacity
    const absX = Math.abs(translateX.value);
    const swipeOpacity =
      absX < FADE_START
        ? 1
        : Math.max(0, 1 - (absX - FADE_START) / (DISMISS_THRESHOLD - FADE_START));

    // Mini player morphs into the full player as progress increases:
    //   - fades out by progress 0.35 (well before sheet fully covers screen)
    //   - lifts upward slightly and scales down to give a "merge" feel
    const expandOpacity = interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP);
    const expandTranslateY = interpolate(progress.value, [0, 1], [0, -40]);
    const expandScale = interpolate(progress.value, [0, 1], [1, 0.96]);

    // Slide down when player becomes inactive
    const hideTranslateY = (1 - visibility.value) * 150;

    return {
      opacity: swipeOpacity * expandOpacity * visibility.value,
      transform: [
        { translateX: translateX.value },
        { translateY: hideTranslateY + expandTranslateY },
        { scale: expandScale },
      ],
    };
  });

  if (!displayItem) {
    return null;
  }

  const bottomOffset =
    insets.bottom + 60 + 8;

  return (
    <View
      pointerEvents={isExpandedState && !isDragging ? "none" : "box-none"}
      style={[styles.container, { bottom: bottomOffset }]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <View style={styles.blur}>
            <View style={styles.touchTarget}>
              {/* Tap anywhere on this area to open the full Now Playing sheet */}
              <AnimatedPressable
                style={styles.detailsTouchTarget}
                scaleValue={0.988}
                onPress={openNowPlaying}
              >
                <View style={styles.header}>
                  <PlayerArtwork size={42} />
                  <View style={styles.copy}>
                    <Text style={styles.kicker}>Now playing</Text>
                    <Text numberOfLines={1} style={styles.title}>
                      {displayItem.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.subtitle}>
                      {selectDisplaySubtitle(displayItem)}
                    </Text>
                  </View>
                </View>
                <PlayerProgressCompact />
              </AnimatedPressable>

              {/* Controls container: rendered as a separate sibling to prevent nested touch events */}
              <View style={styles.controlsContainer} pointerEvents="box-none">
                <PlayerControls
                  compact
                  isPlaying={isPlaying}
                  onTogglePlay={() => void playback.togglePlayPause()}
                />
              </View>
            </View>
          </View>
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
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.colors.accentStrong,
    ...tokens.shadows.accent,
  },
  touchTarget: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
    minHeight: 74,
    position: "relative",
  },
  detailsTouchTarget: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 1,
    paddingRight: 52, // Prevent copy text from overlapping absolutely positioned controls
  },
  controlsContainer: {
    position: "absolute",
    right: 12,
    top: 9,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  kicker: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  },
});
