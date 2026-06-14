import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@micboxx/theme";
import { useRoomHistory } from "@/features/account/hooks/useRoomHistory";
import { EmptyState, SectionHeader } from "./profile-shared";

export function RoomHistorySection({ accessToken }: { accessToken: string }) {
  const router = useRouter();
  const { rooms, loading } = useRoomHistory(accessToken);

  return (
    <View style={s.section}>
      <SectionHeader title="Room History" />
      {loading ? (
        <ActivityIndicator color={tokens.colors.accent} style={{ marginVertical: 20 }} />
      ) : rooms.length === 0 ? (
        <EmptyState icon="mic-outline" message="Rooms you join will appear here." />
      ) : (
        <View style={s.list}>
          {rooms.map((entry, index) => (
            <TouchableOpacity
              key={entry.room_id}
              style={[s.item, index === rooms.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(`/album/${entry.release_identifier}/room` as never)}
            >
              <View style={s.artWrap}>
                {entry.artwork_url ? (
                  <Image source={{ uri: entry.artwork_url }} style={s.art} contentFit="cover" />
                ) : (
                  <LinearGradient
                    colors={[tokens.colors.brandSecondary, tokens.colors.brandPrimary]}
                    style={s.art}
                  />
                )}
              </View>
              <View style={s.info}>
                <Text style={s.title} numberOfLines={1}>{entry.release_title}</Text>
                <Text style={s.meta}>
                  Joined {new Date(entry.joined_at * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 24, gap: 14 },
  list: { gap: 0 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  artWrap: { width: 52, height: 52, borderRadius: tokens.radii.sm, overflow: "hidden", flexShrink: 0 },
  art: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 3 },
  title: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  meta: { color: tokens.colors.textSecondary, fontSize: 12 },
});
