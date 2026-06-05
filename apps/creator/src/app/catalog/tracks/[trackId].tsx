import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Share, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

import type {
  DashboardPromotionCampaign,
  DashboardPromotionList,
  DashboardTrack,
} from "@/contracts/creator";
import {
  deleteTrack,
  getDashboardPromotions,
  getTrackStatus,
} from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable, BottomActionSheet, useToast } from "@micboxx/ui";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";

import { TrackHeroCard } from "./[trackId]/_components/TrackHeroCard";
import { PerformanceSnapshot } from "./[trackId]/_components/PerformanceSnapshot";
import { TrackTabs } from "./[trackId]/_components/TrackTabs";
import { PerformanceOverviewChart } from "./[trackId]/_components/PerformanceOverviewChart";
import { AudienceSummaryCards } from "./[trackId]/_components/AudienceSummaryCards";
import { TrackStatusPanel } from "./[trackId]/_components/TrackStatusPanel";
import { TrackPromotionSheet } from "./[trackId]/_components/TrackPromotionSheet";

function ComingSoonStub({ tab }: { tab: string }) {
  const title = tab.charAt(0).toUpperCase() + tab.slice(1);
  return (
    <Panel
      title={`${title} Management`}
      description={`The ${tab} management panel is coming soon. Overview capabilities are fully active for this track.`}
    />
  );
}

function findLatestCampaign(
  dashboard: DashboardPromotionList | null,
  track: DashboardTrack | null,
): DashboardPromotionCampaign | null {
  if (!dashboard || !track) return null;

  return dashboard.campaigns.find((campaign) => campaign.track.id === track.id) ?? null;
}

function getBoostActionLabel(
  dashboard: DashboardPromotionList | null,
  track: DashboardTrack | null,
  loading: boolean,
) {
  if (loading && !dashboard) return "Loading Boost";

  const campaign = findLatestCampaign(dashboard, track);
  if (
    campaign &&
    campaign.status !== "completed" &&
    campaign.status !== "rejected" &&
    campaign.status !== "canceled"
  ) {
    return "View Boost";
  }

  return "Boost Track";
}

