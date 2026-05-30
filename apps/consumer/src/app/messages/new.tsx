import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@micboxx/ui";
import type { PublicArtistSummary } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import { getOrCreateConversation } from "@/features/social/dm-service";
import { InboxRow } from "@/features/social/components/InboxRow";
import { useInbox } from "@/features/social/hooks/useInbox";
import { useSocialSessionGate } from "@/features/social/hooks/useSocialSessionGate";
import { useSearchCatalogQuery } from "@/store/micboxx-api";
import { tokens } from "@micboxx/theme";

const AUTOCOMPLETE_DELAY_MS = 250;

function mapArtistToConversationUser(artist: PublicArtistSummary) {
  return {
    uuid: artist.uuid,
    username: artist.username,
    displayName: artist.displayName,
  };
}

export default function NewConversationScreen() {
  const { session, signIn, isSigningIn } = useAuth();
  const { items: inboxItems, loading: inboxLoading, isReady: inboxReady } =
    useInbox();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [creatingConversationForUid, setCreatingConversationForUid] = useState<
    string | null
  >(null);
  const {
    authPending,
    interactionError,
    clearInteractionError,
    requireSocialSession,
  } = useSocialSessionGate({
    hasContext: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, AUTOCOMPLETE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!interactionError) {
      return;
    }

    Alert.alert("Messaging unavailable", interactionError, [
      {
        text: "OK",
        onPress: clearInteractionError,
      },
    ]);
  }, [clearInteractionError, interactionError]);

  const {
    data: searchData,
    isFetching: searchFetching,
    error: searchError,
    refetch: refetchSearch,
  } = useSearchCatalogQuery(debouncedQuery, {
    skip: debouncedQuery.length === 0,
  });

  const artistResults = useMemo(() => {
    const viewerUid = session?.user.uuid ?? null;

    return (searchData?.results.artists ?? []).filter(
      (artist) => artist.uuid && artist.uuid !== viewerUid,
    );
  }, [searchData?.results.artists, session?.user.uuid]);

  async function handleStartConversation(artist: PublicArtistSummary) {
    if (!session?.user || creatingConversationForUid) {
      return;
    }

    const allowed = await requireSocialSession();
    if (!allowed) {
      return;
    }

    try {
      setCreatingConversationForUid(artist.uuid);
      const conversationId = await getOrCreateConversation(
        session.user,
        mapArtistToConversationUser(artist),
      );
      router.replace(`/messages/${conversationId}`);
    } catch (error) {
      Alert.alert(
        "Unable to start conversation",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setCreatingConversationForUid(null);
    }
  }

  const showSearchResults = debouncedQuery.length > 0;
  const showRecentConversations = !showSearchResults && Boolean(session);

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
        <Text style={styles.title}>New message</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      {!session ? (
        <View style={styles.centerState}>
          <Ionicons
            name="mail-open-outline"
            size={34}
            color={tokens.colors.accent}
          />
          <Text style={styles.stateTitle}>Sign in to send messages</Text>
          <Text style={styles.stateBody}>
            Direct messages require your MicBoxx account and social session.
          </Text>
          <Pressable
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            {isSigningIn ? (
              <ActivityIndicator color={tokens.colors.textPrimary} />
            ) : (
              <Text style={styles.primaryButtonLabel}>Sign in</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.searchWrap}>
            <View style={styles.inputRow}>
              <Ionicons
                name="search-outline"
                size={18}
                color={tokens.colors.textSecondary}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search artists by name or username"
                placeholderTextColor={tokens.colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={styles.input}
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={tokens.colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.helperCopy}>
              {authPending
                ? "Connecting messaging…"
                : showSearchResults
                  ? "Select a listener or artist to open a direct conversation."
                  : "Recent conversations are shown below. Search to start a new one."}
            </Text>
          </View>

          {showSearchResults ? (
            searchError ? (
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>Search is unavailable</Text>
                <Text style={styles.stateBody}>
                  We could not load artist results right now. Try again in a
                  moment.
                </Text>
                <Pressable
                  onPress={() => void refetchSearch()}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Retry search</Text>
                </Pressable>
              </View>
            ) : searchFetching && !searchData ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={tokens.colors.accent} />
                <Text style={styles.stateBody}>Searching artists…</Text>
              </View>
            ) : artistResults.length ? (
              <FlatList
                data={artistResults}
                keyExtractor={(item) => item.uuid}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const creating = creatingConversationForUid === item.uuid;

                  return (
                    <Pressable
                      onPress={() => void handleStartConversation(item)}
                      disabled={creating}
                      style={({ pressed }) => [
                        styles.searchResultRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Avatar
                        uri={item.avatarUrl}
                        displayName={item.displayName}
                        size={48}
                      />
                      <View style={styles.searchResultCopy}>
                        <Text numberOfLines={1} style={styles.searchResultName}>
                          {item.displayName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={styles.searchResultHandle}
                        >
                          @{item.username}
                        </Text>
                      </View>
                      {creating ? (
                        <ActivityIndicator color={tokens.colors.accent} />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={tokens.colors.textSecondary}
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            ) : (
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>No artist matches</Text>
                <Text style={styles.stateBody}>
                  Try a display name or username to start a conversation.
                </Text>
              </View>
            )
          ) : showRecentConversations ? (
            <FlatList
              data={inboxItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <InboxRow
                  item={item}
                  onPress={() => router.replace(`/messages/${item.conversationId}`)}
                />
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListHeaderComponent={
                <Text style={styles.sectionLabel}>Recent conversations</Text>
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  {inboxLoading || !inboxReady || authPending ? (
                    <>
                      <ActivityIndicator color={tokens.colors.accent} />
                      <Text style={styles.stateBody}>
                        Preparing your messaging inbox…
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.stateTitle}>No conversations yet</Text>
                      <Text style={styles.stateBody}>
                        Search for an artist or listener above to start your
                        first direct message.
                      </Text>
                    </>
                  )}
                </View>
              }
            />
          ) : null}
        </>
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
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurfaceMuted,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  helperCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  separator: {
    height: 10,
  },
  searchResultRow: {
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
  searchResultCopy: {
    flex: 1,
    gap: 3,
  },
  searchResultName: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  searchResultHandle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  stateTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  stateBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minWidth: 132,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurfaceMuted,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
