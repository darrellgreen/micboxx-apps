import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RoomCapabilities, RoomRelease } from "@micboxx/contracts";
import { tokens } from "@/theme/tokens";

export function RoomHeader({
  release: _release,
  artistName: _artistName,
  capabilities,
  onBack,
}: {
  release: RoomRelease | null;
  artistName?: string | null;
  capabilities: RoomCapabilities | null;
  onBack: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={22} color={tokens.colors.textPrimary} />
      </Pressable>
      <View pointerEvents="none" style={styles.titleWrap}>
        <Text numberOfLines={1} style={styles.title}>
          Room
        </Text>
      </View>
      <View style={[styles.livePill, capabilities?.can_enter_room === false && styles.disabledPill]}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>{capabilities?.can_enter_room === false ? "Closed" : "Live"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    position: "relative",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,8,12,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  titleWrap: {
    position: "absolute",
    left: 58,
    right: 58,
    alignItems: "center",
  },
  title: { color: tokens.colors.textPrimary, fontSize: 16, fontWeight: "700" },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(61,220,132,0.12)",
    borderWidth: 1,
    borderColor: "rgba(61,220,132,0.25)",
  },
  disabledPill: { backgroundColor: "rgba(255,255,255,0.08)" },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.colors.accentLight,
  },
  liveText: { color: tokens.colors.accentLight, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
});
