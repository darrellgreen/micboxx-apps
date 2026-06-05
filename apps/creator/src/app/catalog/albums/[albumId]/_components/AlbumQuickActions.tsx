import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";

const CARD_BG = "#131820";

interface ActionBtnProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

function ActionBtn({ label, icon, onPress }: ActionBtnProps) {
  return (
    <AnimatedPressable style={styles.btn} onPress={onPress} haptic="selection">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color="#00B3A6" />
      </View>
      <Text style={styles.btnLabel} numberOfLines={2}>{label}</Text>
    </AnimatedPressable>
  );
}

interface AlbumQuickActionsProps {
  onEdit: () => void;
}

export function AlbumQuickActions({ onEdit }: AlbumQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      
      <View style={styles.grid}>
        <ActionBtn label="Edit Details" icon="create-outline" onPress={onEdit} />
        <ActionBtn label="Manage Tracks" icon="list-outline" />
        <ActionBtn label="Edit Artwork" icon="image-outline" />
        <ActionBtn label="Update Release" icon="calendar-outline" />
        <ActionBtn label="Promote Album" icon="megaphone-outline" />
        <ActionBtn label="More Actions" icon="ellipsis-horizontal" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 12,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  btn: {
    width: "31.5%", // 3 columns with gap
    aspectRatio: 1, // square
    backgroundColor: CARD_BG,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 179, 166, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
