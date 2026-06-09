import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop, Circle, Rect, Path, Line } from "react-native-svg";

import { AnimatedPressable, Screen } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { tokens } from "@micboxx/theme";

const RECENT_ACTIVITY_LIMIT = 3;
const CARD_BG = "#131820";

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

/* ─── ghost sparkline (new-user placeholder) ──────────────────────────────── */

function GhostSparkline({ width = 120, height = 34 }: { width?: number; height?: number }) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const t = i / 23;
    const x = t * width;
    const y = height / 2 + Math.sin(t * Math.PI * 3.2 + 0.4) * (height * 0.22) + Math.sin(t * Math.PI * 7) * (height * 0.06);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={pts}
        fill="none"
        stroke="rgba(255,255,255,0.09)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="3 4"
      />
    </Svg>
  );
}

/* ─── waveform bars (hero decoration) ────────────────────────────────────── */

function WaveformBars({ color = tokens.colors.accent }: { color?: string }) {
  const bars = [0.45, 0.7, 0.55, 1.0, 0.8, 0.65, 0.9, 0.5, 0.75, 0.6];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 28 }}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: Math.round(h * 28),
            borderRadius: 2,
            backgroundColor: color,
            opacity: 0.3 + h * 0.5,
          }}
        />
      ))}
    </View>
  );
}

/* ─── sub-components (active user) ───────────────────────────────────────── */

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
        <Sparkline data={sparkData} color={sparkColor} width={128} height={34} gradientId={gradientId} />
      </View>
    </View>
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

/* ─── new-user components ─────────────────────────────────────────────────── */

function ActivationHeroCard() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: 80,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <Animated.View style={[s.heroCard, animStyle]}>
      {/* Teal glow strip at the top */}
      <View style={s.heroGlowStrip} />

      <View style={s.heroTop}>
        <View style={s.heroIconWrap}>
          <Ionicons name="rocket-outline" size={22} color={tokens.colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.heroEyebrow}>FIRST RELEASE</Text>
          <Text style={s.heroTitle}>Your creator dashboard is ready</Text>
        </View>
        <WaveformBars />
      </View>

      <Text style={s.heroBody}>
        Publish your first track to start seeing plays, listeners, and fan activity.
      </Text>

      <View style={s.heroCtas}>
        <AnimatedPressable
          style={s.heroPrimaryBtn}
          onPress={() => router.push("/create/release" as never)}
          haptic="light"
        >
          <Ionicons name="add" size={16} color="#000" />
          <Text style={s.heroPrimaryBtnText}>Create release</Text>
        </AnimatedPressable>

      </View>
    </Animated.View>
  );
}

function NewUserMetricCard({
  label,
  unlockText,
  gradientId,
}: {
  label: string;
  unlockText: string;
  gradientId: string;
}) {
  return (
    <View style={s.metricCard}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={s.metricValue}>0</Text>
      <Text style={s.metricUnlock}>{unlockText}</Text>
      <View style={s.metricSpark}>
        <GhostSparkline width={128} height={34} />
      </View>
    </View>
  );
}

function ChecklistItem({
  label,
  done,
  href,
  delay,
}: {
  label: string;
  done: boolean;
  href?: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
  };

  return (
    <Animated.View style={animStyle}>
      <AnimatedPressable
        style={s.checklistRow}
        onPress={href ? () => router.push(href as never) : undefined}
        haptic="selection"
      >
        <View style={[s.checkCircle, done && s.checkCircleDone]}>
          {done && <Ionicons name="checkmark" size={12} color="#000" />}
        </View>
        <Text style={[s.checkLabel, done && s.checkLabelDone]} numberOfLines={1}>
          {label}
        </Text>
        {!done && href ? (
          <Ionicons name="chevron-forward" size={13} color={tokens.colors.textSecondary} />
        ) : null}
      </AnimatedPressable>
    </Animated.View>
  );
}

