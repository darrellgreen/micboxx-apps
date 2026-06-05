import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

const CARD_BG = "#131820";

interface HealthRowProps {
  label: string;
}

function HealthRow({ label }: HealthRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Ionicons name="checkmark-circle" size={16} color={tokens.colors.success} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.statusText}>Complete</Text>
    </View>
  );
}

export function AlbumReleaseHealthPanel() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Release Health</Text>
      
      <View style={styles.rowsContainer}>
        <HealthRow label="Artwork" />
        <HealthRow label="Tracks" />
        <HealthRow label="Metadata" />
        <HealthRow label="Publishing Rights" />
        <HealthRow label="Release Info" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flex: 1,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  rowsContainer: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  statusText: {
    color: tokens.colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
});
