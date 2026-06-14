import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@micboxx/theme";
import { useUserPlaylists } from "@/features/account/hooks/useUserPlaylists";
import { Skeleton } from "@micboxx/ui";
import { EmptyState, SectionHeader } from "./profile-shared";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PLAYLIST_CARD_WIDTH = (SCREEN_WIDTH - 40 - 14 * 3) / 4;

export function PlaylistsSection({ accessToken }: { accessToken: string }) {
  const router = useRouter();
  const { playlists, loading } = useUserPlaylists(accessToken);

  return (
    <View style={s.section}>
      <SectionHeader title="Playlists" />
      {loading ? (
        <View style={s.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: PLAYLIST_CARD_WIDTH, gap: 6 }}>
              <Skeleton width="100%" height={PLAYLIST_CARD_WIDTH} borderRadius={tokens.radii.md} />
              <Skeleton width="80%" height={12} borderRadius={6} />
              <Skeleton width="50%" height={10} borderRadius={6} />
            </View>
          ))}
        </View>
      ) : playlists.length === 0 ? (
        <EmptyState
          icon="musical-notes-outline"
          message="No playlists yet."
          action={{ label: "Create Playlist", onPress: () => router.push("/playlist/create" as never) }}
        />
      ) : (
        <View style={s.grid}>
          {playlists.slice(0, 4).map((playlist) => (
            <TouchableOpacity key={playlist.id} style={s.card} activeOpacity={0.7} onPress={() => router.push(`/playlist/${encodeURIComponent(playlist.slug)}` as never)}>
              <View style={s.artWrap}>
                {playlist.artworkUrl ? (
                  <Image source={{ uri: playlist.artworkUrl }} style={s.art} contentFit="cover" />
                ) : (
                  <LinearGradient
                    colors={[tokens.colors.brandSecondary, tokens.colors.brandPrimary]}
                    style={s.art}
                  />
                )}
                <View style={s.countBadge}>
                  <Ionicons name="musical-note" size={10} color="rgba(255,255,255,0.85)" />
                  <Text style={s.countText}>{playlist.counts.tracks}</Text>
                </View>
              </View>
              <Text style={s.title} numberOfLines={1}>{playlist.title}</Text>
              <Text style={s.meta}>{playlist.counts.tracks} tracks</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 24, gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  card: { width: PLAYLIST_CARD_WIDTH, gap: 6 },
  artWrap: { width: "100%", aspectRatio: 1, borderRadius: tokens.radii.md, overflow: "hidden", position: "relative" },
  art: { width: "100%", height: "100%" },
  countBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  countText: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" },
  title: { color: tokens.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  meta: { color: tokens.colors.textSecondary, fontSize: 11 },
});
