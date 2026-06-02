import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, Screen, Surface } from "@micboxx/ui";
import type {
  DashboardAlbumSummary,
  DashboardTrackSummary,
} from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreateEntryHref } from "@/features/bootstrap/routes";
import { formatDuration } from "@micboxx/api";
import { ErrorState } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

const CREATE_ALBUM_HREF = "/create/album";
const COMPLETE_PROFILE_HREF = "/account/profile";
const ANALYTICS_HREF = "/dashboard/analytics";
const TRACKS_HREF = "/catalog/tracks";

function buildTrackStatusLabel(track: DashboardTrackSummary): string {
  if (track.status.published) return "Published";
  if (track.status.processing === "failed") return "Needs attention";
  if (track.status.ready) return "Ready to publish";
  if (track.status.processing === "processing" || track.status.processing === "pending") return "Processing";
  return "Draft";
}

function formatMetric(value: number | null | undefined) {
  const normalized = value ?? 0;
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: normalized >= 1000 ? 1 : 0,
  }).format(normalized);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardScreen() {
  const bootstrap = useCreatorBootstrap();
  const profile = bootstrap.profile;
  const tracks = bootstrap.tracksSummary;
  const permissions = bootstrap.uploadOptions?.currentUser.permissions;
  const analytics = bootstrap.analytics;
  
  const canCreateAlbums = Boolean(permissions?.canCreateAlbums || permissions?.canAdministerAlbums);
  const recentTracks = tracks?.tracks.slice(0, 4) ?? [];
  const hasAvatar = Boolean(profile?.avatarUrl);
  const hasBio = Boolean(profile?.bio?.trim());
  const profileComplete = hasAvatar && hasBio;

  const uploadHref = resolveCreateEntryHref({
    createEntryTarget: bootstrap.createEntryTarget,
    tracksSummary: bootstrap.tracksSummary,
    uploadOptions: bootstrap.uploadOptions,
  });

  const totalPlays = analytics?.basic.totalPlays ?? 0;
  const revenue = analytics?.revenue?.snapshot?.grossRevenue;
  const listeners = analytics?.basic.uniqueListeners ?? 0;
  const publishedTracks = analytics?.basic.publishedTracks ?? 0;
  const playsTrend = analytics?.hero?.playsOverTime ?? [];
  const trendUp = playsTrend.length >= 2 && playsTrend[playsTrend.length - 1].plays >= playsTrend[playsTrend.length - 2].plays;

  return (
    <Screen style={styles.screen}>
      {bootstrap.error ? (
        <ErrorState
          message={bootstrap.error}
          onRetry={() => void bootstrap.refetch()}
        />
      ) : null}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
      </View>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <Surface tone="section" borderRadius="section" padding="md" style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Plays</Text>
          <Text style={styles.kpiValue}>{formatMetric(totalPlays)}</Text>
        </Surface>
        <Surface tone="section" borderRadius="section" padding="md" style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Revenue</Text>
          <Text style={styles.kpiValue}>{formatCurrency(revenue)}</Text>
        </Surface>
        <Surface tone="section" borderRadius="section" padding="md" style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Listeners</Text>
          <Text style={styles.kpiValue}>{formatMetric(listeners)}</Text>
        </Surface>
        <Surface tone="section" borderRadius="section" padding="md" style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Published Tracks</Text>
          <Text style={styles.kpiValue}>{formatMetric(publishedTracks)}</Text>
        </Surface>
      </View>

      {/* Action Center */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.actionCenter}>
        <Text style={styles.sectionTitle}>Action Center</Text>
        <View style={styles.actionGrid}>
          <ActionCard 
            icon="cloud-upload" 
            label="Upload Track" 
            onPress={() => router.push(uploadHref as never)} 
            primary
          />
          {canCreateAlbums && (
            <ActionCard 
              icon="disc" 
              label="Create Album" 
              onPress={() => router.push(CREATE_ALBUM_HREF as never)} 
            />
          )}
          <ActionCard 
            icon="radio" 
            label="Go Live" 
            onPress={() => router.push("/rooms" as never)} 
          />
          {!profileComplete && (
            <ActionCard 
              icon="person" 
              label="Complete Profile" 
              onPress={() => router.push(COMPLETE_PROFILE_HREF as never)} 
            />
          )}
        </View>
      </Surface>

      {/* Recent Tracks */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.recentTracks}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Tracks</Text>
          <AnimatedPressable onPress={() => router.push(TRACKS_HREF as never)}>
            <Text style={styles.seeAll}>See all</Text>
          </AnimatedPressable>
        </View>
        
        {recentTracks.length > 0 ? (
          <View style={styles.trackList}>
            {recentTracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No tracks uploaded yet. Start building your catalog.</Text>
        )}
      </Surface>

      {/* Analytics Snapshot */}
      <Surface tone="section" borderRadius="section" padding="lg" style={styles.analyticsSnapshot}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Analytics Snapshot</Text>
          <AnimatedPressable onPress={() => router.push(ANALYTICS_HREF as never)}>
            <Text style={styles.seeAll}>Full report</Text>
          </AnimatedPressable>
        </View>
        <Text style={styles.snapshotPeriod}>Last 7 Days</Text>
        
        <View style={styles.snapshotGrid}>
          <SnapshotTrend label="Plays" up={trendUp} />
          <SnapshotTrend label="Revenue" up={revenue != null && revenue > 0} />
          <SnapshotTrend label="Listeners" up={listeners > 0} />
        </View>
      </Surface>
      
      {/* Spacer for bottom tab bar */}
      <View style={{ height: 100 }} />
    </Screen>
  );
}

function ActionCard({ 
  icon, 
  label, 
  onPress,
  primary
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  label: string; 
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <AnimatedPressable style={[styles.actionCard, primary && styles.actionCardPrimary]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={primary ? tokens.colors.bgApp : tokens.colors.textPrimary} />
      <Text style={[styles.actionCardLabel, primary && styles.actionCardLabelPrimary]}>{label}</Text>
    </AnimatedPressable>
  );
}

function SnapshotTrend({ label, up }: { label: string; up: boolean }) {
  return (
    <View style={styles.snapshotTrend}>
      <Text style={styles.snapshotTrendLabel}>{label}</Text>
      <View style={styles.trendIconRow}>
        <Ionicons name={up ? "trending-up" : "remove"} size={16} color={up ? tokens.colors.success : tokens.colors.textSecondary} />
      </View>
    </View>
  );
}

function TrackRow({ track }: { track: DashboardTrackSummary }) {
  return (
    <AnimatedPressable
      style={styles.trackRow}
      onPress={() => router.push(`/catalog/tracks/${track.id}` as never)}
    >
      <View style={styles.trackArtWrap}>
        {track.artworkUrl ? (
          <Image source={{ uri: track.artworkUrl }} style={styles.trackArt} contentFit="cover" />
        ) : (
          <Ionicons name="musical-note" size={20} color={tokens.colors.textSecondary} />
        )}
      </View>
      <View style={styles.trackCopy}>
        <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.trackMeta} numberOfLines={1}>
          {formatDuration(track.duration)}
        </Text>
      </View>
      <View style={styles.statusPill}>
        <Text style={styles.statusPillText}>{buildTrackStatusLabel(track)}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: tokens.colors.textPrimary,
    letterSpacing: -0.5,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    gap: 8,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: "700",
    color: tokens.colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  actionCenter: {
    marginBottom: 24,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: tokens.colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.accent,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: tokens.colors.bgElevated,
    padding: 16,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  actionCardPrimary: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  actionCardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  actionCardLabelPrimary: {
    color: tokens.colors.bgApp,
    fontWeight: "700",
  },
  recentTracks: {
    marginBottom: 24,
    gap: 16,
  },
  trackList: {
    gap: 12,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackArtWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trackArt: {
    width: "100%",
    height: "100%",
  },
  trackCopy: {
    flex: 1,
    gap: 4,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: tokens.colors.textPrimary,
  },
  trackMeta: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: tokens.colors.textSecondary,
    lineHeight: 20,
  },
  analyticsSnapshot: {
    gap: 16,
  },
  snapshotPeriod: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
    marginTop: -8,
  },
  snapshotGrid: {
    flexDirection: "row",
    gap: 16,
  },
  snapshotTrend: {
    flex: 1,
    gap: 8,
    padding: 12,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  snapshotTrendLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
  },
  trendIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
