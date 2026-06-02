import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {

  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Polyline,
  Stop,
} from "react-native-svg";

import type { DashboardAnalyticsPeriod } from "@/contracts/creator";
import { AnimatedPressable } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ErrorState, Panel, ScreenShell } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

const PERIOD_OPTIONS: DashboardAnalyticsPeriod[] = ["7d", "30d", "90d"];

const SOURCE_LABELS: Record<string, string> = {
  public_track: "Track page",
  discover: "Discover",
  search: "Search",
  playlist: "Playlist",
  artist_profile: "Artist profile",
  album: "Album",
  external: "External",
  unknown: "Unknown",
};

function formatMetric(value: number | null | undefined) {
  const normalized = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: normalized >= 1000 ? 1 : 0,
  }).format(normalized);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPeriodLabel(period: DashboardAnalyticsPeriod) {
  switch (period) {
    case "7d":
      return "Last 7 Days";
    case "30d":
      return "Last 30 Days";
    case "90d":
      return "Last 90 Days";
    default:
      return "Current Period";
  }
}

function formatPeriodChip(period: DashboardAnalyticsPeriod) {
  if (period === "7d") {
    return "7D";
  }

  if (period === "30d") {
    return "30D";
  }

  return "90D";
}

function formatSourceLabel(sourceType: string) {
  return SOURCE_LABELS[sourceType] ?? sourceType;
}

function getRelativeBarRatio(value: number, maxValue: number, minPercent = 12) {
  if (maxValue <= 0) {
    return minPercent / 100;
  }

  const ratio = value / maxValue;
  return Math.max(minPercent / 100, Math.min(1, ratio));
}

type TrendPoint = { label: string; plays: number };

