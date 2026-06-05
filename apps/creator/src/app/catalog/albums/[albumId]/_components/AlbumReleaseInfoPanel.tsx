import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbum } from "@/contracts/creator";

const CARD_BG = "#131820";

interface ReleaseInfoRowProps {
  label: string;
  value: string;
  isGreenValue?: boolean;
}

function ReleaseInfoRow({ label, value, isGreenValue }: ReleaseInfoRowProps) {
  const valueColor = isGreenValue ? "#7AC414" : tokens.colors.textPrimary; // Green highlight for Public visibility or success
  const iconColor = isGreenValue ? "#7AC414" : tokens.colors.textSecondary;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        <AnimatedPressable onPress={() => {}} style={styles.editBtn}>
          <Ionicons name="pencil" size={12} color={iconColor} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

interface AlbumReleaseInfoPanelProps {
  album: DashboardAlbum;
}

export function AlbumReleaseInfoPanel({ album }: AlbumReleaseInfoPanelProps) {
  // Format release date from publishAt or fallback to createdAt
  let releaseDateVal = "Not set";
  const dateToFormat = album.status.publishAt || album.timestamps.createdAt;
  if (dateToFormat) {
    try {
      const date = new Date(dateToFormat);
      releaseDateVal = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      releaseDateVal = "Not set";
    }
  }

  const labelVal = album.labelImprint && album.labelImprint.trim() !== "" 
    ? album.labelImprint 
    : "Not set";
    
  const catNumVal = "Not set"; // Catalog number not yet in database entity schema
  
  const explicitVal = album.explicitContent === true
    ? "Yes"
    : album.explicitContent === false
      ? "No"
      : "Not set";

  const visibilityVal = album.status.published ? "Public" : "Private";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Release Info</Text>
      
      <View style={styles.rowsContainer}>
        <ReleaseInfoRow label="Release Date" value={releaseDateVal} />
        <ReleaseInfoRow label="Label" value={labelVal} />
        <ReleaseInfoRow label="Catalog Number" value={catNumVal} />
        <ReleaseInfoRow label="Explicit Content" value={explicitVal} />
        <ReleaseInfoRow label="Visibility" value={visibilityVal} isGreenValue={album.status.published} />
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
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  valueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: {
    fontSize: 12,
    fontWeight: "600",
  },
  editBtn: {
    padding: 2,
  },
});
