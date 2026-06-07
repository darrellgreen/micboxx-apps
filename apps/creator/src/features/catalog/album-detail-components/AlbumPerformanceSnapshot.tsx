import { Ionicons } from "@expo/vector-icons";
import { getTrackPage } from "@micboxx/api";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";
import type { DashboardAlbum, DashboardTrack } from "@/contracts/creator";
import {
  AnimatedDashboardNumber,
  useReducedMotionPreference,
} from "@/features/catalog/components/AnimatedDashboardNumber";
import { getAlbumPlays, type PlayTimeseriesData } from "@/shared/api/creator-dashboard";

const CARD_BG = "#131820";

interface AlbumPerformanceSnapshotProps {
  album: DashboardAlbum;
}

type TrackStats = NonNullable<DashboardTrack["stats"]>;

interface SnapshotCardProps {
  label: string;
  value: string;
  numericValue?: number | null;
  trendText: string;
  trend: "up" | "down" | "flat";
  iconName: keyof typeof Ionicons.glyphMap;
  iconType: "teal" | "red";
  formatter?: (value: number) => string;
  reducedMotion?: boolean;
}

function SnapshotCard({
  label,
  value,
  numericValue,
  trendText,
  trend,
  iconName,
  iconType,
  formatter,
  reducedMotion,
}: SnapshotCardProps) {
  const isTeal = iconType === "teal";
  const iconBg = isTeal ? "rgba(0, 179, 166, 0.12)" : "rgba(217, 92, 92, 0.12)";
  const iconColor = isTeal ? "#00B3A6" : "#D95C5C";
  const trendColor =
    trend === "up"
      ? tokens.colors.success
      : trend === "down"
        ? tokens.colors.danger
        : tokens.colors.textSecondary;
  const trendPrefix = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const hasTrend = trendText.trim().length > 0;

  return (
    <View style={styles.card}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={16} color={iconColor} />
      </View>

      <Text style={styles.label}>{label}</Text>
      {numericValue != null && Number.isFinite(numericValue) ? (
        <AnimatedDashboardNumber
          value={numericValue}
          formatter={formatter}
          reducedMotion={reducedMotion}
          style={styles.value}
        />
      ) : (
        <Text style={styles.value}>{value}</Text>
      )}

      {hasTrend ? (
        <View style={styles.trendRow}>
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendPrefix} {trendText}
          </Text>
        </View>
      ) : (
        <View style={styles.trendRow} />
      )}
    </View>
  );
}

function formatMetric(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value);
}

