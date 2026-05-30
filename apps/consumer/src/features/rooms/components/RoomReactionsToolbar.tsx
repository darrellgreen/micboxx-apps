import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  if (!canReact && !canShowReactions) {
    return null;
  }

  const countByType = (type: RoomReactionType) =>
    reactions.reduce((count, reaction) => (
      reaction.reactionType === type ? count + 1 : count
    ), 0);

  if (variant === "composer") {
    return (
      <View style={styles.composerWrap}>
        {ROOM_MOMENT_REACTION_TYPES.map((reaction) => {
          const display = labels[reaction];
          const disabled = !canReact;
          return (
            <Pressable
              key={reaction}
              onPress={() => {
                if (!disabled) {
                  void onReact(reaction).catch(() => undefined);
                }
              }}
              disabled={disabled}
              style={[styles.composerIconButton, disabled && styles.composerIconButtonDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`React with ${display.text}`}
            >
              <View style={styles.iconWrap}>{display.icon}</View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {ROOM_MOMENT_REACTION_TYPES.map((reaction) => {
        const display = labels[reaction];
        const count = countByType(reaction);

        return canReact ? (
          <Pressable
            key={reaction}
            onPress={() => void onReact(reaction).catch(() => undefined)}
            style={styles.pillButton}
          >
            <View style={styles.iconWrap}>{display.icon}</View>
            <Text style={styles.text}>{display.text}</Text>
            <View style={styles.countPill}>
              <Text style={[styles.countText, count > 0 && styles.countTextActive]}>{count}</Text>
            </View>
          </Pressable>
        ) : (
          <View key={reaction} style={styles.pillReadonly}>
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
