import { StyleSheet, Text, View } from "react-native";

import type { DirectMessage } from "@micboxx/contracts";
import { formatRelativeTime } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

export function MessageBubble({
  message,
  isMine,
}: {
  message: DirectMessage;
  isMine: boolean;
}) {
  return (
    <View
      style={[
        styles.wrapper,
        isMine ? styles.wrapperMine : styles.wrapperTheirs,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        <Text style={styles.body}>{message.body}</Text>
        <Text style={styles.time}>{formatRelativeTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 10,
  },
  wrapperMine: {
    alignItems: "flex-end",
  },
  wrapperTheirs: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: tokens.radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  bubbleMine: {
    backgroundColor: tokens.colors.accent,
  },
  bubbleTheirs: {
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  body: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "600",
    alignSelf: "flex-end",
  },
});
