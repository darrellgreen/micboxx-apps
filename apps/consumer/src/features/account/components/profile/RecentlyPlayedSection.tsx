import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MicboxxSession } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";
import { useRecentlyPlayed } from "@/features/account/hooks/useRecentlyPlayed";
import { Skeleton } from "@micboxx/ui";
import { EmptyState, SectionHeader } from "./profile-shared";

interface RecentlyPlayedSectionProps {
  accessToken: string;
  userUuid: string;
  session?: MicboxxSession | null;
}

export function RecentlyPlayedSection({ accessToken, userUuid, session }: RecentlyPlayedSectionProps) {
  const router = useRouter();
  const { tracks, loading } = useRecentlyPlayed(accessToken, userUuid, session);

  return (
    <View style={s.section}>
      <SectionHeader title="Recently Played" />
      {loading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: CARD_SIZE, gap: 6 }}>
              <Skeleton width={CARD_SIZE} height={CARD_SIZE} borderRadius={tokens.radii.sm} />
              <Skeleton width="70%" height={10} borderRadius={6} />
            </View>
          ))}
        </ScrollView>
      ) : tracks.length === 0 ? (
        <EmptyState icon="musical-notes-outline" message="Tracks you listen to will appear here." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
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
        </ScrollView>
      )}
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_SIZE = Math.round((SCREEN_WIDTH - 40 - 12 * 2) / 3);

const s = StyleSheet.create({
  section: { marginTop: 24, gap: 14 },
  row: { flexDirection: "row", gap: 12, paddingRight: 20 },
  item: { alignItems: "center", width: CARD_SIZE },
  imgWrap: { width: CARD_SIZE, height: CARD_SIZE, borderRadius: tokens.radii.sm, overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { backgroundColor: tokens.colors.bgElevated, alignItems: "center", justifyContent: "center" },
  trackName: { color: tokens.colors.textSecondary, fontSize: 10, textAlign: "center", marginTop: 4, width: CARD_SIZE },
});
