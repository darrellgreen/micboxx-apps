import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen, Skeleton } from "@micboxx/ui";
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
          {tabs.filter((tab) => tab.key === "all" || !state.isLoading && tabCounts[tab.key] > 0).map((tab) => {
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

        {state.isLoading ? <LibrarySkeleton /> : null}
        {state.error ? <InfoCard title="Unable to load library" body={state.error} /> : null}

        {!state.isLoading && !state.error && tabCounts.all === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="library-outline" size={44} color={tokens.colors.textMuted} />
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptyBody}>
              Purchase or save tracks, follow artists, and create playlists to fill your library.
            </Text>
          </View>
        ) : null}

        {(activeTab === "purchased" || (activeTab === "all" && tabCounts.purchased > 0)) ? (
          <PurchasedSection ownedAlbums={state.ownedAlbums} ownedTracks={state.ownedTracks} />
        ) : null}

        {(activeTab === "saved" || (activeTab === "all" && tabCounts.saved > 0)) ? (
          <SavedSection savedTracks={state.savedTracks} unavailableDomains={state.unavailableDomains} />
        ) : null}

        {(activeTab === "recent" || (activeTab === "all" && tabCounts.recent > 0)) ? (
          <RecentlyPlayedSection tracks={state.recentlyPlayedTracks} />
        ) : null}

        {(activeTab === "artists" || (activeTab === "all" && tabCounts.artists > 0)) ? (
          <ArtistsSection followedArtists={state.followedArtists} />
        ) : null}

        {(activeTab === "playlists" || (activeTab === "all" && tabCounts.playlists > 0)) ? (
          <PlaylistsSection playlists={state.playlists} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 }}>
      <Skeleton width={48} height={48} borderRadius={8} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="55%" height={14} borderRadius={6} />
        <Skeleton width="35%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

function LibrarySkeleton() {
  return (
    <View style={{ gap: 24 }}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={{ gap: 4 }}>
          <Skeleton width="30%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          {[1, 2, 3].map((r) => <SkeletonRow key={r} />)}
        </View>
      ))}
    </View>
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
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyBody: { color: tokens.colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 280 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.06)" },
  tabSelected: { backgroundColor: tokens.colors.accent },
  tabText: { color: tokens.colors.textSecondary, fontSize: 13, fontWeight: "800" },
  tabTextSelected: { color: "#fff" },
  tabCount: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "800" },
});
