import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError } from "@micboxx/api";
import { useToast } from "@micboxx/ui";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { RoomReactionEntry, RoomReactionType } from "@micboxx/contracts";
import {
    RoomReactionFireIcon,
    RoomReactionHeartIcon,
    RoomReactionWaveIcon,
} from "@/features/rooms/components/RoomReactionIcons";
import { tokens } from "@micboxx/theme";

const ROOM_MOMENT_REACTION_TYPES: RoomReactionType[] = ["fire", "felt_this", "this_part"];

const FALLBACK_ICON_STYLE = {
  color: tokens.colors.textPrimary,
  fontSize: 16,
  lineHeight: 16,
} as const;

const labels: Record<RoomReactionType, { icon: ReactNode; text: string }> = {
  fire: { icon: <RoomReactionFireIcon size={18} />, text: "Fire" },
  felt_this: { icon: <RoomReactionHeartIcon size={18} />, text: "Felt this" },
  replay: { icon: <Text style={FALLBACK_ICON_STYLE}>↻</Text>, text: "Replay" },
  favorite: { icon: <Text style={FALLBACK_ICON_STYLE}>★</Text>, text: "Favorite" },
  this_part: { icon: <RoomReactionWaveIcon size={18} color={tokens.colors.textPrimary} />, text: "This part" },
};

interface FloatingBubble {
  id: number;
  icon: ReactNode;
}

function FloatingReactionBubble({
  icon,
  onDone,
}: {
  icon: ReactNode;
  onDone: () => void;
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const done = useCallback(() => onDone(), [onDone]);

  useState(() => {
    translateY.value = withSequence(
      withTiming(-90, { duration: 800 }),
      withTiming(-120, { duration: 400 }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 1000 }, (finished) => {
        if (finished) runOnJS(done)();
      }),
    );
  });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingBubble, animStyle]} pointerEvents="none">
      {icon}
    </Animated.View>
  );
}

let bubbleCounter = 0;