function LaunchChecklist({
  hasAnyTrack,
  hasArtwork,
  hasRelease,
  hasPublished,
  hasCompleteProfile,
}: {
  hasAnyTrack: boolean;
  hasArtwork: boolean;
  hasRelease: boolean;
  hasPublished: boolean;
  hasCompleteProfile: boolean;
}) {
  const doneCount = [hasAnyTrack, hasArtwork, hasRelease, hasPublished, hasCompleteProfile].filter(Boolean).length;

  const items = [
    { label: "Upload your first track",          done: hasAnyTrack,          href: "/create/upload-push" },
    { label: "Add cover artwork",                 done: hasArtwork,           href: "/create/release" },
    { label: "Create a release",                  done: hasRelease,           href: "/create/release" },
    { label: "Publish or schedule your release",  done: hasPublished,         href: "/create/release" },
    { label: "Complete your artist profile",      done: hasCompleteProfile,   href: "/account" },
  ];

  return (
    <View style={s.checklistCard}>
      <View style={s.checklistHeader}>
        <Text style={s.sectionTitle}>Launch checklist</Text>
        <View style={s.checklistProgress}>
          <Text style={s.checklistProgressText}>{doneCount} / {items.length}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={s.checklistBar}>
        <View style={[s.checklistBarFill, { width: `${(doneCount / items.length) * 100}%` as any }]} />
      </View>

      <View style={s.checklistItems}>
        {items.map((item, i) => (
          <ChecklistItem
            key={item.label}
            label={item.label}
            done={item.done}
            href={item.done ? undefined : item.href}
            delay={300 + i * 70}
          />
        ))}
      </View>
    </View>
  );
}

function NewUserTopCards() {
  return (
    <View style={s.topRow}>
      {/* Top Track empty state */}
      <AnimatedPressable
        style={[s.topCard, s.topCardNew]}
        onPress={() => router.push("/create/upload-push" as never)}
        haptic="selection"
      >
        <Text style={s.topCardTitle}>Top Track</Text>
        <View style={s.topCardNewIcon}>
          <Ionicons name="musical-note" size={22} color={tokens.colors.accent} />
        </View>
        <Text style={s.topCardNewBody}>Your most-played track appears here after fans start listening.</Text>
        <View style={s.topCardNewCta}>
          <Text style={s.topCardNewCtaText}>Upload a track</Text>
          <Ionicons name="arrow-forward" size={12} color={tokens.colors.accent} />
        </View>
      </AnimatedPressable>

      {/* Top Listeners empty state */}
      <View style={[s.topCard, s.topCardNew]}>
        <Text style={s.topCardTitle}>Top Listeners</Text>
        <View style={s.topCardNewIcon}>
          <Ionicons name="people-outline" size={22} color="#a78bfa" />
        </View>
        <Text style={s.topCardNewBody}>Your most engaged fans appear as your audience grows.</Text>
      </View>
    </View>
  );
}

function NewUserEncouragementCard() {
  return (
    <View style={s.encourageCard}>
      <View style={s.encourageIconWrap}>
        <Ionicons name="flash" size={20} color={tokens.colors.accent} />
      </View>
      <View style={s.encourageLeft}>
        <Text style={s.encourageHeadline}>Ready when you are</Text>
        <Text style={s.encourageBody}>
          Your dashboard comes alive as soon as your first track is published.
        </Text>
      </View>
      <AnimatedPressable
        style={s.encourageBtn}
        onPress={() => router.push("/create/release" as never)}
        haptic="light"
      >
        <Text style={s.encourageBtnText}>Start</Text>
        <Ionicons name="arrow-forward" size={13} color={tokens.colors.accent} />
      </AnimatedPressable>
    </View>
  );
}

/* ─── screen ──────────────────────────────────────────────────────────────── */

