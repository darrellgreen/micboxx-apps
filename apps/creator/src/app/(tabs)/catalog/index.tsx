import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, Screen } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { getMyTracks, getMyAlbums } from "@/shared/api/creator-dashboard";
import type { DashboardTrackSummary, DashboardAlbumSummary } from "@/contracts/creator";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { tokens } from "@micboxx/theme";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function activityDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " • " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

/* ─── constants ───────────────────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  published: "#22c55e",
  draft:     "#f59e0b",
  scheduled: "#a78bfa",
  failed:    "#ef4444",
};

const STATUS_BG: Record<string, string> = {
  published: "rgba(34,197,94,0.14)",
  draft:     "rgba(245,158,11,0.14)",
  scheduled: "rgba(167,139,250,0.14)",
  failed:    "rgba(239,68,68,0.14)",
};

/* Activity section uses the brand accent for published, not the bright status green */
const ACTIVITY_COLOR: Record<string, string> = {
  published: "#00B3A6",
  scheduled: "#a78bfa",
  failed:    "#ef4444",
};

const ACTIVITY_BG: Record<string, string> = {
  published: "rgba(0,179,166,0.08)",
  scheduled: "rgba(167,139,250,0.08)",
  failed:    "rgba(239,68,68,0.08)",
};

function getActivityIconName(state: string): keyof typeof Ionicons.glyphMap {
  if (state === "scheduled") return "time-outline";
  if (state === "failed") return "close-circle-outline";
  return "checkmark-circle-outline";
}

/* ─── screen ──────────────────────────────────────────────────────────────── */

