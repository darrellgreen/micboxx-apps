import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
    FlatList,
    StyleSheet,
    View,
} from "react-native";
import { Screen, AppHeader, ErrorState, EmptyState, Skeleton, AnimatedPressable } from "@micboxx/ui";

import { useAuth } from "@/features/auth/provider";
import { InboxRow } from "@/features/social/components/InboxRow";
import { useInbox } from "@/features/social/hooks/useInbox";
import { tokens } from "@micboxx/theme";

export default function MessagesInboxScreen() {
  const { session, signIn, isSigningIn } = useAuth();
  const { items, loading, error, isReady, canRetry, retry } = useInbox();

  const composeButton = (
    <AnimatedPressable
      onPress={() => router.push("/messages/new")}
      style={styles.iconButton}
    >
      <Ionicons
        name="create-outline"
        size={20}
        color={tokens.colors.textPrimary}
      />
    </AnimatedPressable>
  );

  return (
    <Screen
      scroll={false}
      noPaddingHorizontal={true}
      header={<AppHeader variant="detail" title="Messages" fallbackRoute="/settings" rightContent={composeButton} />}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {!session ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Sign in required"
          description="Direct messages are available once your MicBoxx account is signed in."
          action={{
            label: "Sign in",
            onPress: () => void signIn(),
            loading: isSigningIn,
          }}
        />
      ) : error ? (
        <ErrorState
          title="Unable to load messages"
          message={error}
          onRetry={canRetry ? retry : undefined}
        />
      ) : loading || !isReady ? (
        <View style={styles.listContent}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={`message-skeleton-${index}`} style={styles.skeletonRow}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.skeletonCopy}>
                <Skeleton width="64%" height={12} borderRadius={6} />
                <Skeleton width="40%" height={10} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <InboxRow
              item={item}
              onPress={() => router.push(`/messages/${item.conversationId}`)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No conversations yet"
              description="Your direct messages will appear here once you start chatting with artists."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
  primaryButton: {
    minWidth: 132,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    minWidth: 116,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
  },
});
