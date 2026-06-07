import { Ionicons } from "@expo/vector-icons";
import { getTrackPage } from "@micboxx/api";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

import type { DashboardTrack } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { useTrackSocialState } from "@/features/social/hooks/useTrackSocialState";
import {
  getTrackPlays,
  type PlayTimeseriesData,
} from "@/shared/api/creator-dashboard";

interface PerformanceSnapshotProps {
  track: DashboardTrack;
}

type TrackStats = NonNullable<DashboardTrack["stats"]>;

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
      <Text style={styles.value}>{value}</Text>

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

function firstMetric(...values: Array<number | null | undefined>) {
  return values.find((value) => value != null && Number.isFinite(value)) ?? null;
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

export function PerformanceSnapshot({ track }: PerformanceSnapshotProps) {
  const { analytics } = useCreatorBootstrap();
  const [playsData, setPlaysData] = useState<PlayTimeseriesData | null>(null);
  const [playsLoading, setPlaysLoading] = useState(true);
  const [publicStats, setPublicStats] = useState<TrackStats | null>(track.stats ?? null);

  const trackPerf = useMemo(() => {
    const topTracks = analytics?.catalogPerformance?.topTracks ?? [];
    const advancedTracks = analytics?.advanced?.topPerformingTracks ?? [];

    return (
      topTracks.find((item) => item.trackId === track.id) ??
      advancedTracks.find((item) => item.trackId === track.id) ??
      null
    );
  }, [analytics?.advanced?.topPerformingTracks, analytics?.catalogPerformance?.topTracks, track.id]);

  const socialState = useTrackSocialState({
    trackUuid: track.uuid,
    trackOwnerUid: null,
    trackTitle: track.title,
    trackHref: track.publicHref,
    initialComments: 0,
    initialFavourites: 0,
    initialLikes: 0,
  });

  useEffect(() => {
    let active = true;

    async function loadPlays() {
      setPlaysLoading(true);

      try {
        const payload = await getTrackPlays(track.id, 14);
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
  }, [track.id]);

  useEffect(() => {
    let active = true;

    async function loadPublicStats() {
      if (!track.slug) {
        setPublicStats(track.stats ?? null);
        return;
      }

      try {
        const page = await getTrackPage(track.slug);
        if (active) {
          setPublicStats(page.track.stats ?? track.stats ?? null);
        }
      } catch {
        if (active) {
          setPublicStats(track.stats ?? null);
        }
      }
    }

    void loadPublicStats();

    return () => {
      active = false;
    };
  }, [track.slug, track.stats]);

  const playTrend = getRecentTrend(playsData, "plays");
  const listenerTrend = getRecentTrend(playsData, "listeners");
  const playsMetric = firstMetric(
    publicStats?.plays,
    track.stats?.plays,
    trackPerf?.plays,
    playsData?.totalPlays,
  );
  const listenersMetric = firstMetric(
    publicStats?.uniqueListeners,
    track.stats?.uniqueListeners,
    trackPerf?.uniqueListeners,
    playsData?.uniqueListeners,
  );
  const likesMetric = firstMetric(publicStats?.likes, track.stats?.likes, socialState.likeCount);
  const downloadsMetric = firstMetric(
    publicStats?.downloads,
    track.stats?.downloads,
    publicStats?.purchases,
    track.stats?.purchases,
  );
  const playsVal = playsLoading && playsMetric == null
    ? "..."
    : formatMetric(playsMetric);
  const listenersVal = formatMetric(listenersMetric);
  const likesVal = formatMetric(likesMetric);
  const downloadsVal = formatMetric(downloadsMetric);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <SnapshotCard
          label="Plays"
          value={playsVal}
          trend={playTrend.trend}
          trendText={playTrend.trendText}
          iconName="play"
          iconType="teal"
        />
        <SnapshotCard
          label="Listeners"
          value={listenersVal}
          trend={listenerTrend.trend}
          trendText={listenerTrend.trendText}
          iconName="people"
          iconType="teal"
        />
        <SnapshotCard
          label="Likes"
          value={likesVal}
          trend="flat"
          trendText=""
          iconName="heart"
          iconType="red"
        />
        <SnapshotCard
          label="Downloads"
          value={downloadsVal}
          trend="flat"
          trendText=""
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
