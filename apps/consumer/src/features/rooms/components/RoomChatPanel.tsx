import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RoomChatMessage, RoomReactionEntry, RoomReactionType } from "@micboxx/contracts";
import { RoomBumpCoinIcon } from "@/features/rooms/components/RoomBumpCoinIcon";
import { RoomReactionsToolbar } from "@/features/rooms/components/RoomReactionsToolbar";
import { tokens } from "@micboxx/theme";

import { ChatBubble } from "./ChatBubble";
import { getMessageOpacity, shouldCompactWithPrevious } from "@micboxx/utils";
import { useRoomChatList } from "./useRoomChatList";

const MESSAGE_LIMIT = 60;

interface RoomChatPanelProps {
  messages: RoomChatMessage[];
  currentUserUuid: string | null;
  canComment: boolean;
  muted: boolean;
  blocked: boolean;
  submitting: boolean;
  onSend: (message: string) => Promise<void>;
  pinnedMessageText?: string | null;
  variant?: "card" | "overlay";
  canReact?: boolean;
  canShowReactions?: boolean;
  reactions?: RoomReactionEntry[];
  onReact?: (reaction: RoomReactionType) => Promise<void>;
  showSupportButton?: boolean;
  supportButtonDisabled?: boolean;
  isSigningIn?: boolean;
  onPressSignIn?: () => void;
  onPressSupport?: () => void;
  artistPresenceActive?: boolean;
}

