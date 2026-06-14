import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MicboxxSession } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";
import { useRecentlyPlayed } from "@/features/account/hooks/useRecentlyPlayed";
import { EmptyState, SectionHeader } from "./profile-shared";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface RecentlyPlayedSectionProps {
  accessToken: string;
  session?: MicboxxSession | null;
}

export function RecentlyPlayedSection({ accessToken, session }: RecentlyPlayedSectionProps) {
  const router = useRouter();
  const { tracks, loading } = useRecentlyPlayed(accessToken, session);

  return (
    <View style={s.section}>
      <SectionHeader title="Recently Played" />
      {loading ? (
        <ActivityIndicator color={tokens.colors.accent} style={{ marginVertical: 20 }} />
      ) : tracks.length === 0 ? (
        <EmptyState icon="musical-notes-outline" message="Tracks you listen to will appear here." />
      ) : (
        <View style={s.grid}>
          {tracks.map((track) => (
            <TouchableOpacity
              key={track.uuid}
              style={s.item}
              onPress={() => router.push(`/track/${encodeURIComponent(track.slug)}` as never)}
              activeOpacity={0.7}
            >
              <View style={s.imgWrap}>
                {track.artworkUrl ? (
                  <Image source={{ uri: track.artworkUrl }} style={s.img} contentFit="cover" />
                ) : (
                  <View style={[s.img, s.imgPlaceholder]}>
                    <Ionicons name="musical-note" size={20} color={tokens.colors.textMuted} />
                  </View>
                )}
              </View>
              <Text style={s.trackName} numberOfLines={1}>{track.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 24, gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  item: { alignItems: "center", width: (SCREEN_WIDTH - 40 - 12 * 2) / 3, minWidth: 64 },
  imgWrap: { width: "100%", aspectRatio: 1, borderRadius: tokens.radii.sm, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  trackName: { color: tokens.colors.textSecondary, fontSize: 10, textAlign: "center", marginTop: 4 },
});