export default function DashboardScreen() {
  const bootstrap = useCreatorBootstrap();

  const displayName = bootstrap.profile?.displayName ?? "Creator";
  const firstName = displayName.split(" ")[0] ?? displayName;
  const analytics   = bootstrap.analytics;

  const totalPlays       = analytics?.basic.totalPlays       ?? 0;
  const uniqueListeners  = analytics?.basic.uniqueListeners  ?? 0;
  const publishedTracks  = analytics?.basic.publishedTracks  ?? 0;
  const revenue          = analytics?.revenue?.snapshot?.grossRevenue ?? null;

  const playsOverTime = analytics?.hero?.playsOverTime ?? [];
  const sparkData     = playsOverTime.map((p) => p.plays);
  const trend         = computeTrend(playsOverTime);

  const topTrack   = analytics?.catalogPerformance.topTracks[0] ?? null;
  const topCountry = analytics?.basic.topCountry;

  const tracks = bootstrap.tracksSummary?.tracks ?? [];
  const albums = bootstrap.albumsSummary?.albums ?? [];
  const isNewUser = bootstrap.isNewUser;

  // Checklist state
  const hasAnyTrack       = tracks.length > 0;
  const hasArtwork        = tracks.some((t) => !!t.artworkUrl) || albums.some((a) => !!a.artworkUrl);
  const hasRelease        = albums.length > 0;
  const hasPublished      = publishedTracks > 0 || albums.some((a) => a.status.published);
  const needsProfile      = !bootstrap.profile?.bio?.trim() || !bootstrap.profile?.avatarUrl;
  const hasCompleteProfile = !needsProfile;

  const recentActivity = useMemo(() => {
    return [
      ...tracks
        .map((track) => ({
          key: `track-${track.id}`,
          title: track.title,
          releaseState: resolveTrackReleaseState(track.status),
          timestamp: track.timestamps.updatedAt,
          href: `/catalog/tracks/${track.id}`,
          type: "track" as const,
        }))
        .filter(({ releaseState }) => releaseState !== "draft"),
      ...albums
        .filter((album) => album.status.published)
        .map((album) => ({
          key: `album-${album.id}`,
          title: album.title,
          releaseState: "published" as const,
          timestamp: album.timestamps.updatedAt,
          href: `/catalog/albums/${album.id}`,
          type: "album" as const,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map((item) => {
        const releaseState = item.releaseState;
        const isPub = releaseState === "published";
        const isSched = releaseState === "scheduled";
        let icon: keyof typeof Ionicons.glyphMap = item.type === "album" ? "albums-outline" : "time-outline";
        let iconColor = "#a78bfa";
        let iconBg = "rgba(167,139,250,0.12)";
        if (isPub) { icon = "checkmark"; iconColor = tokens.colors.accent; iconBg = "rgba(0,179,166,0.12)"; }
        else if (isSched) { icon = "calendar-outline"; iconColor = "#22c55e"; iconBg = "rgba(34,197,94,0.12)"; }
        return { key: item.key, title: item.title, actionText: ` was ${releaseState}`, timestamp: activityDate(item.timestamp), icon, iconColor, iconBg, href: item.href };
      });
  }, [albums, tracks]);

  /* ── New-user layout ─────────────────────────────────────────────────── */
  if (isNewUser) {
    return (
      <Screen header={<ScreenHeader />} contentContainerStyle={s.screen}>
        {/* Welcome */}
        <View style={s.welcome}>
          <Text style={s.welcomeTitle}>Welcome to MicBoxx, {firstName}</Text>
          <Text style={s.welcomeSubtitle}>Set up your catalog and start building your fan hub.</Text>
        </View>

        {/* Hero activation card */}
        <ActivationHeroCard />

        {/* Overview empty state */}
        <View style={s.overviewEmptyCard}>
          <Ionicons name="bar-chart-outline" size={28} color={tokens.colors.textSecondary} />
          <Text style={s.overviewEmptyTitle}>Your insights will appear here</Text>
          <Text style={s.overviewEmptyBody}>
            Publish your first release to start seeing plays, listeners, and revenue in real time.
          </Text>
        </View>

        {/* Launch checklist */}
        <LaunchChecklist
          hasAnyTrack={hasAnyTrack}
          hasArtwork={hasArtwork}
          hasRelease={hasRelease}
          hasPublished={hasPublished}
          hasCompleteProfile={hasCompleteProfile}
        />

        {/* Top Track / Top Listeners */}
        <NewUserTopCards />

        {/* Encouragement card */}
        <NewUserEncouragementCard />

        <View style={{ height: 40 }} />
      </Screen>
    );
  }

  /* ── Active-user layout ──────────────────────────────────────────────── */
  return (
    <Screen header={<ScreenHeader />} contentContainerStyle={s.screen}>

      {/* ── Welcome ────────────────────────────────────────────────── */}
      <View style={s.welcome}>
        <Text style={s.welcomeTitle}>Welcome back, {displayName}</Text>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metricsScroll}>
          <MetricCard label="PLAYS" value={formatMetric(totalPlays)} trend={trend.up ? "up" : "flat"} percent={trend.percent} sparkData={sparkData} gradientId="sg_plays" />
          <MetricCard label="LISTENERS" value={formatMetric(uniqueListeners)} trend={uniqueListeners > 0 ? "up" : "flat"} percent={0} sparkData={sparkData.map((v) => Math.floor(v * 0.4))} gradientId="sg_listeners" />
          <MetricCard label="PUBLISHED TRACKS" value={String(publishedTracks)} trend="flat" percent={0} sparkData={sparkData.map(() => publishedTracks)} gradientId="sg_tracks" />
          <MetricCard label="REVENUE" value={revenue != null ? formatCurrency(revenue) : "—"} trend="flat" percent={0} noData={revenue == null} sparkData={sparkData.map(() => 0)} gradientId="sg_revenue" />
        </ScrollView>
      </View>

      {/* ── Top Track + Top City ───────────────────────────────────── */}
      <View style={s.topRow}>
        <View style={s.topCard}>
          <Text style={s.topCardTitle}>Top Track</Text>
          {topTrack ? (
            <View style={s.topTrackContent}>
              {topTrack.artworkUrl ? (
                <Image source={{ uri: topTrack.artworkUrl }} style={s.topTrackArt} contentFit="cover" />
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
            <Text style={s.emptyText}>Your most-played track will appear here after fans start listening.</Text>
          )}
        </View>

        <View style={s.topCard}>
          <Text style={s.topCardTitle}>Top Listeners</Text>
          {topCountry ? (
            <View style={s.topCityContent}>
              <Text style={s.topCityName}>{topCountry.countryCode}</Text>
              <Text style={s.topCityCount}>{formatMetric(topCountry.qualifiedPlays)} listeners</Text>
              <View style={s.skyline}>
                <Svg height="46" width="100%" viewBox="0 0 140 46">
                  <Rect x="5" y="25" width="8" height="21" fill="rgba(255, 255, 255, 0.025)" />
                  <Rect x="15" y="15" width="12" height="31" fill="rgba(255, 255, 255, 0.03)" />
                  <Rect x="30" y="28" width="6" height="18" fill="rgba(255, 255, 255, 0.02)" />
                  <Rect x="39" y="8" width="14" height="38" fill="rgba(255, 255, 255, 0.04)" />
                  <Rect x="44" y="2" width="4" height="6" fill="rgba(255, 255, 255, 0.04)" />
                  <Line x1="46" y1="2" x2="46" y2="0" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                  <Rect x="56" y="20" width="10" height="26" fill="rgba(255, 255, 255, 0.025)" />
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
            <Text style={s.emptyText}>Your most engaged fans will appear here as your audience grows.</Text>
          )}
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
                  { height: Math.round(ratio * 48), backgroundColor: i >= 5 ? tokens.colors.accent : tokens.colors.secondaryAccent, opacity: 0.7 + ratio * 0.3 },
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

  /* ── hero activation card ─────────────────────────────────────────────── */
  heroCard: {
    backgroundColor: "rgba(0,179,166,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,179,166,0.22)",
    overflow: "hidden",
    gap: 12,
    padding: 18,
    paddingTop: 0,
  },
  heroGlowStrip: {
    height: 3,
    backgroundColor: tokens.colors.accent,
    opacity: 0.7,
    marginHorizontal: -18,
    marginBottom: 6,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,179,166,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  heroEyebrow: {
    color: tokens.colors.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  heroBody: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  heroCtas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  heroPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tokens.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroPrimaryBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  heroSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroSecondaryBtnText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },

  /* metric unlock text */
  metricUnlock: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 13,
  },

  /* ── launch checklist ─────────────────────────────────────────────────── */
  checklistCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checklistProgress: {
    backgroundColor: "rgba(0,179,166,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  checklistProgressText: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  checklistBar: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 2,
    overflow: "hidden",
  },
  checklistBarFill: {
    height: 3,
    backgroundColor: tokens.colors.accent,
    borderRadius: 2,
  },
  checklistItems: {
    gap: 2,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkCircleDone: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  checkLabel: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  checkLabelDone: {
    color: tokens.colors.textSecondary,
    textDecorationLine: "line-through",
  },

  /* ── new user top cards ───────────────────────────────────────────────── */
  topCardNew: {
    gap: 8,
    minHeight: 140,
  },
  topCardNewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,179,166,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCardNewBody: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
    flex: 1,
  },
  topCardNewCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topCardNewCtaText: {
    color: tokens.colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },

  /* ── encouragement card ───────────────────────────────────────────────── */
  encourageCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  encourageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,179,166,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  encourageLeft: {
    flex: 1,
    gap: 3,
  },
  encourageHeadline: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  encourageBody: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
  },
  encourageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,179,166,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  encourageBtnText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  /* ── shared / active-user ─────────────────────────────────────────────── */
  overviewCard: {
    paddingTop: 4,
    gap: 12,
  },
  overviewEmptyCard: {
    backgroundColor: "#131820",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  overviewEmptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  overviewEmptyBody: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    overflow: "hidden",
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
    marginHorizontal: -12,
  },
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
    overflow: "hidden",
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
    lineHeight: 17,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bottomCard: {
    padding: 14,
    gap: 10,
  },
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
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
});