function TrendChart({ points }: { points: TrendPoint[] }) {
  const width = 760;
  const height = 260;
  const paddingX = 18;
  const paddingTop = 18;
  const paddingBottom = 30;
  const baseline = height - paddingBottom;
  const chartHeight = baseline - paddingTop;
  const maxValue = Math.max(1, ...points.map((point) => point.plays));
  const stepX = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = paddingX + stepX * index;
    const y = baseline - (point.plays / maxValue) * chartHeight;
    return { ...point, x, y };
  });
  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${paddingX} ${baseline} L ${polylinePoints} L ${width - paddingX} ${baseline} Z`;
  const highlight = coordinates.reduce(
    (best, point) => (point.plays >= best.plays ? point : best),
    coordinates[0] ?? { label: "", plays: 0, x: paddingX, y: baseline },
  );

  return (
    <View style={styles.trendChartWrap}>
      <Svg viewBox={`0 0 ${width} ${height}`} style={styles.trendChartSvg}>
        <Defs>
          <SvgLinearGradient id="analytics-area" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="rgba(121,201,107,0.15)" />
            <Stop offset="100%" stopColor="rgba(121,201,107,0.0)" />
          </SvgLinearGradient>
        </Defs>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = paddingTop + chartHeight * fraction;
          return (
            <Line
              key={fraction}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke={tokens.colors.gridSoft}
              strokeDasharray="4 8"
            />
          );
        })}
        <Path d={areaPath} fill="url(#analytics-area)" />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={tokens.colors.accent}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={highlight.x} cy={highlight.y} r={7} fill="rgba(121,201,107,0.26)" />
        <Circle cx={highlight.x} cy={highlight.y} r={3.5} fill="rgba(121,201,107,1)" />
      </Svg>
      <View style={styles.trendLabels}>
        {points.map((point) => (
          <Text key={point.label} style={styles.trendLabelText}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LockedInsightCard({
  title,
  description,
  eyebrow,
  ctaHref,
  ctaLabel = "Compare artist plans",
  placeholder = "trend",
}: {
  title: string;
  description: string;
  eyebrow: string;
  ctaHref?: string;
  ctaLabel?: string;
  placeholder?: "trend" | "ranking" | "windows";
}) {
  const placeholders =
    placeholder === "ranking"
      ? [1, 0.9, 0.74, 0.62]
      : placeholder === "windows"
        ? [1, 0.86, 0.72]
        : [1, 0.84, 0.7];

  return (
    <View style={styles.lockedCard}>
      <View style={styles.lockedHeaderRow}>
        <View style={styles.lockedIcon}>
          <Ionicons name="lock-closed-outline" size={14} color={tokens.colors.secondaryAccent} />
        </View>
        <View style={styles.lockedHeaderCopy}>
          <Text style={styles.lockedEyebrow}>{eyebrow}</Text>
          <Text style={styles.lockedTitle}>{title}</Text>
        </View>
        <View style={styles.lockedPill}>
          <Ionicons name="lock-closed" size={10} color={tokens.colors.textSecondary} />
          <Text style={styles.lockedPillLabel}>Locked</Text>
        </View>
      </View>

      <View style={styles.lockedPlaceholder}>
        {placeholders.map((widthRatio, index) => (
          <View
            key={`${placeholder}-${index}`}
            style={[styles.placeholderRow, { width: `${Math.round(widthRatio * 100)}%` }]}
          />
        ))}
      </View>

      <View style={styles.lockedDescriptionBox}>
        <Text style={styles.lockedDescription}>{description}</Text>
      </View>

      {ctaHref ? (
        <AnimatedPressable style={styles.inlineLink} onPress={() => router.push(ctaHref as never)}>
          <Text style={styles.inlineLinkLabel}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={14} color={tokens.colors.secondaryAccent} />
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

export default function DashboardAnalyticsScreen() {
  const { width } = useWindowDimensions();
  const bootstrap = useCreatorBootstrap();
  const isWide = width >= 1120;
  const analytics = bootstrap.analytics;

  if (!analytics) {
    return (
      <ScreenShell
        title=""
        subtitle=""
        headerTitle="Analytics"
        headerSubtitle="Performance insights"
        contentStyle={styles.screenContent}
      >
        <Panel
          title="Analytics unavailable"
          description="Live analytics has not loaded yet. Check your session and backend connectivity."
        />
      </ScreenShell>
    );
  }

  const trendPoints = analytics.hero?.playsOverTime ?? [];
  const topTracks = analytics.catalogPerformance.topTracks;
  const rankingSummary = analytics.catalogPerformance.rankingSummary;
  const actions = analytics.actions;
  const advancedTracks = analytics.advanced?.topPerformingTracks ?? [];
  const sourceBreakdown = analytics.advanced?.sourceBreakdown ?? [];
  const geography = analytics.advanced?.geography ?? [];
  const premiumWindows = analytics.premium?.performanceWindows ?? [];
  const comparativeRanking = analytics.premium?.comparativeRanking ?? [];
  const maxTopTrackPlays = Math.max(1, ...topTracks.map((track) => track.plays));
  const maxWindowPlays = Math.max(1, ...premiumWindows.map((window) => window.plays));
  const hasAdvanced = analytics.access.hasAdvancedAnalytics;
  const hasPremium = analytics.access.hasPremiumAnalytics;
  const planIsLocked = analytics.revenue?.sellingLocked ?? false;

  return (
    <ScreenShell
      title=""
      subtitle=""
      headerTitle="Analytics"
      headerSubtitle="Performance insights"
      contentStyle={styles.screenContent}
    >
        {bootstrap.error ? (
          <ErrorState message={bootstrap.error} onRetry={() => void bootstrap.refetch()} />
        ) : null}

        <View style={styles.heroShell}>
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTagRow}>
                <View style={styles.heroTag}>
                  <Ionicons name="sparkles-outline" size={12} color={tokens.colors.secondaryAccent} />
                  <Text style={styles.heroTagLabel}>Creator Dashboard</Text>
                </View>
                <View style={styles.planTag}>
                  <Text style={styles.planTagLabel}>{analytics.overview.planLabel ?? "Artist account"}</Text>
                </View>
                <View style={styles.planSubTag}>
                  <Text style={styles.planSubTagLabel}>
                    {hasPremium
                      ? "VIP insights live"
                      : hasAdvanced
                        ? "Advanced insights live"
                        : "Advanced insights available"}
                  </Text>
                </View>
              </View>
              <View style={styles.periodRow}>
                <Text style={styles.periodLabel}>{formatPeriodLabel(analytics.overview.period)}</Text>
                <View style={styles.periodChips}>
                  {PERIOD_OPTIONS.map((period) => {
                    const active = analytics.overview.period === period;
                    return (
                      <View key={period} style={[styles.periodChip, active && styles.periodChipActive]}>
                        <Text style={[styles.periodChipLabel, active && styles.periodChipLabelActive]}>
                          {formatPeriodChip(period)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.heroBottomRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Overview</Text>
                <Text style={styles.heroSubtitle}>
                  {analytics.overview.summary ??
                    "Watch momentum, top releases, and what to do next from one creator home."}
                </Text>
              </View>
              {analytics.overview.primaryCta ? (
                <AnimatedPressable
                  style={styles.heroPrimaryCta}
                  onPress={() => router.push(analytics.overview.primaryCta?.href as never)}
                >
                  <Text style={styles.heroPrimaryCtaLabel}>
                    {analytics.overview.primaryCta.label}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#0A0E14" />
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </View>

        <View style={[styles.row, isWide && styles.rowWide]}>
          <View style={[styles.panel, styles.heroPanel, isWide && styles.heroPanelWide]}>
            <View style={styles.panelHeaderRow}>
              <View>
                <Text style={styles.panelEyebrow}>Momentum</Text>
                <Text style={styles.panelTitle}>Audience snapshot</Text>
                <Text style={styles.panelDescription}>
                  Plays over time for {formatPeriodLabel(analytics.overview.period).toLowerCase()}.
                </Text>
              </View>
              <View style={styles.heroMiniStats}>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Plays in period</Text>
                  <Text style={styles.statValue}>{formatMetric(analytics.basic.totalPlays)}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>Published tracks</Text>
                  <Text style={styles.statValue}>{formatMetric(analytics.basic.publishedTracks)}</Text>
                </View>
              </View>
            </View>

            <TrendChart points={trendPoints} />

            <View style={styles.heroStatsGrid}>
              <View style={styles.heroStatItem}>
                <Text style={styles.statLabel}>Busiest source</Text>
                <Text style={styles.heroStatValue}>
                  {analytics.basic.topSource ? formatSourceLabel(analytics.basic.topSource.sourceType) : "No data"}
                </Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.statLabel}>Top country</Text>
                <Text style={styles.heroStatValue}>
                  {analytics.basic.topCountry?.countryCode ?? "No data"}
                </Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.statLabel}>Completion</Text>
                <Text style={styles.heroStatValue}>{analytics.basic.completionRate}%</Text>
              </View>
            </View>
          </View>

          <View style={[styles.column, isWide && styles.sideColumn]}>
            <View style={styles.panel}>
              <View style={styles.miniPanelHeader}>
                <Text style={styles.panelEyebrow}>Qualified plays</Text>
                <Ionicons name="pulse-outline" size={14} color={tokens.colors.secondaryAccent} />
              </View>
              <Text style={styles.supportMetric}>{formatMetric(analytics.basic.qualifiedPlays)}</Text>
              <Text style={styles.panelDescription}>Plays that held attention past the qualifying threshold.</Text>
            </View>

            <View style={styles.panel}>
              <View style={styles.miniPanelHeader}>
                <Text style={styles.panelEyebrow}>Unique listeners</Text>
                <Ionicons name="people-outline" size={14} color={tokens.colors.secondaryAccent} />
              </View>
              <Text style={styles.supportMetric}>{formatMetric(analytics.basic.uniqueListeners)}</Text>
              <Text style={styles.panelDescription}>Distinct listeners in the selected period.</Text>
            </View>

            <View style={styles.panel}>
              <View style={styles.miniPanelHeader}>
                <Text style={styles.panelEyebrow}>Plan insight</Text>
                <Ionicons
                  name={hasPremium ? "sparkles" : hasAdvanced ? "trending-up" : "lock-closed-outline"}
                  size={14}
                  color={hasPremium ? "#C8FBA5" : tokens.colors.secondaryAccent}
                />
              </View>
              <Text style={styles.supportTitle}>
                {hasPremium
                  ? "VIP analytics are live"
                  : hasAdvanced
                    ? "Premium insight is still ahead"
                    : "Advanced insight is available"}
              </Text>
              <Text style={styles.panelDescription}>
                {hasPremium
                  ? "Performance windows and comparative ranking are unlocked below."
                  : hasAdvanced
                    ? "VIP adds 7/30/90-day windows and comparative ranking."
                    : "Pro and VIP plans unlock deeper ranked momentum views."}
              </Text>
              {!hasPremium ? (
                <AnimatedPressable style={styles.inlineLink} onPress={() => router.push("/account/plan")}>
                  <Text style={styles.inlineLinkLabel}>Compare artist plans</Text>
                  <Ionicons name="arrow-forward" size={14} color={tokens.colors.secondaryAccent} />
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </View>

        {actions.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Action needed</Text>
              <Text style={styles.sectionTitle}>Next actions</Text>
            </View>
            <View style={[styles.actionsGrid, isWide && styles.actionsGridWide]}>
              {actions.map((action) => (
                <AnimatedPressable
                  key={action.key}
                  style={[
                    styles.actionCard,
                    action.variant === "upgrade" && styles.actionCardUpgrade,
                  ]}
                  onPress={() => router.push(action.href as never)}
                >
                  <View style={styles.actionCardTop}>
                    <View style={styles.actionIconWrap}>
                      <Ionicons
                        name={
                          action.key.includes("upload")
                            ? "cloud-upload-outline"
                            : action.key.includes("album")
                              ? "disc-outline"
                              : action.key.includes("upgrade")
                                ? "sparkles-outline"
                                : "navigate-outline"
                        }
                        size={16}
                        color={tokens.colors.secondaryAccent}
                      />
                    </View>
                    {action.variant === "upgrade" ? (
                      <View style={styles.upgradePill}>
                        <Text style={styles.upgradePillLabel}>Artist plans</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                  <View style={styles.inlineLink}>
                    <Text style={styles.inlineLinkLabel}>Open action</Text>
                    <Ionicons name="arrow-forward" size={14} color={tokens.colors.secondaryAccent} />
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Top tracks</Text>
          <Text style={styles.sectionTitle}>Catalog performance</Text>
          <Text style={styles.sectionDescription}>
            Ranked from real play activity so you can see what is carrying your catalog.
          </Text>
        </View>

        <View style={[styles.row, isWide && styles.rowWide]}>
          <View style={[styles.panel, isWide && styles.mainPanelWide]}>
            {topTracks.length > 0 ? (
              <View style={styles.trackList}>
                {topTracks.map((track, index) => (
                  <AnimatedPressable
                    key={track.trackId}
                    style={styles.trackRow}
                    onPress={() => router.push((track.href ?? `/catalog/tracks/${track.trackId}`) as never)}
                  >
                    <Text style={styles.trackRank}>{index + 1}</Text>
                    {track.artworkUrl ? (
                      <Image source={{ uri: track.artworkUrl }} style={styles.trackArt} contentFit="cover" />
                    ) : (
                      <View style={styles.trackArtFallback}>
                        <Ionicons name="play" size={14} color={tokens.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.trackCopy}>
                      <View style={styles.trackTitleRow}>
                        <Text style={styles.trackTitle} numberOfLines={1}>
                          {track.title}
                        </Text>
                        {track.isSubscriberOnly ? (
                          <View style={styles.subscriberPill}>
                            <Ionicons name="lock-closed" size={10} color={tokens.colors.textSecondary} />
                            <Text style={styles.subscriberPillLabel}>Sub</Text>
                          </View>
                        ) : null}
                        {!track.isSubscriberOnly && track.isPurchasable ? (
                          <View style={styles.buyPill}>
                            <Ionicons name="cart-outline" size={10} color="#C8FBA5" />
                            <Text style={styles.buyPillLabel}>Buy</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.trackSubline} numberOfLines={1}>
                        {track.momentumLabel ?? "Momentum"}
                      </Text>
                    </View>
                    <Text style={styles.trackValue}>{formatMetric(track.plays)}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No play activity has landed on your catalog yet. Ranked releases will appear here once listening starts.
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.panel, isWide && styles.sidePanelFixed]}>
            <Text style={styles.panelEyebrow}>Ranking summary</Text>
            {rankingSummary ? (
              <>
                <Text style={styles.supportTitle}>{rankingSummary.bestPerformerTitle ?? "No leader yet"}</Text>
                <Text style={styles.panelDescription}>
                  Best performer currently carries {formatMetric(rankingSummary.bestPerformerPlays)} plays.
                </Text>
                <View style={styles.kpiStack}>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Top track share</Text>
                    <Text style={styles.kpiValue}>{rankingSummary.topTrackSharePercent}%</Text>
                  </View>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>Tracks with momentum</Text>
                    <Text style={styles.kpiValue}>{formatMetric(rankingSummary.tracksWithMomentum)}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Ranking summary appears once one release starts pulling ahead.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Earnings</Text>
          <Text style={styles.sectionTitle}>Revenue snapshot</Text>
        </View>

        <View style={[styles.row, isWide && styles.rowWide]}>
          <View style={[styles.panel, isWide && styles.mainPanelWide]}>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Gross revenue</Text>
                <Text style={styles.kpiValue}>{formatCurrency(analytics.revenue?.snapshot?.grossRevenue)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total sales</Text>
                <Text style={styles.kpiValue}>{formatMetric(analytics.revenue?.snapshot?.salesCount)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Top earning track</Text>
                <Text style={styles.kpiValueSm}>
                  {analytics.revenue?.snapshot?.topEarningTrack.title ?? "—"}
                </Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Top earning album</Text>
                <Text style={styles.kpiValueSm}>
                  {analytics.revenue?.snapshot?.topEarningAlbum.title ?? "—"}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.panel, isWide && styles.sidePanelFixed]}>
            <Text style={styles.panelEyebrow}>Monetization readiness</Text>
            <View style={styles.kpiStack}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Purchasable tracks</Text>
                <Text style={styles.kpiValue}>{formatMetric(analytics.revenue?.monetizationReadiness?.purchasableTracks)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Purchasable albums</Text>
                <Text style={styles.kpiValue}>{formatMetric(analytics.revenue?.monetizationReadiness?.purchasableAlbums)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Subscriber-only tracks</Text>
                <Text style={styles.kpiValue}>{formatMetric(analytics.revenue?.monetizationReadiness?.subscriberOnlyTracks)}</Text>
              </View>
            </View>
            {planIsLocked ? (
              <AnimatedPressable style={styles.inlineLink} onPress={() => router.push("/account/plan")}>
                <Text style={styles.inlineLinkLabel}>Upgrade plan</Text>
                <Ionicons name="arrow-forward" size={14} color={tokens.colors.secondaryAccent} />
              </AnimatedPressable>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Advanced insights</Text>
          <Text style={styles.sectionTitle}>Momentum depth</Text>
        </View>

        {hasAdvanced ? (
          <View style={[styles.row, isWide && styles.rowWide]}>
            <View style={[styles.panel, isWide && styles.mainPanelWide]}>
              <Text style={styles.panelTitle}>Top-performing tracks</Text>
              {advancedTracks.length > 0 ? (
                <View style={styles.trackList}>
                  {advancedTracks.map((track) => (
                    <AnimatedPressable
                      key={track.trackId}
                      style={styles.trackRow}
                      onPress={() => router.push(`/catalog/tracks/${track.trackId}` as never)}
                    >
                      <Text style={styles.trackRank}>{track.rank}</Text>
                      {track.artworkUrl ? (
                        <Image source={{ uri: track.artworkUrl }} style={styles.trackArt} contentFit="cover" />
                      ) : (
                        <View style={styles.trackArtFallback}>
                          <Ionicons name="play" size={14} color={tokens.colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.trackCopy}>
                        <Text style={styles.trackTitle} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={styles.trackSubline} numberOfLines={1}>
                          {track.momentumLabel ?? "Momentum"}
                        </Text>
                      </View>
                      <Text style={styles.trackValue}>{formatMetric(track.plays)}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Advanced track ranking appears once qualified plays are available.</Text>
                </View>
              )}
            </View>

            <View style={[styles.column, isWide && styles.sideColumn]}>
              <View style={[styles.panel, isWide && styles.sidePanelFixed]}>
                <Text style={styles.panelTitle}>Release share</Text>
                {topTracks.length > 0 ? (
                  <View style={styles.shareStack}>
                    {topTracks.map((track) => {
                      const share = analytics.basic.totalPlays > 0
                        ? Math.round((track.plays / analytics.basic.totalPlays) * 100)
                        : 0;
                      const fillRatio = getRelativeBarRatio(track.plays, maxTopTrackPlays, 14);
                      return (
                        <View key={track.trackId} style={styles.shareRowWrap}>
                          <View style={styles.shareRowHeader}>
                            <Text style={styles.shareRowTitle} numberOfLines={1}>{track.title}</Text>
                            <Text style={styles.shareRowPercent}>{share}%</Text>
                          </View>
                          <View style={styles.shareTrackBg}>
                            <View style={[styles.shareTrackFillWrap, { flex: fillRatio }]}>
                              <View
                                style={[styles.shareTrackFill, { backgroundColor: tokens.colors.accent }]}
                              />
                            </View>
                            <View style={{ flex: Math.max(0.01, 1 - fillRatio) }} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Release share appears when top tracks accumulate plays.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.row, isWide && styles.rowWide]}>
            <LockedInsightCard
              title="Advanced play trends"
              description="See which releases are carrying the selected period and where momentum is concentrated."
              eyebrow="Available in Pro and VIP"
              ctaHref="/account/plan"
              ctaLabel="Compare artist plans"
              placeholder="trend"
            />
            <LockedInsightCard
              title="Catalog ranking"
              description="Track-level ranking and source attribution stay locked until you move to a paid creator plan."
              eyebrow="Available in Pro and VIP"
              placeholder="ranking"
            />
          </View>
        )}

        {hasAdvanced ? (
          <View style={[styles.row, isWide && styles.rowWide]}>
            <View style={[styles.panel, isWide && styles.mainPanelWide]}>
              <Text style={styles.panelTitle}>Source attribution</Text>
              {sourceBreakdown.length > 0 ? (
                <View style={styles.detailList}>
                  {sourceBreakdown.map((source) => (
                    <View key={source.sourceType} style={styles.detailRow}>
                      <Text style={styles.detailKey}>{formatSourceLabel(source.sourceType)}</Text>
                      <View style={styles.detailValueWrap}>
                        <Text style={styles.detailValue}>{formatMetric(source.qualifiedPlays)} plays</Text>
                        <Text style={styles.detailPercent}>{source.sharePercent}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Source attribution needs more qualified plays with referral context.</Text>
                </View>
              )}
            </View>
            <View style={[styles.panel, isWide && styles.sidePanelFixed]}>
              <Text style={styles.panelTitle}>Geography</Text>
              {geography.length > 0 ? (
                <View style={styles.detailList}>
                  {geography.map((geo) => (
                    <View key={geo.countryCode} style={styles.detailRow}>
                      <Text style={styles.detailKey}>{geo.countryCode || "Unknown"}</Text>
                      <View style={styles.detailValueWrap}>
                        <Text style={styles.detailValue}>{formatMetric(geo.qualifiedPlays)} plays</Text>
                        <Text style={styles.detailPercent}>{geo.sharePercent}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Geography data appears once enough listening context is captured.</Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>Premium insights</Text>
          <Text style={styles.sectionTitle}>VIP context</Text>
        </View>

        {hasPremium ? (
          <View style={[styles.row, isWide && styles.rowWide]}>
            <View style={[styles.panel, isWide && styles.sidePanelFixed]}>
              <Text style={styles.panelTitle}>Performance windows</Text>
              {premiumWindows.length > 0 ? (
                <View style={styles.shareStack}>
                  {premiumWindows.map((window) => {
                    const fillRatio = getRelativeBarRatio(window.plays, maxWindowPlays, 12);
                    return (
                      <View key={window.label} style={styles.shareRowWrap}>
                        <View style={styles.shareRowHeader}>
                          <Text style={styles.shareRowTitle}>{window.label}</Text>
                          <Text style={styles.shareRowPercent}>{formatMetric(window.plays)} plays</Text>
                        </View>
                        <View style={styles.shareTrackBg}>
                          <View style={[styles.shareTrackFillWrap, { flex: fillRatio }]}>
                            <View
                              style={[styles.shareTrackFill, { backgroundColor: tokens.colors.warning }]}
                            />
                          </View>
                          <View style={{ flex: Math.max(0.01, 1 - fillRatio) }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Performance windows will fill as listening history accumulates.</Text>
                </View>
              )}
            </View>

            <View style={[styles.panel, isWide && styles.mainPanelWide]}>
              <Text style={styles.panelTitle}>Extended catalog leaderboard</Text>
              {comparativeRanking.length > 0 ? (
                <View style={styles.trackList}>
                  {comparativeRanking.map((track) => (
                    <AnimatedPressable
                      key={track.trackId}
                      style={styles.trackRow}
                      onPress={() => router.push(`/catalog/tracks/${track.trackId}` as never)}
                    >
                      <Text style={styles.trackRank}>{track.rank}</Text>
                      {track.artworkUrl ? (
                        <Image source={{ uri: track.artworkUrl }} style={styles.trackArt} contentFit="cover" />
                      ) : (
                        <View style={styles.trackArtFallback}>
                          <Ionicons name="play" size={14} color={tokens.colors.textSecondary} />
                        </View>
                      )}
                      <View style={styles.trackCopy}>
                        <Text style={styles.trackTitle} numberOfLines={1}>
                          {track.title}
                        </Text>
                        <Text style={styles.trackSubline} numberOfLines={1}>
                          {track.momentumLabel ?? "Momentum"}
                        </Text>
                      </View>
                      <Text style={styles.trackValue}>{formatMetric(track.plays)}</Text>
                    </AnimatedPressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Comparative ranking appears once broader catalog history is available.</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.row, isWide && styles.rowWide]}>
            <LockedInsightCard
              title="Performance windows"
              description="VIP compares 7, 30, and 90 day momentum windows for stronger release decisions."
              eyebrow="Available in VIP"
              ctaHref="/account/plan"
              ctaLabel="See VIP unlocks"
              placeholder="windows"
            />
            <LockedInsightCard
              title="Comparative ranking"
              description="Extended leaderboard and deeper cross-window ranking are locked to VIP analytics."
              eyebrow="Available in VIP"
              placeholder="ranking"
            />
          </View>
        )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 16,
  },
  heroShell: {
    borderRadius: 10,
    overflow: "hidden",
    borderColor: tokens.colors.borderStrong,
    paddingHorizontal: 22,
    paddingVertical: 20,
    position: "relative",
  },
  heroGlowRight: {
    position: "absolute",
    right: -40,
    top: 0,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: tokens.colors.accentDim,
    opacity: 0.35,
  },
  heroGlowLeft: {
    position: "absolute",
    left: -60,
    bottom: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(121,201,107,0.14)",
    opacity: 0.5,
  },
  heroContent: {
    gap: 18,
  },
  heroTopRow: {
    gap: 14,
  },
  heroTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroTagLabel: {
    color: "rgba(247,250,252,0.78)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  planTag: {
    borderRadius: 999,
    borderColor: "rgba(121,201,107,0.28)",
    backgroundColor: "rgba(121,201,107,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planTagLabel: {
    color: "#EAFDE5",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  planSubTag: {
    borderRadius: 999,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.02)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planSubTagLabel: {
    color: "rgba(247,250,252,0.6)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  periodRow: {
    gap: 8,
  },
  periodLabel: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  periodChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  periodChip: {
    borderRadius: 999,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(0,0,0,0.24)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  periodChipActive: {
    backgroundColor: tokens.colors.secondaryAccent,
    borderColor: tokens.colors.secondaryAccent,
  },
  periodChipLabel: {
    color: "rgba(247,250,252,0.68)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  periodChipLabelActive: {
    color: "#0A0E14",
  },
  heroBottomRow: {
    gap: 14,
  },
  heroCopy: {
    gap: 8,
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    color: "rgba(247,250,252,0.68)",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 820,
  },
  heroPrimaryCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: tokens.colors.secondaryAccent,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heroPrimaryCtaLabel: {
    color: "#0A0E14",
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    gap: 16,
  },
  rowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    gap: 16,
  },
  sideColumn: {
    flex: 1,
    minWidth: 320,
    maxWidth: 360,
  },
  panel: {
    backgroundColor: tokens.colors.panel,
    borderRadius: 8,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    overflow: "hidden",
  },
  heroPanel: {
    gap: 14,
  },
  heroPanelWide: {
    flex: 1,
    minWidth: 0,
  },
  mainPanelWide: {
    flex: 1,
    minWidth: 0,
  },
  sidePanelFixed: {
    minWidth: 320,
    maxWidth: 360,
  },
  panelHeaderRow: {
    gap: 12,
  },
  panelEyebrow: {
    color: "rgba(247,250,252,0.46)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  panelTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  panelDescription: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 13,
    lineHeight: 20,
  },
  heroMiniStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderRadius: 8,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.24)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statBlock: {
    minWidth: 120,
    gap: 4,
  },
  statLabel: {
    color: "rgba(247,250,252,0.44)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  statValue: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  trendChartWrap: {
    borderRadius: 8,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.24)",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
  },
  trendChartSvg: {
    width: "100%",
    height: 230,
  },
  trendLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  trendLabelText: {
    color: "rgba(247,250,252,0.4)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroStatsGrid: {
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  heroStatItem: {
    minWidth: 120,
    flex: 1,
    gap: 4,
  },
  heroStatValue: {
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  miniPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  supportMetric: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -1,
  },
  supportTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  inlineLink: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  inlineLinkLabel: {
    color: tokens.colors.secondaryAccent,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeader: {
    gap: 4,
    marginTop: 4,
  },
  sectionEyebrow: {
    color: "rgba(247,250,252,0.46)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  sectionDescription: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 840,
  },
  actionsGrid: {
    gap: 12,
  },
  actionsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionCard: {
    flexGrow: 1,
    minWidth: 240,
    maxWidth: 420,
    borderRadius: 8,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(21,27,35,0.98)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  actionCardUpgrade: {
    borderColor: "rgba(121,201,107,0.25)",
    backgroundColor: "rgba(13,17,23,0.98)",
  },
  actionCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradePill: {
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  upgradePillLabel: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  actionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  actionDescription: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 13,
    lineHeight: 20,
  },
  trackList: {
    gap: 6,
  },
  trackRow: {
    minHeight: 54,
    borderRadius: 6,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackRank: {
    width: 14,
    color: "rgba(247,250,252,0.54)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  trackArt: {
    width: 36,
    height: 36,
    borderRadius: 5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  trackArtFallback: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  trackCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trackTitle: {
    flexShrink: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  trackSubline: {
    color: "rgba(247,250,252,0.46)",
    fontSize: 11,
  },
  trackValue: {
    color: "rgba(247,250,252,0.54)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  subscriberPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  subscriberPillLabel: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  buyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    borderColor: "rgba(121,201,107,0.26)",
    backgroundColor: "rgba(121,201,107,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  buyPillLabel: {
    color: "#D9F7CD",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  emptyState: {
    borderRadius: 8,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  emptyStateText: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 13,
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiStack: {
    gap: 8,
  },
  kpiCard: {
    borderRadius: 8,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  kpiLabel: {
    color: "rgba(247,250,252,0.42)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  kpiValue: {
    color: tokens.colors.textPrimary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  kpiValueSm: {
    color: tokens.colors.textPrimary,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
  },
  shareStack: {
    gap: 10,
  },
  shareRowWrap: {
    gap: 5,
  },
  shareRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  shareRowTitle: {
    flex: 1,
    color: "rgba(247,250,252,0.74)",
    fontSize: 13,
  },
  shareRowPercent: {
    color: "rgba(247,250,252,0.52)",
    fontSize: 12,
    fontWeight: "600",
  },
  shareTrackBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    flexDirection: "row",
  },
  shareTrackFillWrap: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  shareTrackFill: {
    height: 8,
    width: "100%",
    borderRadius: 999,
  },
  detailList: {
    gap: 8,
  },
  detailRow: {
    borderRadius: 6,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  detailKey: {
    color: "rgba(247,250,252,0.76)",
    fontSize: 13,
    fontWeight: "600",
  },
  detailValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailValue: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 12,
  },
  detailPercent: {
    color: "rgba(247,250,252,0.4)",
    fontSize: 12,
  },
  lockedCard: {
    flex: 1,
    minWidth: 260,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.surfaceSection,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  lockedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockedIcon: {
    width: 26,
    height: 26,
    borderRadius: tokens.radiusSystem.control,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  lockedEyebrow: {
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  lockedTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  lockedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: tokens.radiusSystem.pill,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(0,0,0,0.24)",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  lockedPillLabel: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  lockedPlaceholder: {
    borderRadius: tokens.radiusSystem.section,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 5,
    opacity: 0.52,
  },
  placeholderRow: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  lockedDescriptionBox: {
    borderRadius: tokens.radiusSystem.section,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  lockedDescription: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 11,
    lineHeight: 16,
  },
});
