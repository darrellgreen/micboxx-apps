import { memo, useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

import { VerifiedBadge } from "@micboxx/ui";
import type { RoomChatMessage } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";

import { formatTime, getAvatarBackground, getInitials } from "@micboxx/utils";

interface ChatBubbleProps {
  item: RoomChatMessage;
  currentUserUuid: string | null;
  opacity?: number;
  compactWithPrevious?: boolean;
}

function ChatBubbleBase({
  item,
  currentUserUuid,
  opacity = 1,
  compactWithPrevious = false,
}: ChatBubbleProps) {
  const isArtist = item.senderRole === "artist";
  const isElevated =
    item.senderRole === "artist"
    || item.senderRole === "moderator"
    || item.senderRole === "admin";
  const isOwn = currentUserUuid != null && item.senderUid === currentUserUuid;

  const senderName = isOwn
    ? "You"
    : item.senderDisplayName?.trim()
      || item.senderUsername?.trim()
      || (isArtist ? "Artist" : "Listener");

  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        compactWithPrevious ? styles.bubbleRowGrouped : styles.bubbleRowSeparated,
        {
          opacity,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {compactWithPrevious ? (
        <View style={styles.avatarSpacer} />
      ) : item.senderAvatarUrl ? (
        <Image
          source={{ uri: item.senderAvatarUrl }}
          style={[styles.avatar, isArtist && styles.avatarArtist]}
        />
      ) : (
        <View
          style={[
            styles.avatarInitials,
            isArtist && styles.avatarArtist,
            { backgroundColor: getAvatarBackground(item.senderUid) },
          ]}
        >
          <Text style={styles.avatarInitialsText}>
            {getInitials(item.senderDisplayName, item.senderUsername)}
          </Text>
        </View>
      )}

      <View style={styles.bubbleCopy}>
        {!compactWithPrevious && (
          <View style={styles.bubbleMeta}>
            <Text
              numberOfLines={1}
              style={[styles.bubbleAuthor, isOwn && styles.bubbleAuthorOwn]}
            >
              {senderName}
            </Text>
            {isElevated && <VerifiedBadge size={10} />}
            <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isElevated && !isOwn && styles.bubbleArtist,
          ]}
        >
          <Text style={styles.bubbleBody}>{item.messageText}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    width: "100%",
  },
  bubbleRowSeparated: { marginTop: 12 },
  bubbleRowGrouped: { marginTop: 4 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    opacity: 0.78,
  },
  avatarInitials: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    opacity: 0.78,
  },
  avatarSpacer: {
    width: 28,
    height: 1,
  },
  avatarArtist: {
    borderColor: "rgba(61,220,132,0.34)",
    shadowColor: tokens.colors.accentLight,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 2,
    opacity: 0.92,
  },
  avatarInitialsText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 8,
    fontWeight: "900",
  },
  bubbleCopy: { minWidth: 0, flexShrink: 1, maxWidth: "80%" },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  bubbleAuthor: {
    color: "rgba(238,238,242,0.78)",
    fontSize: 11,
    fontWeight: "900",
  },
  bubbleAuthorOwn: { color: "#3ddc84" },
  bubbleTime: { color: "rgba(238,238,242,0.38)", fontSize: 10 },
  bubble: {
    alignSelf: "flex-start",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  bubbleArtist: {
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  bubbleBody: {
    color: "rgba(238,238,242,0.92)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
  },
});