function sumMetric(statsList: TrackStats[], metric: keyof TrackStats) {
  return statsList.reduce((sum, stats) => {
    const value = stats[metric];
    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function getRecentTrend(
  data: PlayTimeseriesData | null,
  metric: "plays" | "listeners",
): Pick<SnapshotCardProps, "trend" | "trendText"> {
  const series = data?.series ?? [];
  if (series.length < 14) {
    return { trend: "flat", trendText: "" };
  }

  const previous = series.slice(-14, -7).reduce((sum, point) => sum + (point[metric] ?? 0), 0);
  const current = series.slice(-7).reduce((sum, point) => sum + (point[metric] ?? 0), 0);

  if (previous === 0 && current > 0) {
    return { trend: "up", trendText: "New this week" };
  }

  if (previous === 0) {
    return { trend: "flat", trendText: "" };
  }

  const changePercent = Math.round(((current - previous) / previous) * 100);

  if (changePercent > 0) {
    return { trend: "up", trendText: `${changePercent}% vs 7d` };
  }

  if (changePercent < 0) {
    return { trend: "down", trendText: `${Math.abs(changePercent)}% vs 7d` };
  }

  return { trend: "flat", trendText: "0% vs 7d" };
}

export function AlbumPerformanceSnapshot({ album }: AlbumPerformanceSnapshotProps) {
  const reducedMotion = useReducedMotionPreference();
  const [playsData, setPlaysData] = useState<PlayTimeseriesData | null>(null);
  const [playsLoading, setPlaysLoading] = useState(true);
  const [trackStats, setTrackStats] = useState<TrackStats[]>([]);
  const [trackStatsLoading, setTrackStatsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadPlays() {
      setPlaysLoading(true);

      try {
        const payload = await getAlbumPlays(album.id, 14);
        if (active) {
          setPlaysData(payload);
        }
      } catch {
        if (active) {
          setPlaysData(null);
        }
      } finally {
        if (active) {
          setPlaysLoading(false);
        }
      }
    }

    void loadPlays();

    return () => {
      active = false;
    };
  }, [album.id]);

  useEffect(() => {
    let active = true;
    const trackSlugs = album.tracks
      .map((track) => track.slug?.trim())
      .filter((slug): slug is string => Boolean(slug));

    async function loadTrackStats() {
      if (trackSlugs.length === 0) {
        setTrackStats([]);
        setTrackStatsLoading(false);
        return;
      }

      setTrackStatsLoading(true);

      try {
        const results = await Promise.allSettled(
          trackSlugs.map((slug) => getTrackPage(slug)),
        );
        if (active) {
          setTrackStats(
            results.flatMap((result) => {
              if (result.status !== "fulfilled" || !result.value.track.stats) {
                return [];
              }
              return [result.value.track.stats as TrackStats];
            }),
          );
        }
      } catch {
        if (active) {
          setTrackStats([]);
        }
      } finally {
        if (active) {
          setTrackStatsLoading(false);
        }
      }
    }

    void loadTrackStats();

    return () => {
      active = false;
    };
  }, [album.id, album.tracks]);

  const playTrend = getRecentTrend(playsData, "plays");
  const listenerTrend = getRecentTrend(playsData, "listeners");
  const playsMetric = playsData?.totalPlays ?? null;
  const listenersMetric = playsData?.uniqueListeners ?? null;
  const likesMetric = trackStatsLoading ? null : sumMetric(trackStats, "likes");
  const downloadsMetric = trackStatsLoading
    ? null
    : sumMetric(trackStats, "downloads") || sumMetric(trackStats, "purchases");
  const playsVal = playsLoading && playsMetric == null ? "..." : formatMetric(playsMetric ?? 0);
  const listenersVal = playsLoading && listenersMetric == null ? "..." : formatMetric(listenersMetric ?? 0);
  const likesVal = trackStatsLoading ? "..." : formatMetric(likesMetric ?? 0);
  const downloadsVal = trackStatsLoading ? "..." : formatMetric(downloadsMetric ?? 0);

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
          numericValue={playsLoading && playsMetric == null ? null : playsMetric ?? 0}
          formatter={formatMetric}
          reducedMotion={reducedMotion}
          trend={playTrend.trend}
          trendText={playTrend.trendText}
          iconName="play"
          iconType="teal"
        />
        <SnapshotCard
          label="Listeners"
          value={listenersVal}
          numericValue={playsLoading && listenersMetric == null ? null : listenersMetric ?? 0}
          formatter={formatMetric}
          reducedMotion={reducedMotion}
          trend={listenerTrend.trend}
          trendText={listenerTrend.trendText}
          iconName="people"
          iconType="teal"
        />
        <SnapshotCard
          label="Likes"
          value={likesVal}
          numericValue={trackStatsLoading ? null : likesMetric ?? 0}
          formatter={formatMetric}
          reducedMotion={reducedMotion}
          trend="flat"
          trendText=""
          iconName="heart"
          iconType="red"
        />
        <SnapshotCard
          label="Downloads"
          value={downloadsVal}
          numericValue={trackStatsLoading ? null : downloadsMetric ?? 0}
          formatter={formatMetric}
          reducedMotion={reducedMotion}
          trend="flat"
          trendText=""
          iconName="download"
          iconType="teal"
        />
      </ScrollView>
    </View>
  );
}

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
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 26,
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
