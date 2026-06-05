import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

import type { DashboardTrack } from "@/contracts/creator";
import { getTrackStatus, publishTrack, requeueTrack, unpublishTrack } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable } from "@micboxx/ui";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";

import { TrackHeroCard } from "./[trackId]/_components/TrackHeroCard";
import { PerformanceSnapshot } from "./[trackId]/_components/PerformanceSnapshot";
import { TrackTabs } from "./[trackId]/_components/TrackTabs";
import { PerformanceOverviewChart } from "./[trackId]/_components/PerformanceOverviewChart";
import { AudienceSummaryCards } from "./[trackId]/_components/AudienceSummaryCards";
import { TrackStatusPanel } from "./[trackId]/_components/TrackStatusPanel";

function ComingSoonStub({ tab }: { tab: string }) {
  const title = tab.charAt(0).toUpperCase() + tab.slice(1);
  return (
    <Panel
      title={`${title} Management`}
      description={`The ${tab} management panel is coming soon. Overview capabilities are fully active for this track.`}
    />
  );
}

export default function TrackDetailScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const unreadCount = useUnreadNotificationCount();

  const load = useCallback(async () => {
    if (!trackId) return;
    setLoading(true);
    setError(null);
    try {
      setTrack(await getTrackStatus(trackId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load track.");
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "publish" | "unpublish" | "requeue") {
    if (!trackId) return;
    setError(null);
    try {
      const nextTrack =
        action === "publish"
          ? await publishTrack(trackId)
          : action === "unpublish"
            ? await unpublishTrack(trackId)
            : await requeueTrack(trackId);
      setTrack(nextTrack);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Track action failed.");
    }
  }

  const handleShare = async () => {
    if (!track) return;
    try {
      const shareUrl = track.publicHref || `https://micboxx.com/track/${track.uuid}`;
      await Share.share({
        message: `Check out my track "${track.title}" on MicBoxx! ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Share action failed";
      Alert.alert("Unable to Share", msg);
    }
  };

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

          <AnimatedPressable style={styles.circularBtn} onPress={() => {}} haptic="selection">
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
          <TrackHeroCard track={track} onShare={handleShare} />
          
          <PerformanceSnapshot trackId={track.id} />
          
          <TrackTabs activeTab={activeTab} onChangeTab={setActiveTab} />
          
          {activeTab === "overview" ? (
            <>
              <PerformanceOverviewChart trackId={track.id} />
              <AudienceSummaryCards trackId={track.id} />
              <TrackStatusPanel track={track} onAction={runAction} />
            </>
          ) : (
            <ComingSoonStub tab={activeTab} />
          )}

          {track.status.error ? (
            <Panel title="Processing error">
              <Text style={styles.copy}>{track.status.error}</Text>
            </Panel>
          ) : null}
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