export function RoomChatPanel({
  messages,
  currentUserUuid,
  canComment,
  muted,
  blocked,
  submitting,
  onSend,
  pinnedMessageText,
  variant = "card",
  canReact = false,
  canShowReactions = false,
  reactions = [],
  onReact,
  showSupportButton = false,
  supportButtonDisabled = false,
  isSigningIn = false,
  onPressSignIn,
  onPressSupport,
  artistPresenceActive = false,
}: RoomChatPanelProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [draft, setDraft] = useState("");

  const disabled = !canComment || muted || blocked || submitting;
  const requiresSignIn = !currentUserUuid && !muted && !blocked && !canComment;

  const status = blocked
    ? "Room interactions are unavailable."
    : muted
      ? "You have been muted in this Room. Chat is read-only."
      : !canComment && !requiresSignIn
        ? "Chat is read-only in this room."
        : null;

  const visibleMessages = messages.slice(-MESSAGE_LIMIT);

  const {
    listRef,
    isExpanded,
    keyboardHeight,
    layout,
    onScrollBeginDrag,
    onScrollEndDrag,
    onTouchStart,
    onTouchEnd,
  } = useRoomChatList({
    messageCount: visibleMessages.length,
    windowHeight,
    insetsBottom: insets.bottom + 60,
    hasPinnedMessage: Boolean(pinnedMessageText),
    artistPresenceActive,
  });

  const {
    bottomSafeSpace,
    keyboardLift,
    composerBottom,
    maskHeight,
    listBottom,
    chatMaskLocations,
    backgroundFadeHeight,
    backgroundFadeLocations,
  } = layout;

  const submit = async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft("");
    try {
      await onSend(text);
    } catch {
      // interactionError handled by caller
    }
  };

  if (variant === "card") {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chat</Text>
        <FlatList
          data={messages.slice(-40)}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.cardEmpty}>No messages yet.</Text>
          }
          renderItem={({ item }) => (
            <ChatBubble item={item} currentUserUuid={currentUserUuid} />
          )}
        />
        {status ? (
          <View style={styles.readOnlyBarCard}>
            <Text style={styles.readOnlyText}>{status}</Text>
          </View>
        ) : (
          <View style={[styles.cardComposer, disabled && styles.composerDisabled]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              editable={!disabled}
              placeholder="Say something about the music..."
              placeholderTextColor={tokens.colors.textSecondary}
              style={styles.cardInput}
            />
            <Pressable
              disabled={disabled}
              onPress={() => void submit()}
              style={styles.sendButton}
            >
              <Ionicons
                name="arrow-forward"
                size={17}
                color={disabled ? tokens.colors.textSecondary : "#fff"}
              />
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const canRenderReactions =
    (canReact || canShowReactions) && typeof onReact === "function";

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { top: insets.top + 66 }]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0.04)",
          "rgba(0,0,0,0.2)",
          "rgba(0,0,0,0.48)",
        ]}
        locations={backgroundFadeLocations}
        style={[
          styles.chatReadabilityGradient,
          { height: backgroundFadeHeight },
        ]}
      />
      <MaskedView
        pointerEvents="none"
        style={[
          styles.chatColumnScrim,
          { height: backgroundFadeHeight },
        ]}
        maskElement={
          <LinearGradient
            colors={[
              "rgba(0,0,0,0)",
              "rgba(0,0,0,0.08)",
              "rgba(0,0,0,0.48)",
              "rgba(0,0,0,1)",
            ]}
            locations={chatMaskLocations}
            style={StyleSheet.absoluteFillObject}
          />
        }
      >
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.3)",
            "rgba(0,0,0,0.16)",
            "rgba(0,0,0,0)",
          ]}
          locations={[0, 0.46, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </MaskedView>
      {visibleMessages.length > 0 && (
        <MaskedView
          pointerEvents="box-none"
          style={[
            styles.maskedList,
            {
              height: maskHeight,
              bottom: listBottom,
            },
          ]}
          maskElement={
            <LinearGradient
              colors={[
                "rgba(0,0,0,0)",
                "rgba(0,0,0,0.08)",
                "rgba(0,0,0,0.48)",
                "rgba(0,0,0,1)",
              ]}
              locations={chatMaskLocations}
              style={StyleSheet.absoluteFillObject}
            />
          }
        >
          <View style={styles.listShell}>
            <FlatList
              ref={listRef}
              data={visibleMessages}
              keyExtractor={(item) => item.id}
              scrollEnabled={isExpanded}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={onScrollBeginDrag}
              onScrollEndDrag={onScrollEndDrag}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              renderItem={({ item, index }) => {
                const compactWithPrevious = shouldCompactWithPrevious(visibleMessages, index);

                return (
                  <ChatBubble
                    item={item}
                    currentUserUuid={currentUserUuid}
                    compactWithPrevious={compactWithPrevious}
                    opacity={getMessageOpacity(index, visibleMessages.length, isExpanded)}
                  />
                );
              }}
            />
          </View>
        </MaskedView>
      )}

      {pinnedMessageText && (
        <View
          pointerEvents="none"
          style={[styles.pinnedStrip, { bottom: composerBottom }]}
        >
          <Text style={styles.pinnedLabel}>Pinned message</Text>
          <Text style={styles.pinnedText} numberOfLines={2}>
            {pinnedMessageText}
          </Text>
        </View>
      )}

      {keyboardHeight > 0 && (
        <Pressable
          style={styles.keyboardDismissBackdrop}
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Dismiss keyboard"
        />
      )}
      <View
        pointerEvents="auto"
        style={[
          styles.composerDock,
          { paddingBottom: bottomSafeSpace + keyboardLift },
        ]}
      >
        <View style={styles.composerWrap}>
          <View style={[styles.composer, disabled && styles.composerDisabled]}>
            {canRenderReactions && (
              <RoomReactionsToolbar
                variant="composer"
                canReact={canReact && !blocked}
                canShowReactions={canShowReactions}
                reactions={reactions}
                onReact={async (reaction) => {
                  await onReact?.(reaction);
                }}
              />
            )}

            {status ? (
              <View style={styles.readOnlyInline}>
                <Text style={styles.readOnlyText} numberOfLines={1}>{status}</Text>
              </View>
            ) : requiresSignIn ? (
              <Pressable
                onPress={onPressSignIn}
                disabled={isSigningIn || typeof onPressSignIn !== "function"}
                style={[
                  styles.signInButton,
                  (isSigningIn || typeof onPressSignIn !== "function")
                  && styles.signInButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in to chat"
              >
                {isSigningIn ? (
                  <ActivityIndicator size="small" color={tokens.colors.textPrimary} />
                ) : (
                  <Text style={styles.signInLabel}>Sign in to chat</Text>
                )}
              </Pressable>
            ) : (
              <TextInput
                value={draft}
                onChangeText={setDraft}
                editable={!disabled}
                placeholder="Say something in the Room..."
                placeholderTextColor="rgba(238,238,242,0.42)"
                style={styles.input}
              />
            )}

            {showSupportButton && (
              <Pressable
                onPress={() => {
                  if (!supportButtonDisabled) onPressSupport?.();
                }}
                disabled={supportButtonDisabled}
                style={[
                  styles.supportButton,
                  supportButtonDisabled && styles.supportButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Boost this Room"
              >
                <RoomBumpCoinIcon size={16} />
              </Pressable>
            )}

            <Pressable
              disabled={disabled}
              onPress={() => void submit()}
              style={styles.sendButton}
            >
              <Ionicons
                name="arrow-forward"
                size={16}
                color={
                  disabled
                    ? "rgba(238,238,242,0.36)"
                    : "rgba(238,238,242,0.68)"
                }
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
    elevation: 500,
  },
  chatReadabilityGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  chatColumnScrim: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: "72%",
    zIndex: 2,
  },

  maskedList: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 120,
  },
  listShell: {
    flex: 1,
    backgroundColor: "transparent",
  },
  list: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingTop: 10,
    paddingBottom: 8,
    justifyContent: "flex-end",
    flexGrow: 1,
  },

  pinnedStrip: {
    position: "absolute",
    left: 10,
    right: 10,
    zIndex: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pinnedLabel: {
    color: tokens.colors.accentLight,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  pinnedText: {
    color: "rgba(238,238,242,0.92)",
    fontSize: 12,
    lineHeight: 16,
  },

  keyboardDismissBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 130,
  },
  composerDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 900,
    elevation: 900,
  },
  composerWrap: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  composer: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.34,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  composerDisabled: { opacity: 0.55 },
  input: {
    flex: 1,
    minHeight: 38,
    color: tokens.colors.textPrimary,
    fontSize: 13,
  },
  readOnlyInline: {
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  readOnlyText: {
    color: "rgba(238,238,242,0.45)",
    fontSize: 11,
    textAlign: "center",
  },
  signInButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
    marginHorizontal: 4,
  },
  signInButtonDisabled: { opacity: 0.6 },
  signInLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "800",
  },
  supportButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    opacity: 0.82,
  },
  supportButtonDisabled: { opacity: 0.5 },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  card: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    gap: 12,
  },
  cardTitle: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  cardEmpty: { color: tokens.colors.textSecondary, fontSize: 13 },
  cardComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardInput: { flex: 1, minHeight: 44, color: tokens.colors.textPrimary },
  readOnlyBarCard: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.84)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
