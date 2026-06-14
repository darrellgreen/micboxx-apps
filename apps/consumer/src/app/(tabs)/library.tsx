import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen } from "@micboxx/ui";
import { SectionHeader } from "@/components/discover";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useAuth } from "@/features/auth/provider";
import { useLibraryDomains } from "@/features/library/useLibraryDomains";
import type { LibraryTab } from "@/features/library/libraryTypes";
import { tokens } from "@micboxx/theme";
import { InfoCard } from "@/features/library/components/library-shared";
import { PurchasedSection } from "@/features/library/components/PurchasedSection";
import { SavedSection } from "@/features/library/components/SavedSection";
import { RecentlyPlayedSection } from "@/features/library/components/RecentlyPlayedSection";
import { ArtistsSection } from "@/features/library/components/ArtistsSection";
import { PlaylistsSection } from "@/features/library/components/PlaylistsSection";

const tabs: { key: LibraryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "purchased", label: "Purchased" },
  { key: "saved", label: "Saved" },
  { key: "recent", label: "Recent" },
  { key: "artists", label: "Artists" },
  { key: "playlists", label: "Playlists" },
];

export default function LibraryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTab>("all");
  const { state, summary } = useLibraryDomains(session?.accessToken ?? null, session?.user.uuid ?? null);

  const tabCounts = useMemo<Record<LibraryTab, number>>(() => ({
    all:
      summary.ownedAlbumCount +
      summary.ownedTrackCount +
      summary.savedTrackCount +
      summary.followedArtistCount +
      summary.playlistCount +
      summary.recentlyPlayedCount,
    purchased: summary.ownedAlbumCount + summary.ownedTrackCount,
    saved: summary.savedAlbumCount + summary.savedTrackCount,
    recent: summary.recentlyPlayedCount,
    artists: summary.followedArtistCount,
    playlists: summary.playlistCount,
  }), [summary]);

  if (!session) {
    return (
      <Screen scroll={false}>
        <ScreenHeader title="Library" subtitle="Saved music and purchases" leftIcon="menu" />
        <View style={styles.gate}>
          <Ionicons name="library-outline" size={44} color={tokens.colors.accent} />
          <Text style={styles.gateTitle}>Your library lives here</Text>
          <Text style={styles.gateBody}>
            Sign in to see purchases, saved tracks, recent plays, followed artists, and playlists.
          </Text>
          <Pressable onPress={() => router.push("/sign-in")} style={styles.primaryButton}>
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.primaryButtonLabel}>Sign in</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Library" subtitle="Saved music and purchases" leftIcon="menu" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader bold="Your" light="Library" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tab.label}</Text>
                <Text style={[styles.tabCount, selected && styles.tabTextSelected]}>{tabCounts[tab.key]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {state.isLoading ? <ActivityIndicator color={tokens.colors.accent} /> : null}
        {state.error ? <InfoCard title="Unable to load library" body={state.error} /> : null}

        {(activeTab === "all" || activeTab === "purchased") ? (
          <PurchasedSection ownedAlbums={state.ownedAlbums} ownedTracks={state.ownedTracks} />
        ) : null}

        {(activeTab === "all" || activeTab === "saved") ? (
          <SavedSection savedTracks={state.savedTracks} unavailableDomains={state.unavailableDomains} />
        ) : null}

        {(activeTab === "all" || activeTab === "recent") ? (
          <RecentlyPlayedSection tracks={state.recentlyPlayedTracks} />
        ) : null}

        {(activeTab === "all" || activeTab === "artists") ? (
          <ArtistsSection followedArtists={state.followedArtists} />
        ) : null}

        {(activeTab === "all" || activeTab === "playlists") ? (
          <PlaylistsSection playlists={state.playlists} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 160, gap: 18 },
  gate: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  gateTitle: { color: tokens.colors.textPrimary, fontSize: 24, fontWeight: "900", textAlign: "center" },
  gateBody: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center" },
  primaryButton: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: tokens.colors.accent },
  primaryButtonLabel: { color: "#fff", fontWeight: "800" },
  tabs: { gap: 8, paddingRight: 20 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.06)" },
  tabSelected: { backgroundColor: tokens.colors.accent },
  tabText: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "800" },
  tabTextSelected: { color: "#fff" },
  tabCount: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "800" },
});
