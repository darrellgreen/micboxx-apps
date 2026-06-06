import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop, Circle, Rect, Path, Line } from "react-native-svg";

import { AnimatedPressable, Screen } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreateEntryHref } from "@/features/bootstrap/routes";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { tokens } from "@micboxx/theme";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatMetric(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function activityDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function computeTrend(data: { plays: number }[]): { up: boolean; percent: number } {
  if (data.length < 2) return { up: false, percent: 0 };
  const half = Math.floor(data.length / 2);
  const prev = data.slice(0, half).reduce((s, d) => s + d.plays, 0);
  const curr = data.slice(half).reduce((s, d) => s + d.plays, 0);
  if (prev === 0) return { up: curr > 0, percent: 0 };
  const pct = Math.round(Math.abs(((curr - prev) / prev) * 100));
  return { up: curr >= prev, percent: pct };
}

/* ─── sparkline ───────────────────────────────────────────────────────────── */

function Sparkline({
  data,
  width = 100,
  height = 36,
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
    y: height - 4 - (v / max) * (height - 8),
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

/* ─── sub-components ──────────────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  trend,
  percent,
  noData,
  sparkData,
  gradientId,
}: {
  label: string;
  value: string;
  trend: "up" | "down" | "flat";
  percent: number;
  noData?: boolean;
  sparkData: number[];
  gradientId: string;
}) {
  const trendColor =
    trend === "up" ? "#22c55e" : trend === "down" ? "#ef4444" : tokens.colors.textSecondary;
  const trendIcon =
    trend === "up" ? "arrow-up" : trend === "down" ? "arrow-down" : "remove";
  const sparkColor =
    trend === "up" ? tokens.colors.accent : trend === "down" ? "#ef4444" : "rgba(255,255,255,0.18)";

  return (
    <View style={s.metricCard}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>{value}</Text>
      {noData ? (
        <Text style={s.metricNoData}>No data yet</Text>
      ) : (
        <View style={s.metricTrend}>
          <Ionicons name={trendIcon} size={11} color={trendColor} />
          <Text style={[s.metricTrendText, { color: trendColor }]}>
            {percent > 0 ? `${percent}%` : "0%"}
          </Text>
        </View>
      )}
      <View style={s.metricSpark}>
        <Sparkline data={sparkData} color={sparkColor} width={120} height={34} gradientId={gradientId} />
      </View>
    </View>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={s.actionBtn} onPress={onPress} haptic="selection">
      <View style={s.actionIconCircle}>
        <Ionicons name={icon} size={20} color={tokens.colors.accent} />
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function ActivityRow({
  icon,
  iconColor,
  iconBg,
  title,
  actionText,
  timestamp,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  actionText: string;
  timestamp: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={s.activityRow} onPress={onPress} haptic="selection">
      <View style={[s.activityIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <View style={s.activityText}>
        <Text style={s.activityTitle} numberOfLines={2}>
          <Text style={s.activityTitleBold}>{title}</Text>
          <Text style={s.activityTitleLight}>{actionText}</Text>
        </Text>
        <Text style={s.activityTime}>{timestamp}</Text>
      </View>
      <Ionicons name="chevron-forward" size={13} color={tokens.colors.textSecondary} />
    </AnimatedPressable>
  );
}



/* ─── screen ──────────────────────────────────────────────────────────────── */

export default function DashboardScreen() {
  const bootstrap = useCreatorBootstrap();

  const displayName = bootstrap.profile?.displayName ?? "Creator";
  const analytics   = bootstrap.analytics;

  const totalPlays       = analytics?.basic.totalPlays       ?? 0;
  const uniqueListeners  = analytics?.basic.uniqueListeners  ?? 0;
  const publishedTracks  = analytics?.basic.publishedTracks  ?? 0;
  const revenue          = analytics?.revenue?.snapshot?.grossRevenue ?? null;

  const playsOverTime = analytics?.hero?.playsOverTime ?? [];
  const sparkData     = playsOverTime.map((p) => p.plays);
  const trend         = computeTrend(playsOverTime);

  const topTrack  = analytics?.catalogPerformance.topTracks[0] ?? null;
  const topCountry = analytics?.basic.topCountry;

  const uploadHref = resolveCreateEntryHref({
    createEntryTarget: bootstrap.createEntryTarget,
    tracksSummary: bootstrap.tracksSummary,
    uploadOptions: bootstrap.uploadOptions,
  });

  const canCreateAlbums = Boolean(
    bootstrap.uploadOptions?.currentUser.permissions?.canCreateAlbums ||
      bootstrap.uploadOptions?.currentUser.permissions?.canAdministerAlbums,
  );

  const recentActivity = useMemo(() => {
    const tracks = bootstrap.tracksSummary?.tracks ?? [];
    return tracks
      .map((track) => ({
        track,
        releaseState: resolveTrackReleaseState(track.status),
      }))
      .filter(({ releaseState }) => releaseState !== "draft")
      .sort(
        (a, b) =>
          new Date(b.track.timestamps.updatedAt).getTime() -
          new Date(a.track.timestamps.updatedAt).getTime(),
      )
      .slice(0, 3)
      .map(({ track, releaseState }) => {
        const isPub = releaseState === "published";
        const isSched = releaseState === "scheduled";
        
        let icon: keyof typeof Ionicons.glyphMap = "time-outline";
        let iconColor = "#a78bfa";
        let iconBg = "rgba(167,139,250,0.12)";

        if (isPub) {
          icon = "checkmark";
          iconColor = tokens.colors.accent;
          iconBg = "rgba(0,179,166,0.12)";
        } else if (isSched) {
          icon = "calendar-outline";
          iconColor = "#22c55e";
          iconBg = "rgba(34,197,94,0.12)";
        }

        return {
          key: `track-${track.id}`,
          title: track.title,
          actionText: ` was ${releaseState}`,
          timestamp: activityDate(track.timestamps.updatedAt),
          icon,
          iconColor,
          iconBg,
          href: `/catalog/tracks/${track.id}`,
        };
      });
  }, [bootstrap.tracksSummary]);

  const needsProfile = !bootstrap.profile?.bio?.trim() || !bootstrap.profile?.avatarUrl;

  return (
    <Screen header={<ScreenHeader />} contentContainerStyle={s.screen}>

      {/* ── Welcome ────────────────────────────────────────────────── */}
      <View style={s.welcome}>
        <Text style={s.welcomeTitle}>Welcome back, {displayName} 👋</Text>
        <Text style={s.welcomeSubtitle}>Here{"'"}s what{"'"}s happening with your music today.</Text>
      </View>

      {/* ── Overview ───────────────────────────────────────────────── */}
      <View style={s.overviewCard}>
        <View style={s.overviewHeader}>
          <Text style={s.sectionTitle}>Overview</Text>
          <View style={s.overviewPeriod}>
            <Text style={s.overviewPeriodText}>Last 7 Days</Text>
            <Ionicons name="chevron-down" size={13} color={tokens.colors.accent} />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.metricsScroll}
        >
          <MetricCard
            label="PLAYS"
            value={formatMetric(totalPlays)}
            trend={trend.up ? "up" : "flat"}
            percent={trend.percent}
            sparkData={sparkData}
            gradientId="sg_plays"
          />
          <MetricCard
            label="LISTENERS"
            value={formatMetric(uniqueListeners)}
            trend={uniqueListeners > 0 ? "up" : "flat"}
            percent={0}
            sparkData={sparkData.map((v) => Math.floor(v * 0.4))}
            gradientId="sg_listeners"
          />
          <MetricCard
            label="PUBLISHED TRACKS"
            value={String(publishedTracks)}
            trend="flat"
            percent={0}
            sparkData={sparkData.map(() => publishedTracks)}
            gradientId="sg_tracks"
          />
          <MetricCard
            label="REVENUE"
            value={revenue != null ? formatCurrency(revenue) : "—"}
            trend="flat"
            percent={0}
            noData={revenue == null}
            sparkData={sparkData.map(() => 0)}
            gradientId="sg_revenue"
          />
        </ScrollView>
      </View>

      {/* ── Top Track + Top City ───────────────────────────────────── */}
      <View style={s.topRow}>
        {/* Top Track */}
        <View style={s.topCard}>
          <Text style={s.topCardTitle}>Top Track</Text>
          {topTrack ? (
            <View style={s.topTrackContent}>
              {topTrack.artworkUrl ? (
                <Image
                  source={{ uri: topTrack.artworkUrl }}
                  style={s.topTrackArt}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.topTrackArt, s.topTrackArtFallback]}>
                  <Ionicons name="musical-note" size={22} color={tokens.colors.textSecondary} />
                </View>
              )}
              <View style={s.topTrackCopy}>
                <Text style={s.topTrackName} numberOfLines={1}>{topTrack.title}</Text>
                <Text style={s.topTrackArtist} numberOfLines={1}>{displayName}</Text>
                <Text style={s.topTrackPlays}>{formatMetric(topTrack.plays)} plays</Text>
              </View>
            </View>
          ) : (
            <Text style={s.emptyText}>No track data yet</Text>
          )}
        </View>

        {/* Top Listener Location */}
        <View style={s.topCard}>
          <Text style={s.topCardTitle}>Top Listeners</Text>
          {topCountry ? (
            <View style={s.topCityContent}>
              <Text style={s.topCityName}>{topCountry.countryCode}</Text>
              <Text style={s.topCityCount}>{formatMetric(topCountry.qualifiedPlays)} listeners</Text>
              
              {/* SVG Skyline overlay at the bottom of the card */}
              <View style={s.skyline}>
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
          ) : (
            <Text style={s.emptyText}>No data yet</Text>
          )}
        </View>
      </View>

      {/* ── Action Center ──────────────────────────────────────────── */}
      <View style={s.actionCard}>
        <Text style={s.sectionTitle}>Action Center</Text>
        <View style={s.actionRow}>
          <ActionBtn
            icon="cloud-upload-outline"
            label="Upload"
            onPress={() => router.push(uploadHref as never)}
          />
          <ActionBtn
            icon="disc-outline"
            label="Album"
            onPress={() => router.push("/create/album-push" as never)}
          />
          <ActionBtn
            icon="radio-outline"
            label="Go Live"
            onPress={() => router.push("/rooms" as never)}
          />
          <ActionBtn
            icon="person-outline"
            label="Profile"
            onPress={() => router.push("/account-push" as never)}
          />
        </View>
      </View>

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <View style={s.bottomCard}>
        <Text style={s.sectionTitle}>Recent Activity</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map((item) => (
            <ActivityRow
              key={item.key}
              icon={item.icon}
              iconColor={item.iconColor}
              iconBg={item.iconBg}
              title={item.title}
              actionText={item.actionText}
              timestamp={item.timestamp}
              onPress={() => router.push(item.href as never)}
            />
          ))
        ) : (
          <Text style={s.emptyText}>No recent activity</Text>
        )}
      </View>

      {/* ── Creator Insight Card ───────────────────────────────────── */}
      {trend.percent > 0 ? (
        <View style={s.insightCard}>
          <Text style={s.insightStar}>✨</Text>
          <View style={s.insightLeft}>
            <Text style={s.insightHeadline}>Keep the momentum going</Text>
            <Text style={s.insightBody}>You{"'"}re getting more plays this week.</Text>
            <View style={s.insightTrend}>
              <Ionicons name="arrow-up" size={12} color={tokens.colors.accent} />
              <Text style={s.insightTrendText}>{trend.percent}% vs last 7 days</Text>
            </View>
          </View>
          <View style={s.insightBarChart}>
            {[0.4, 0.55, 0.45, 0.7, 0.6, 0.85, 1.0].map((ratio, i) => (
              <View
                key={i}
                style={[
                  s.insightBar,
                  {
                    height: Math.round(ratio * 48),
                    backgroundColor: i >= 5 ? tokens.colors.accent : tokens.colors.secondaryAccent,
                    opacity: 0.7 + ratio * 0.3,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </Screen>
  );
}

/* ─── styles ──────────────────────────────────────────────────────────────── */

const CARD_BG = "#131820";

const s = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    gap: 14,
  },

  /* welcome */
  welcome: {
    gap: 4,
    paddingTop: 4,
  },
  welcomeTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
  },

  /* overview */
  overviewCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  overviewPeriod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  overviewPeriodText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  metricsScroll: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  metricCard: {
    width: 130,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metricValue: {
    color: tokens.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  metricTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metricTrendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricNoData: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "400",
  },
  metricSpark: {
    marginTop: 8,
  },

  /* top row */
  topRow: {
    flexDirection: "row",
    gap: 10,
  },
  topCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    position: "relative",
  },
  topCardTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  topTrackContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topTrackArt: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: tokens.colors.bgApp,
    flexShrink: 0,
  },
  topTrackArtFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  topTrackCopy: {
    flex: 1,
    gap: 2,
  },
  topTrackName: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  topTrackArtist: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginVertical: 1,
  },
  topTrackPlays: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  topCityContent: {
    gap: 4,
    flex: 1,
  },
  topCityName: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  topCityCount: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  skyline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 46,
    opacity: 0.8,
  },
  emptyText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "400",
  },

  /* action center */
  actionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    marginHorizontal: 4,
  },
  actionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },

  /* bottom row */
  bottomRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bottomCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },

  /* activity */
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityText: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 11,
    lineHeight: 15,
  },
  activityTitleBold: {
    fontWeight: "700",
  },
  activityTitleLight: {
    fontWeight: "400",
  },
  activityTime: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "400",
  },



  /* insight card */
  insightCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  insightLeft: {
    flex: 1,
    gap: 6,
  },
  insightStar: {
    fontSize: 22,
    flexShrink: 0,
  },
  insightHeadline: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  insightBody: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 17,
  },
  insightTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  insightTrendText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  insightBarChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  insightBar: {
    width: 10,
    borderRadius: 4,
  },

  /* shared */
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