export default function CatalogHomeScreen() {
  const bootstrap = useCreatorBootstrap();

  const [tracks, setTracks] = useState<DashboardTrackSummary[]>(
    () => bootstrap.tracksSummary?.tracks ?? [],
  );
  const [albums, setAlbums] = useState<DashboardAlbumSummary[]>(
    () => bootstrap.albumsSummary?.albums ?? [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void Promise.all([getMyTracks(1, 12), getMyAlbums(1, 12)]).then(([t, a]) => {
        if (!active) return;
        setTracks(t.tracks);
        setAlbums(a.albums);
      }).catch(() => {});
      return () => { active = false; };
    }, []),
  );

  const totalTracks  = tracks.length;
  const totalAlbums  = albums.length;
  const totalReleases = totalTracks + totalAlbums;

  const publishedCount =
    tracks.filter((t) => resolveTrackReleaseState(t.status) === "published").length +
    albums.filter((a) => a.status.releaseState === "published").length;
  const draftCount     = tracks.filter((t) => resolveTrackReleaseState(t.status) === "draft").length;
  const scheduledCount =
    tracks.filter((t) => resolveTrackReleaseState(t.status) === "scheduled").length +
    albums.filter((a) => a.status.releaseState === "scheduled").length;
  const failedCount    = tracks.filter((t) => t.status.processing === "failed").length;

  const totalPlays = bootstrap.analytics?.basic.totalPlays ?? 0;

  const lastPublishedDate = useMemo(() => {
    const sorted = tracks
      .filter((t) => resolveTrackReleaseState(t.status) === "published")
      .sort(
        (a, b) =>
          new Date(b.timestamps.updatedAt).getTime() -
          new Date(a.timestamps.updatedAt).getTime(),
      );
    return sorted[0]?.timestamps.updatedAt ?? null;
  }, [tracks]);

  /* per-entity breakdown */
  const trackPublished = tracks.filter((t) => resolveTrackReleaseState(t.status) === "published").length;
  const trackDraft     = tracks.filter((t) => resolveTrackReleaseState(t.status) === "draft").length;
  const trackScheduled = tracks.filter((t) => resolveTrackReleaseState(t.status) === "scheduled").length;

  const albumPublished = albums.filter((a) => a.status.releaseState === "published").length;
  const albumDraft     = albums.filter((a) => a.status.releaseState === "draft").length;
  const albumScheduled = albums.filter((a) => a.status.releaseState === "scheduled").length;

  const latestTrack = tracks[0] ?? null;
  const latestAlbum = albums[0] ?? null;

  const recentActivity = useMemo(() => {
    return [
      ...tracks
        .map((t) => ({
          track: t,
          releaseState: resolveTrackReleaseState(t.status),
        }))
        .filter(({ releaseState }) => releaseState !== "draft")
        .map(({ track, releaseState }) => ({
          id: `track-${track.id}`,
          title: track.title,
          releaseState,
          artworkUrl: track.artworkUrl,
          timestamp: track.timestamps.updatedAt,
        })),
      ...albums
        .filter((a) => a.status.releaseState !== "draft")
        .map((a) => ({
          id: `album-${a.id}`,
          title: a.title,
          releaseState: a.status.releaseState,
          artworkUrl: a.artworkUrl,
          timestamp: a.timestamps.updatedAt,
        })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [tracks, albums]);

  return (
    <Screen
      header={<ScreenHeader title="Catalog" subtitle="Manage your tracks and albums" />}
      contentContainerStyle={s.screen}
    >

      {/* ── Catalog Snapshot ──────────────────────────────────────────── */}
      <View style={s.snapshotCard}>
        {/* icon left of both eyebrow + headline */}
        <View style={s.snapshotTop}>
          <View style={s.snapshotIconWrap}>
            <Ionicons name="stats-chart" size={22} color={tokens.colors.accent} />
          </View>
          <View style={s.snapshotTopText}>
            <Text style={s.snapshotEyebrow}>Catalog Snapshot</Text>
            <Text style={s.snapshotHeadline}>
              {totalReleases}{" "}
              <Text style={s.snapshotHeadlineMuted}>
                {totalReleases === 1 ? "Release" : "Releases"}
              </Text>
            </Text>
          </View>
        </View>

        {/* stat columns */}
        <View style={s.snapshotRow}>
          <View style={s.snapshotCol}>
            <Text style={s.snapshotNum}>{publishedCount}</Text>
            <Text style={[s.snapshotColLabel, { color: STATUS_COLOR.published }]}>Published</Text>
          </View>
          <View style={s.snapshotDivider} />
          <View style={s.snapshotCol}>
            <Text style={s.snapshotNum}>{draftCount}</Text>
            <Text style={[s.snapshotColLabel, { color: STATUS_COLOR.draft }]}>Drafts</Text>
          </View>
          <View style={s.snapshotDivider} />
          <View style={s.snapshotCol}>
            <Text style={s.snapshotNum}>{scheduledCount}</Text>
            <Text style={[s.snapshotColLabel, { color: STATUS_COLOR.scheduled }]}>Scheduled</Text>
          </View>
          <View style={s.snapshotDivider} />
          <View style={s.snapshotCol}>
            <Text style={s.snapshotNum}>{failedCount}</Text>
            <Text style={[s.snapshotColLabel, { color: STATUS_COLOR.failed }]}>Failed</Text>
          </View>
        </View>

        {/* footer */}
        <View style={s.snapshotFooter}>
          {totalPlays > 0 ? (
            <View style={s.snapshotFooterLeft}>
              <Ionicons name="trending-up" size={13} color={tokens.colors.accent} />
              <Text style={s.snapshotFooterAccent}>
                {new Intl.NumberFormat("en-US").format(totalPlays)} plays this week
              </Text>
            </View>
          ) : <View />}
          {lastPublishedDate ? (
            <Text style={s.snapshotFooterMuted}>
              Last published {shortDate(lastPublishedDate).replace(",", "").split(" ").slice(0, 2).join(" ")}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Tracks + Albums (side by side) ────────────────────────────── */}
      <View style={s.catalogRow}>
        {/* Tracks */}
        <View style={s.catalogCard}>
          <View style={s.catalogCardTop}>
            <View style={[s.catalogIconWrap, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
              <Ionicons name="musical-notes" size={15} color={STATUS_COLOR.published} />
            </View>
            <Text style={s.catalogCardTitle}>Tracks</Text>
            <Text style={s.catalogCardCount}>{totalTracks}</Text>
          </View>

          {latestTrack ? (
            <View style={s.catalogLatestRow}>
              {latestTrack.artworkUrl ? (
                <Image
                  source={{ uri: latestTrack.artworkUrl }}
                  style={s.catalogArtwork}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.catalogArtwork, s.catalogArtworkFallback]}>
                  <Ionicons name="musical-note" size={22} color={tokens.colors.textSecondary} />
                </View>
              )}
              <View style={s.catalogLatest}>
                <Text style={s.catalogLatestEyebrow}>Latest</Text>
                <Text style={s.catalogLatestTitle} numberOfLines={2}>{latestTrack.title}</Text>
                {latestTrack.album?.title ? (
                  <Text style={s.catalogLatestMeta} numberOfLines={1}>
                    {latestTrack.album.title}
                  </Text>
                ) : null}
                <Text style={s.catalogLatestDate}>{shortDate(latestTrack.timestamps.updatedAt)}</Text>
              </View>
            </View>
          ) : null}

          <View style={s.catalogBreakdown}>
            <BreakdownRow color={STATUS_COLOR.published} label="Published" count={trackPublished} />
            <BreakdownRow color={STATUS_COLOR.draft}     label="Drafts"    count={trackDraft} />
            <BreakdownRow color={STATUS_COLOR.scheduled} label="Scheduled" count={trackScheduled} />
          </View>

          <AnimatedPressable
            style={s.catalogCta}
            onPress={() => router.push("/catalog/tracks" as never)}
            haptic="selection"
          >
            <Text style={s.catalogCtaLabel}>View all tracks</Text>
            <Ionicons name="chevron-forward" size={14} color={tokens.colors.accent} />
          </AnimatedPressable>
        </View>

        {/* Albums */}
        <View style={s.catalogCard}>
          <View style={s.catalogCardTop}>
            <View style={[s.catalogIconWrap, { backgroundColor: "rgba(167,139,250,0.12)" }]}>
              <Ionicons name="albums" size={15} color="#a78bfa" />
            </View>
            <Text style={s.catalogCardTitle}>Releases</Text>
            <Text style={s.catalogCardCount}>{totalAlbums}</Text>
          </View>

          {latestAlbum ? (
            <View style={s.catalogLatestRow}>
              {latestAlbum.artworkUrl ? (
                <Image
                  source={{ uri: latestAlbum.artworkUrl }}
                  style={s.catalogArtwork}
                  contentFit="cover"
                />
              ) : (
                <View style={[s.catalogArtwork, s.catalogArtworkFallback]}>
                  <Ionicons name="albums" size={22} color={tokens.colors.textSecondary} />
                </View>
              )}
              <View style={s.catalogLatest}>
                <Text style={[s.catalogLatestEyebrow, { color: "#a78bfa" }]}>Latest</Text>
                <Text style={s.catalogLatestTitle} numberOfLines={2}>{latestAlbum.title}</Text>
                <Text style={s.catalogLatestMeta} numberOfLines={1}>
                  {latestAlbum.counts.tracks} {latestAlbum.counts.tracks === 1 ? "track" : "tracks"}
                </Text>
                <Text style={s.catalogLatestDate}>{shortDate(latestAlbum.timestamps.updatedAt)}</Text>
              </View>
            </View>
          ) : null}

          <View style={s.catalogBreakdown}>
            <BreakdownRow color={STATUS_COLOR.published} label="Published" count={albumPublished} />
            <BreakdownRow color={STATUS_COLOR.draft}     label="Drafts"    count={albumDraft} />
            <BreakdownRow color={STATUS_COLOR.scheduled} label="Scheduled" count={albumScheduled} />
          </View>

          <AnimatedPressable
            style={s.catalogCta}
            onPress={() => router.push("/catalog/albums" as never)}
            haptic="selection"
          >
            <Text style={[s.catalogCtaLabel, { color: "#a78bfa" }]}>View all releases</Text>
            <Ionicons name="chevron-forward" size={14} color="#a78bfa" />
          </AnimatedPressable>
        </View>
      </View>

      {/* ── Recent Activity ───────────────────────────────────────────── */}
      {recentActivity.length > 0 ? (
        <View style={s.activitySection}>
          <View style={s.activityHeader}>
            <Text style={s.activityTitle}>Recent Activity</Text>
            <AnimatedPressable onPress={() => router.push("/dashboard/activity" as never)}>
              <Text style={s.activityViewAll}>View all</Text>
            </AnimatedPressable>
          </View>

          {recentActivity.map((item, index) => (
            <View
              key={item.id}
              style={[s.activityRow, index < recentActivity.length - 1 && s.activityRowBorder]}
            >
              {/* artwork */}
              <View style={s.activityThumb}>
                {item.artworkUrl ? (
                  <Image
                    source={{ uri: item.artworkUrl }}
                    style={s.activityArtwork}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[s.activityArtwork, s.activityArtworkFallback]}>
                    <Ionicons name="musical-note" size={16} color={tokens.colors.textSecondary} />
                  </View>
                )}
              </View>

              {/* badge column */}
              <View style={s.activityBadge}>
                <Ionicons
                  name={getActivityIconName(item.releaseState)}
                  size={16}
                  color={ACTIVITY_COLOR[item.releaseState]}
                />
              </View>

              {/* copy */}
              <View style={s.activityCopy}>
                <Text style={[s.activityName, s.activityNameAccent, { color: ACTIVITY_COLOR[item.releaseState] }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.activityTime}>{activityDateTime(item.timestamp)}</Text>
              </View>

              {/* pill */}
              <View style={[s.activityPill, { backgroundColor: ACTIVITY_BG[item.releaseState] }]}>
                <Text style={[s.activityPillText, { color: ACTIVITY_COLOR[item.releaseState] }]}>
                  {item.releaseState.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </Screen>
  );
}

/* ─── breakdown row ───────────────────────────────────────────────────────── */

function BreakdownRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View style={s.breakdownRow}>
      <View style={[s.breakdownDot, { backgroundColor: color }]} />
      <Text style={s.breakdownLabel}>{label}</Text>
      <Text style={s.breakdownCount}>{count}</Text>
    </View>
  );
}

/* ─── styles ──────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    gap: 14,
  },

  /* snapshot */
  snapshotCard: {
    backgroundColor: "#131820",
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  snapshotTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  snapshotTopText: {
    flex: 1,
    gap: 2,
  },
  snapshotIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(0,179,166,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  snapshotEyebrow: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  snapshotHeadline: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  snapshotHeadlineMuted: {
    color: tokens.colors.textSecondary,
    fontWeight: "500",
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  snapshotCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  snapshotNum: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  snapshotColLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  snapshotDivider: {
    width: 1,
    height: 40,
    backgroundColor: tokens.colors.borderSubtle,
  },
  snapshotFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderSubtle,
    paddingTop: 14,
  },
  snapshotFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  snapshotFooterAccent: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  snapshotFooterMuted: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  /* catalog cards — side by side */
  catalogRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  catalogCard: {
    flex: 1,
    backgroundColor: "#131820",
    borderRadius: 18,
    padding: 12,
    gap: 10,
    overflow: "hidden",
  },
  catalogCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  catalogIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogCardTitle: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  catalogCardCount: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  catalogLatestRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  catalogArtwork: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: tokens.colors.bgApp,
    flexShrink: 0,
  },
  catalogArtworkFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  catalogLatest: {
    flex: 1,
    gap: 3,
  },
  catalogLatestEyebrow: {
    color: tokens.colors.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  catalogLatestTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  catalogLatestMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  catalogLatestDate: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "500",
  },
  catalogBreakdown: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderSubtle,
    paddingTop: 8,
    gap: 5,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  breakdownLabel: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  breakdownCount: {
    color: tokens.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
  },
  catalogCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  catalogCtaLabel: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  /* recent activity */
  activitySection: {
    padding: 16,
    gap: 4,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  activityTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  activityViewAll: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  activityRowBorder: {
    marginBottom: 2,
  },
  activityThumb: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  activityArtwork: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#131820",
  },
  activityArtworkFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  activityBadge: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activityCopy: {
    flex: 1,
    gap: 3,
  },
  activityName: {
    fontSize: 12,
    lineHeight: 17,
  },
  activityNameAccent: {
    fontWeight: "700",
  },
  activityNameAction: {
    color: tokens.colors.textPrimary,
    fontWeight: "700",
  },
  activityTime: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  activityPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  activityPillText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
});
