import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { hapticSuccess } from "@/hooks/useHaptic";
import { tokens } from "@micboxx/theme";

interface PlayerActionsProps {
  liked: boolean;
  onToggleLike: () => void;
  likePending?: boolean;
}

export function PlayerActions({
  liked,
  onToggleLike,
  likePending = false,
}: PlayerActionsProps) {
  const heartScale = useSharedValue(1);
  const heartColor = useSharedValue(liked ? 1 : 0);

  useEffect(() => {
    if (liked) {
      heartScale.value = withSpring(1, { damping: 8, stiffness: 400 });
      heartColor.value = withTiming(1, { duration: 150 });
      hapticSuccess();
      // Kick a quick overshoot then settle
      heartScale.value = withSpring(1.3, { damping: 8, stiffness: 400 }, () => {
        heartScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      });
    } else {
      heartScale.value = withTiming(1, { duration: 150 });
      heartColor.value = withTiming(0, { duration: 150 });
    }
  }, [liked, heartScale, heartColor]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const likedButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      heartColor.value,
      [0, 1],
      ["rgba(255,255,255,0)", "rgba(0,179,166,0.12)"],
    ),
    borderColor: interpolateColor(
      heartColor.value,
      [0, 1],
      ["rgba(255,255,255,0)", "rgba(0,179,166,0.24)"],
    ),
  }));

  return (
    <View style={s.actionsRow}>
      <AnimatedPressable
        style={[s.actionBtn, likedButtonStyle]}
        haptic="none"
        onPress={onToggleLike}
        disabled={likePending}
      >
        <Animated.View style={heartStyle}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={24}
            color={liked ? tokens.colors.accent : tokens.colors.textPrimary}
          />
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

const s = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0)",
    alignItems: "center",
    justifyContent: "center",
  },
});
