import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SectionHeader } from "@/components/discover";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useAuth } from "@/features/auth/provider";
import { useLibraryDomains } from "@/features/library/useLibraryDomains";
import type { LibraryTab } from "@/features/library/libraryTypes";
import { formatRelativeTime } from "@/lib/formatters";
import { tokens } from "@/theme/tokens";

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
      <SafeAreaView style={styles.safe} edges={["top"]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Section title="Purchased">
            {state.ownedAlbums.map((album) => (
              <LibraryRow
                key={`owned-album-${album.uuid}`}
                title={album.title}
                subtitle={album.artistName || "Purchased album"}
                meta="Purchased album"
                artwork={album.artwork}
              />
            ))}
            {state.ownedTracks.map((track) => (
              <LibraryRow
                key={`owned-track-${track.uuid}`}
                title={track.title}
                subtitle={track.artistName || "Purchased track"}
                meta="Purchased track"
                artwork={track.artwork}
              />
            ))}
            {state.ownedAlbums.length + state.ownedTracks.length === 0 ? (
              <EmptyLine text="No purchased music yet." />
            ) : null}
          </Section>
        ) : null}

        {(activeTab === "all" || activeTab === "saved") ? (
          <Section title="Saved">
            {state.savedTracks.map((track) => (
              <LibraryRow
                key={`saved-track-${track.uuid}`}
                title={track.title}
                subtitle={track.artistName}
                meta="Saved track"
                artwork={track.artwork}
                onPress={() => router.push(`/track/${encodeURIComponent(track.uuid)}` as never)}
              />
            ))}
            {state.savedTracks.length === 0 ? (
              <EmptyLine text={
                state.unavailableDomains.includes("Saved albums")
                  ? "No saved tracks yet. Saved albums are not available from a verified backend route."
                  : "No saved items yet."
              } />
            ) : null}
          </Section>
        ) : null}

        {(activeTab === "all" || activeTab === "recent") ? (
          <Section title="Recently Played">
            {state.recentlyPlayedTracks.map((track) => (
              <LibraryRow
                key={`recent-${track.uuid}`}
                title={track.title}
                subtitle={track.artistName}
                meta="Recent play"
                artwork={track.artwork}
                onPress={() => router.push(`/track/${encodeURIComponent(track.uuid)}` as never)}
              />
            ))}
            {state.recentlyPlayedTracks.length === 0 ? <EmptyLine text="No recent plays yet." /> : null}
          </Section>
        ) : null}

        {(activeTab === "all" || activeTab === "artists") ? (
          <Section title="Followed Artists">
            {state.followedArtists.map((artist) => (
              <LibraryRow
                key={`artist-${artist.id}`}
                title={artist.displayName}
                subtitle={`@${artist.username}`}
                meta="Followed artist"
                artwork={artist.avatar}
                roundArtwork
                onPress={() => router.push(`/user/${encodeURIComponent(artist.username)}` as never)}
              />
            ))}
            {state.followedArtists.length === 0 ? <EmptyLine text="No followed artists yet." /> : null}
          </Section>
        ) : null}

        {(activeTab === "all" || activeTab === "playlists") ? (
          <Section title="Playlists">
            {state.playlists.map((playlist) => (
              <LibraryRow
                key={`playlist-${playlist.uuid}`}
                title={playlist.title}
                subtitle={playlist.isPublic ? "Public playlist" : "Private playlist"}
                meta={`${playlist.trackCount} tracks · Updated ${formatRelativeTime(new Date(playlist.updatedAt * 1000).toISOString())}`}
                artwork={playlist.artwork}
                onPress={() =>
                  router.push({
                    pathname: "/playlist/[slug]",
                    params: { slug: playlist.slug, playlistId: playlist.id },
                  } as never)
                }
              />
            ))}
            {state.playlists.length === 0 ? <EmptyLine text="No playlists yet." /> : null}
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{body}</Text>
    </View>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function LibraryRow({
  title,
  subtitle,
  meta,
  artwork,
  roundArtwork = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
  roundArtwork?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.artwork, roundArtwork && styles.roundArtwork]}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Text style={styles.artworkText}>{title.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>{subtitle}</Text>
        <Text numberOfLines={1} style={styles.rowMeta}>{meta}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={tokens.colors.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
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
  section: { gap: 10 },
  sectionTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  sectionBody: { borderRadius: 8, overflow: "hidden", backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.borderSubtle },
  pressed: { opacity: 0.76 },
  artwork: { width: 54, height: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
  roundArtwork: { borderRadius: 27 },
  artworkText: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "800" },
  rowSubtitle: { color: tokens.colors.textSecondary, fontSize: 13, marginTop: 2 },
  rowMeta: { color: tokens.colors.textSecondary, fontSize: 11, marginTop: 4 },
  empty: { color: tokens.colors.textSecondary, padding: 14, fontSize: 13 },
  infoCard: { borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: tokens.colors.borderSubtle, padding: 14, gap: 4 },
  infoTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "800" },
  infoBody: { color: tokens.colors.textSecondary, fontSize: 13 },
});