export default function TrackDetailScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [promotionDashboard, setPromotionDashboard] =
    useState<DashboardPromotionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [menuVisible, setMenuVisible] = useState(false);
  const [promotionSheetVisible, setPromotionSheetVisible] = useState(false);
  const { showToast } = useToast();
  const unreadCount = useUnreadNotificationCount();

  const menuItems = [
    {
      key: "preview",
      label: "Preview Track",
      icon: "play-circle-outline" as const,
      onPress: () => void handlePreview(),
    },
    {
      key: "share",
      label: "Share Track",
      icon: "share-outline" as const,
      onPress: () => void handleShare(),
    },
    {
      key: "delete",
      label: "Delete Track",
      icon: "trash-outline" as const,
      tone: "destructive" as const,
      onPress: () => handleDelete(),
    },
  ];

  const loadPromotions = useCallback(async () => {
    setPromotionsLoading(true);
    try {
      setPromotionDashboard(await getDashboardPromotions());
      setPromotionError(null);
    } catch (nextError) {
      setPromotionError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load promotion options.",
      );
    } finally {
      setPromotionsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!trackId) return;
    setLoading(true);
    setError(null);
    try {
      setTrack(await getTrackStatus(trackId));
      void loadPromotions();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load track.");
    } finally {
      setLoading(false);
    }
  }, [loadPromotions, trackId]);

  const refreshTrackAndPromotions = useCallback(async () => {
    if (!trackId) return;

    const [nextTrack] = await Promise.all([
      getTrackStatus(trackId),
      loadPromotions(),
    ]);
    setTrack(nextTrack);
  }, [loadPromotions, trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  const boostActionLabel = useMemo(
    () => getBoostActionLabel(promotionDashboard, track, promotionsLoading),
    [promotionDashboard, promotionsLoading, track],
  );

  const getTrackUrl = useCallback(() => {
    if (!track) return null;
    return track.publicHref || `https://micboxx.com/track/${track.uuid}`;
  }, [track]);

  const handlePreview = async () => {
    const previewUrl = getTrackUrl();
    if (!previewUrl) return;

    try {
      await Linking.openURL(previewUrl);
    } catch (err) {
      showToast({
        tone: "error",
        title: "Preview Failed",
        message: err instanceof Error ? err.message : "Unable to open track preview.",
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = getTrackUrl();
    if (!track || !shareUrl) return;

    try {
      await Share.share({
        message: `Check out my track "${track.title}" on MicBoxx! ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      showToast({
        tone: "error",
        title: "Share Failed",
        message: err instanceof Error ? err.message : "Unable to open share sheet.",
      });
    }
  };

  function handleDelete() {
    if (!trackId) return;

    Alert.alert(
      "Delete Track",
      "Are you sure you want to permanently delete this track?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrack(trackId);
              showToast({
                tone: "success",
                title: "Track Deleted",
                message: "Track was permanently removed.",
              });
              router.replace("/(tabs)/catalog");
            } catch (err) {
              showToast({
                tone: "error",
                title: "Delete Failed",
                message: err instanceof Error ? err.message : "Unable to delete track.",
              });
            }
          },
        },
      ],
    );
  }

  const renderCustomHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Left: Back button */}
        <AnimatedPressable
          style={styles.circularBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/catalog");
            }
          }}
          haptic="selection"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </AnimatedPressable>

        {/* Center: Title & Subtitle */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Track Details</Text>
          <Text style={styles.headerSubtitle}>Manage and edit your track</Text>
        </View>

        {/* Right: Notifications & Ellipsis Menu */}
        <View style={styles.headerRightContainer}>
          <AnimatedPressable
            style={styles.circularBtn}
            onPress={() => router.push("/audience/notifications")}
            haptic="selection"
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View style={styles.badgeWrap} pointerEvents="none">
              <UnreadBadge count={unreadCount} />
            </View>
          </AnimatedPressable>

          <AnimatedPressable style={styles.circularBtn} onPress={() => setMenuVisible(true)} haptic="selection">
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  return (
    <Screen header={renderCustomHeader()}>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      
      {loading || !track ? (
        <Panel title="Loading track" description="Reading the current dashboard track payload." />
      ) : (
        <>
          <TrackHeroCard
            track={track}
            boostActionLabel={boostActionLabel}
            boostActionLoading={promotionsLoading && !promotionDashboard}
            onBoostPress={() => setPromotionSheetVisible(true)}
          />
          
          <PerformanceSnapshot trackId={track.id} />
          
          <TrackTabs activeTab={activeTab} onChangeTab={setActiveTab} />
          
          {activeTab === "overview" ? (
            <>
              <PerformanceOverviewChart trackId={track.id} />
              <AudienceSummaryCards trackId={track.id} />
              <TrackStatusPanel track={track} />
            </>
          ) : (
            <ComingSoonStub tab={activeTab} />
          )}

          {track.status.error ? (
            <Panel title="Processing error">
              <Text style={styles.copy}>{track.status.error}</Text>
            </Panel>
          ) : null}

          <BottomActionSheet
            visible={menuVisible}
            title="Track Options"
            items={menuItems}
            onClose={() => setMenuVisible(false)}
          />
          <TrackPromotionSheet
            visible={promotionSheetVisible}
            track={track}
            dashboard={promotionDashboard}
            loading={promotionsLoading}
            error={promotionError}
            onClose={() => setPromotionSheetVisible(false)}
            onRefresh={refreshTrackAndPromotions}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgApp,
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  headerRightContainer: {
    flexDirection: "row",
    gap: 8,
  },
  badgeWrap: {
    position: "absolute",
    top: 2,
    right: 1,
  },
  copy: {
    color: "#A9B4C0",
    fontSize: 14,
    lineHeight: 20,
  },
});
