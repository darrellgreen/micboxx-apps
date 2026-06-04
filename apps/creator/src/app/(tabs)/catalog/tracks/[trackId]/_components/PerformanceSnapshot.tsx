import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from "react-native-svg";
import { tokens } from "@micboxx/theme";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";

interface PerformanceSnapshotProps {
  trackId: number;
}

function formatMetric(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function Sparkline({
  data,
  width = 100,
  height = 30,
  color = tokens.colors.accent,
  gradientId,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradientId: string;
}) {
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 2 - (v / max) * (height - 4),
  }));

  const linePts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPts = [
    `${points[0].x.toFixed(1)},${height}`,
    ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `${points[points.length - 1].x.toFixed(1)},${height}`,
  ].join(" ");

  const isGrey = color.includes("255,255,255") || color.includes("rgba(255,");
  const cleanColor = color.includes("rgba") ? color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgb($1,$2,$3)") : color;
  const topOpacity = isGrey ? 0.015 : 0.22;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={cleanColor} stopOpacity={topOpacity} />
          <Stop offset="1" stopColor={cleanColor} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points={areaPts} fill={`url(#${gradientId})`} />
      <Polyline points={linePts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

interface SnapshotCardProps {
  label: string;
  value: string;
  trendText?: string;
  trend: "up" | "down" | "flat";
  sparkData: number[];
  gradientId: string;
}

function SnapshotCard({ label, value, trendText, trend, sparkData, gradientId }: SnapshotCardProps) {
  const trendColor = trend === "up" ? tokens.colors.success : trend === "down" ? tokens.colors.danger : tokens.colors.textSecondary;
  const trendIcon = trend === "up" ? "arrow-up" : trend === "down" ? "arrow-down" : "trending-up-outline";
  const sparkColor = trend === "up" ? tokens.colors.accent : trend === "down" ? tokens.colors.danger : "rgba(255,255,255,0.18)";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {trendText ? (
        <View style={styles.trendRow}>
          <Ionicons name={trendIcon as any} size={11} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]} numberOfLines={1}>
            {trendText}
          </Text>
        </View>
      ) : (
        <View style={styles.trendRow}>
          <Text style={styles.trendText}>Stable</Text>
        </View>
      )}
      <View style={styles.sparkContainer}>
        <Sparkline data={sparkData} color={sparkColor} width={110} height={28} gradientId={gradientId} />
      </View>
    </View>
  );
}

export function PerformanceSnapshot({ trackId }: PerformanceSnapshotProps) {
  const { analytics } = useCreatorBootstrap();
  const topTracks = analytics?.catalogPerformance?.topTracks ?? [];
  const trackPerf = topTracks.find((t) => t.trackId === trackId);

  // Fallbacks if data doesn't exist
  const plays = trackPerf?.plays ?? null;
  const listeners = trackPerf?.uniqueListeners ?? null;
  const completionRate = trackPerf?.completionRate ?? null;
  const momentumLabel = trackPerf?.momentumLabel ?? "Steady";

  // Create deterministic mock data based on actual value or simple variations
  const sparkDataPlays = plays ? [plays * 0.4, plays * 0.6, plays * 0.5, plays * 0.8, plays * 0.9, plays * 0.85, plays] : [10, 20, 15, 30, 25, 35, 30];
  const sparkDataListeners = listeners ? [listeners * 0.3, listeners * 0.5, listeners * 0.45, listeners * 0.7, listeners * 0.8, listeners * 0.75, listeners] : [5, 12, 8, 15, 12, 18, 16];
  const sparkDataCompletion = completionRate ? [completionRate - 5, completionRate - 2, completionRate - 4, completionRate + 1, completionRate - 1, completionRate, completionRate] : [60, 62, 59, 65, 63, 66, 65];
  const sparkDataMomentum = [10, 10, 11, 10, 12, 11, 12];

  const momentumTrend = momentumLabel.includes("Up") || momentumLabel.includes("Growing") ? "up" : momentumLabel.includes("Down") ? "down" : "flat";

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Performance Snapshot</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SnapshotCard
          label="Plays"
          value={formatMetric(plays)}
          trend="up"
          trendText="+12% wk"
          sparkData={sparkDataPlays}
          gradientId={`plays-${trackId}`}
        />
        <SnapshotCard
          label="Listeners"
          value={formatMetric(listeners)}
          trend="up"
          trendText="+8% wk"
          sparkData={sparkDataListeners}
          gradientId={`listeners-${trackId}`}
        />
        <SnapshotCard
          label="Completion"
          value={completionRate != null ? `${completionRate}%` : "—"}
          trend="flat"
          trendText="Avg 68%"
          sparkData={sparkDataCompletion}
          gradientId={`completion-${trackId}`}
        />
        <SnapshotCard
          label="Momentum"
          value={momentumLabel.includes("Up") || momentumLabel.includes("Growing") ? "High" : "Steady"}
          trend={momentumTrend}
          trendText={momentumLabel}
          sparkData={sparkDataMomentum}
          gradientId={`momentum-${trackId}`}
        />
      </ScrollView>
    </View>
  );
}

const CARD_BG = "#131820";

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginVertical: 4,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
    paddingHorizontal: 0,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 10,
    paddingBottom: 4,
  },
  card: {
    width: 130,
    backgroundColor: CARD_BG,
    borderRadius: tokens.radiusSystem.section,
    padding: 12,
    gap: 4,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  value: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 16,
  },
  trendText: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "600",
  },
  sparkContainer: {
    marginTop: 6,
  },
});
