import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@micboxx/ui";
import type { UserConversationInboxItem } from "@micboxx/contracts";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { formatRelativeTime } from "@/lib/formatters";
import { tokens } from "@micboxx/theme";

export function InboxRow({
  item,
  onPress,
}: {
  item: UserConversationInboxItem;
  onPress: () => void;
}) {
  const displayName =
    item.otherParticipantDisplayName ??
    item.otherParticipantUsername ??
    "Unknown artist";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar displayName={displayName} size={46} />

      <View style={styles.content}>
        <Text
          numberOfLines={1}
          style={[styles.name, item.unreadCount > 0 && styles.nameUnread]}
        >
          {displayName}
        </Text>
        <Text numberOfLines={1} style={styles.preview}>
          {item.lastMessagePreview || "No messages yet"}
        </Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.time}>
          {formatRelativeTime(item.lastMessageAt)}
        </Text>
        <UnreadBadge count={item.unreadCount} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgSurfaceMuted,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  pressed: {
    opacity: 0.8,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  nameUnread: {
    color: tokens.colors.accent,
  },
  preview: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
  },
  meta: {
    alignItems: "flex-end",
    gap: 8,
  },
  time: {
    color: tokens.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
});
