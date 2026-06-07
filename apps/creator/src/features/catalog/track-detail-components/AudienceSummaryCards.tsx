import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Rect, Path, Line } from "react-native-svg";
import { tokens } from "@micboxx/theme";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { getTrackGeography } from "@/shared/api/creator-dashboard";
import type { TrackGeographyPayload } from "@/contracts/creator";

interface AudienceSummaryCardsProps {
  trackId: number;
}

const CARD_BG = "#131820";

// Donut calculations: R = 18, circumference = 2 * PI * 18 = 113.1
const C = 113.1;

const SOURCE_LABELS: Record<string, string> = {
  public_track: "Track page",
  discover: "Discover",
  search: "Search",
  playlist: "Playlist",
  artist_profile: "Artist profile",
  album: "Album",
  external: "External",
  unknown: "Unknown",
  other: "Other",
};

export function AudienceSummaryCards({ trackId }: AudienceSummaryCardsProps) {
  const bootstrap = useCreatorBootstrap();
  const analytics = bootstrap.analytics;
  const sourceBreakdown = analytics?.advanced?.sourceBreakdown ?? [];

  const [geoData, setGeoData] = useState<TrackGeographyPayload | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchGeo() {
      setLoadingGeo(true);
      try {
        const res = await getTrackGeography(trackId);
        if (active) {
          setGeoData(res);
        }
      } catch (err) {
        console.error("Failed to fetch track geography:", err);
      } finally {
        if (active) {
          setLoadingGeo(false);
        }
      }
    }
    fetchGeo();
    return () => {
      active = false;
    };
  }, [trackId]);

  // Resolve geography display
  let subtitle = "Top Listener City";
  let cityName = "Loading...";
  let countLabel = "";
  let isFallback = false;

  if (!loadingGeo) {
    if (geoData?.topCity) {
      cityName = `${geoData.topCity.city}, ${geoData.topCity.regionCode}`;
      countLabel = `${geoData.topCity.qualifiedPlays} plays`;
    } else {
      // Fallback to creator-wide analytics
      isFallback = true;
      const topCountry = analytics?.basic?.topCountry;
      if (topCountry) {
        cityName = topCountry.countryCode;
        countLabel = `${topCountry.qualifiedPlays} plays`;
        subtitle = "Top Location (Catalog)";
      } else {
        cityName = "No data yet";
        countLabel = "0 plays";
        subtitle = "Top Listener City";
      }
    }
  }

  // Resolve source breakdown segments dynamically
  let segments = [];

  if (sourceBreakdown.length > 0) {
    const sourceColors = ["#00B3A6", "#79C96B", "#a78bfa", "#3b82f6"];
    const sorted = [...sourceBreakdown].sort((a, b) => b.sharePercent - a.sharePercent);
    const topItems = sorted.slice(0, 3);
    const otherItems = sorted.slice(3);

    const mappedSources: Array<{ sourceType: string; sharePercent: number; color: string }> = [];
    topItems.forEach((item, index) => {
      mappedSources.push({
        sourceType: item.sourceType,
        sharePercent: item.sharePercent,
        color: sourceColors[index],
      });
    });

    if (otherItems.length > 0) {
      const otherShare = otherItems.reduce((sum, item) => sum + item.sharePercent, 0);
      if (otherShare > 0) {
        mappedSources.push({
          sourceType: "other",
          sharePercent: otherShare,
          color: sourceColors[3],
        });
      }
    }

    let runningPercentSum = 0;
    segments = mappedSources.map((source) => {
      const percent = source.sharePercent;
      const strokeDasharray = `${(percent / 100) * C} ${C}`;
      const strokeDashoffset = -((runningPercentSum / 100) * C);
      runningPercentSum += percent;
      return {
        label: SOURCE_LABELS[source.sourceType] ?? source.sourceType,
        percent,
        color: source.color,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  } else {
    // Empty state fallback segment
    segments = [
      {
        label: "No data",
        percent: 100,
        color: "rgba(255, 255, 255, 0.08)",
        strokeDasharray: `${C} ${C}`,
        strokeDashoffset: 0,
      },
    ];
  }

  return (
    <View style={styles.container}>
      {/* Geography Card */}
      <View style={[styles.card, styles.geoCard]}>
        <View style={styles.geoTextContainer}>
          <Text style={styles.cardSubtitle} numberOfLines={1}>{subtitle}</Text>
          <Text style={styles.cityName} numberOfLines={1}>{cityName}</Text>
          <Text style={styles.listenersCount} numberOfLines={1}>{countLabel}</Text>
          {isFallback && (
            <Text style={styles.fallbackLabel} numberOfLines={1}>
              Audience across catalog
            </Text>
          )}
        </View>

        {/* SVG Skyline graphic at the bottom of the card */}
        <View style={styles.skyline}>
          <Svg height="46" width="100%" viewBox="0 0 140 46">
            <Rect x="5" y="25" width="8" height="21" fill="rgba(255, 255, 255, 0.025)" />
            <Rect x="15" y="15" width="12" height="31" fill="rgba(255, 255, 255, 0.03)" />
            <Rect x="30" y="28" width="6" height="18" fill="rgba(255, 255, 255, 0.02)" />

            {/* Empire State like building */}
            <Rect x="39" y="8" width="14" height="38" fill="rgba(255, 255, 255, 0.04)" />
            <Rect x="44" y="2" width="4" height="6" fill="rgba(255, 255, 255, 0.04)" />
            <Line x1="46" y1="2" x2="46" y2="0" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />

            <Rect x="56" y="20" width="10" height="26" fill="rgba(255, 255, 255, 0.025)" />

            {/* Chrysler like building with spire */}
            <Rect x="69" y="12" width="12" height="34" fill="rgba(255, 255, 255, 0.035)" />
            <Path d="M 69 12 L 75 4 L 81 12 Z" fill="rgba(255, 255, 255, 0.035)" />

            <Rect x="84" y="23" width="8" height="23" fill="rgba(255, 255, 255, 0.02)" />
            <Rect x="94" y="16" width="10" height="30" fill="rgba(255, 255, 255, 0.03)" />
            <Rect x="107" y="26" width="12" height="20" fill="rgba(255, 255, 255, 0.02)" />
            <Rect x="122" y="18" width="14" height="28" fill="rgba(255, 255, 255, 0.025)" />
          </Svg>
        </View>
      </View>

      {/* Source Breakdown Card */}
      <View style={styles.card}>
        <Text style={styles.cardSubtitle}>Source Breakdown</Text>

        <View style={styles.donutRow}>
          {/* Donut Chart */}
          <View style={styles.donutContainer}>
            <Svg width="64" height="64" viewBox="0 0 40 40">
              <Circle
                cx="20"
                cy="20"
                r="18"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="4"
              />
              {segments.map((seg, i) => (
                <Circle
                  key={i}
                  cx="20"
                  cy="20"
                  r="18"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="4"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform="rotate(-90 20 20)"
                />
              ))}
            </Svg>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {segments.map((seg, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.dot, { backgroundColor: seg.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {seg.label}
                  </Text>
                </View>
                {seg.label !== "No data" && (
                  <Text style={styles.legendPercent}>{seg.percent}%</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 4,
  },
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    height: 110,
    justifyContent: "space-between",
  },
  geoCard: {
    position: "relative",
    overflow: "hidden",
  },
  geoTextContainer: {
    zIndex: 2,
    flex: 1,
    justifyContent: "space-between",
  },
  cardSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  cityName: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  listenersCount: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  fallbackLabel: {
    color: tokens.colors.textMuted || "#6b7280",
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
  },
  skyline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 46,
    opacity: 0.8,
    zIndex: 1,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginTop: 6,
  },
  donutContainer: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    flex: 1,
    gap: 3,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "600",
    flex: 1,
  },
  legendPercent: {
    color: tokens.colors.textPrimary,
    fontSize: 9,
    fontWeight: "700",
  },
});
