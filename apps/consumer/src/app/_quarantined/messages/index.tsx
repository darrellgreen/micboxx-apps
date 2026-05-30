import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/provider";
import { InboxRow } from "@/features/social/components/InboxRow";
import { useInbox } from "@/features/social/hooks/useInbox";
import { tokens } from "@/theme/tokens";

export default function MessagesInboxScreen() {
  const { session } = useAuth();
  const { items, loading, error, isReady } = useInbox();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <Pressable
          onPress={() => router.push("/messages/new")}
          style={styles.iconButton}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
      </View>

      {!session ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptyText}>
            Direct messages are available once your MicBoxx account is signed
            in.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Unable to load messages</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : loading || !isReady ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.colors.accent} />
          <Text style={styles.emptyText}>Connecting your inbox…</Text>
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
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Your direct messages will appear here once you start chatting
                with artists.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
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
});