function ReactionButton({
  reactionType,
  display,
  isActive,
  disabled,
  onPress,
  buttonStyle,
  showCount,
  count,
}: {
  reactionType: RoomReactionType;
  display: { icon: ReactNode; text: string };
  isActive: boolean;
  disabled: boolean;
  onPress: () => void;
  buttonStyle: object | object[];
  showCount?: boolean;
  count?: number;
}) {
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);

  const handlePress = useCallback(() => {
    const id = ++bubbleCounter;
    setBubbles((prev) => [...prev, { id, icon: display.icon }]);
    onPress();
  }, [display.icon, onPress]);

  const removeBubble = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <View style={styles.buttonContainer}>
      {bubbles.map((bubble) => (
        <FloatingReactionBubble
          key={bubble.id}
          icon={bubble.icon}
          onDone={() => removeBubble(bubble.id)}
        />
      ))}
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={buttonStyle}
        accessibilityRole="button"
        accessibilityLabel={`React with ${display.text}`}
      >
        <View style={styles.iconWrap}>{display.icon}</View>
        {showCount && (
          <>
            <Text style={[styles.text, isActive && styles.textActive]}>{display.text}</Text>
            <View style={styles.countPill}>
              <Text style={[styles.countText, (count ?? 0) > 0 && styles.countTextActive]}>
                {count ?? 0}
              </Text>
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

const RATE_LIMIT_COOLDOWN_MS = 5_000;

export function RoomReactionsToolbar({
  canReact,
  canShowReactions,
  reactions,
  onReact,
  variant = "stage",
}: {
  canReact: boolean;
  canShowReactions: boolean;
  reactions: RoomReactionEntry[];
  onReact: (reaction: RoomReactionType) => Promise<void>;
  variant?: "stage" | "composer";
}) {
  const { showToast } = useToast();
  const [sendingType, setSendingType] = useState<RoomReactionType | null>(null);
  const [rateLimitedTypes, setRateLimitedTypes] = useState<Set<RoomReactionType>>(new Set());
  const rateLimitTimersRef = useRef<Map<RoomReactionType, ReturnType<typeof setTimeout>>>(new Map());

  const handleReact = useCallback(
    async (reactionType: RoomReactionType) => {
      if (!canReact || sendingType === reactionType || rateLimitedTypes.has(reactionType)) return;
      setSendingType(reactionType);
      try {
        await onReact(reactionType);
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          setRateLimitedTypes((prev) => new Set([...prev, reactionType]));
          showToast({
            title: "Too many reactions",
            message: "Wait a moment before reacting again.",
            tone: "warning",
          });
          const existing = rateLimitTimersRef.current.get(reactionType);
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            setRateLimitedTypes((prev) => {
              const next = new Set(prev);
              next.delete(reactionType);
              return next;
            });
            rateLimitTimersRef.current.delete(reactionType);
          }, RATE_LIMIT_COOLDOWN_MS);
          rateLimitTimersRef.current.set(reactionType, timer);
        }
      } finally {
        setSendingType(null);
      }
    },
    [canReact, sendingType, rateLimitedTypes, onReact, showToast],
  );

  if (!canReact && !canShowReactions) {
    return null;
  }

  useEffect(() => {
    const timers = rateLimitTimersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const countByType = (type: RoomReactionType) =>
    reactions.reduce((count, reaction) => (
      reaction.reactionType === type ? count + 1 : count
    ), 0);

  if (variant === "composer") {
    return (
      <View style={styles.composerWrap}>
        {ROOM_MOMENT_REACTION_TYPES.map((reactionType) => {
          const display = labels[reactionType];
          const isActive = sendingType === reactionType;
          const isRateLimited = rateLimitedTypes.has(reactionType);
          const disabled = !canReact || isRateLimited || isActive;
          return (
            <ReactionButton
              key={reactionType}
              reactionType={reactionType}
              display={display}
              isActive={isActive}
              disabled={disabled}
              onPress={() => void handleReact(reactionType)}
              buttonStyle={[
                styles.composerIconButton,
                (isRateLimited) && styles.composerIconButtonDisabled,
                isActive && styles.composerIconButtonActive,
              ]}
            />
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {ROOM_MOMENT_REACTION_TYPES.map((reactionType) => {
        const display = labels[reactionType];
        const count = countByType(reactionType);
        const isActive = sendingType === reactionType;
        const isRateLimited = rateLimitedTypes.has(reactionType);
        const disabled = !canReact || isRateLimited || isActive;

        return canReact ? (
          <ReactionButton
            key={reactionType}
            reactionType={reactionType}
            display={display}
            isActive={isActive}
            disabled={disabled}
            onPress={() => void handleReact(reactionType)}
            buttonStyle={[styles.pillButton, isActive && styles.pillButtonActive, isRateLimited && styles.pillButtonDisabled]}
            showCount
            count={count}
          />
        ) : (
          <View key={reactionType} style={styles.pillReadonly}>
            <View style={styles.iconWrap}>{display.icon}</View>
            <Text style={styles.text}>{display.text}</Text>
            <View style={styles.countPill}>
              <Text style={[styles.countText, count > 0 && styles.countTextActive]}>{count}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: "center",
  },
  composerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  buttonContainer: {
    position: "relative",
    alignItems: "center",
  },
  floatingBubble: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    zIndex: 999,
  },
  composerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(8,8,12,0.72)",
  },
  composerIconButtonDisabled: {
    opacity: 0.45,
  },
  composerIconButtonActive: {
    borderColor: "rgba(61,220,132,0.3)",
    backgroundColor: "rgba(61,220,132,0.08)",
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.075)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillButtonActive: {
    borderColor: "rgba(61,220,132,0.3)",
    backgroundColor: "rgba(61,220,132,0.08)",
  },
  pillButtonDisabled: {
    opacity: 0.45,
  },
  pillReadonly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.075)",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
  },
  text: {
    color: "rgba(238,238,242,0.82)",
    fontSize: 13,
    fontWeight: "600",
  },
  textActive: {
    color: tokens.colors.accent,
  },
  countPill: {
    minWidth: 18,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  countText: {
    color: "rgba(238,238,242,0.42)",
    fontSize: 11,
    fontWeight: "700",
  },
  countTextActive: {
    color: tokens.colors.accent,
  },
});
