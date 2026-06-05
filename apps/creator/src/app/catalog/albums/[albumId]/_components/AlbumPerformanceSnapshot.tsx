import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

interface SnapshotCardProps {
  label: string;
  value: string;
  trendText: string;
  trend: "up" | "down" | "flat";
  iconName: keyof typeof Ionicons.glyphMap;
  iconType: "teal" | "red";
}

function SnapshotCard({ label, value, trendText, trend, iconName, iconType }: SnapshotCardProps) {
  const isTeal = iconType === "teal";
  const iconBg = isTeal ? "rgba(0, 179, 166, 0.12)" : "rgba(217, 92, 92, 0.12)";
  const iconColor = isTeal ? "#00B3A6" : "#D95C5C";
  const trendColor = trend === "up" ? tokens.colors.success : tokens.colors.textSecondary;

  return (
    <View style={styles.card}>
      {/* Icon Circle */}
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>
      
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      
      <View style={styles.trendRow}>
        {trend === "up" ? (
          <Text style={[styles.trendText, { color: trendColor }]}>
            ↑ {trendText}
          </Text>
        ) : (
          <Text style={[styles.trendText, { color: trendColor }]}>—</Text>
        )}
      </View>
    </View>
  );
}

export function AlbumPerformanceSnapshot() {
  // Use exact values from mockup
  const playsVal = "1,248";
  const listenersVal = "382";
  const likesVal = "94";
  const downloadsVal = "276";

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SnapshotCard
          label="Total Plays"
          value={playsVal}
          trend="up"
          trendText="24%"
          iconName="play"
          iconType="teal"
        />
        <SnapshotCard
          label="Listeners"
          value={listenersVal}
          trend="up"
          trendText="18%"
          iconName="people"
          iconType="teal"
        />
        <SnapshotCard
          label="Likes"
          value={likesVal}
          trend="up"
          trendText="12%"
          iconName="heart"
          iconType="red"
        />
        <SnapshotCard
          label="Downloads"
          value={downloadsVal}
          trend="up"
          trendText="31%"
          iconName="download"
          iconType="teal"
        />
      </ScrollView>
    </View>
  );
}

const CARD_BG = "#131820";

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 8,
    width: "100%",
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    minWidth: 80,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  value: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 24,
    textAlign: "center",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 14,
  },
  trendText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
