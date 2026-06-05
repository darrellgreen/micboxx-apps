import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

import type { DashboardAlbum } from "@/contracts/creator";
import { getAlbumStatus, publishAlbum, unpublishAlbum } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable } from "@micboxx/ui";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";

import { AlbumHeroCard } from "./[albumId]/_components/AlbumHeroCard";
import { AlbumPerformanceSnapshot } from "./[albumId]/_components/AlbumPerformanceSnapshot";
import { AlbumTabs } from "./[albumId]/_components/AlbumTabs";
import { AlbumPerformanceOverviewChart } from "./[albumId]/_components/AlbumPerformanceOverviewChart";
import { AlbumAudienceSummaryCards } from "./[albumId]/_components/AlbumAudienceSummaryCards";
import { AlbumReleaseHealthPanel } from "./[albumId]/_components/AlbumReleaseHealthPanel";
import { AlbumReleaseInfoPanel } from "./[albumId]/_components/AlbumReleaseInfoPanel";
import { AlbumTrackPreview } from "./[albumId]/_components/AlbumTrackPreview";
import { AlbumQuickActions } from "./[albumId]/_components/AlbumQuickActions";
import { AlbumFullTrackList } from "./[albumId]/_components/AlbumFullTrackList";

function ComingSoonStub({ tab }: { tab: string }) {
  const title = tab.charAt(0).toUpperCase() + tab.slice(1);
  return (
    <Panel
      title={`${title} Management`}
      description={`The ${tab} management panel is coming soon. Overview and Tracks capabilities are fully active for this album.`}
    />
  );
}

export default function AlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId?: string }>();
  const [album, setAlbum] = useState<DashboardAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const unreadCount = useUnreadNotificationCount();

  const load = useCallback(async () => {
    if (!albumId) return;
    setLoading(true);
    setError(null);
    try {
      setAlbum(await getAlbumStatus(albumId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load album.");
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShare = async () => {
    if (!album) return;
    try {
      const shareUrl = album.publicHref || `https://micboxx.com/album/${album.uuid}`;
      await Share.share({
        message: `Check out my album "${album.title}" on MicBoxx! ${shareUrl}`,
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
          <Text style={styles.headerTitle}>Album Details</Text>
          <Text style={styles.headerSubtitle}>Manage and monitor your album</Text>
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
      
      {loading || !album ? (
        <Panel title="Loading album" description="Reading the current dashboard album payload." />
      ) : (
        <>
          {/* Album Hero Details */}
          <AlbumHeroCard
            album={album}
            onShare={handleShare}
          />
          
          {/* Performance Snapshots */}
          <AlbumPerformanceSnapshot />
          
          {/* Tabs Selector */}
          <AlbumTabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
          
          {/* Tab active screen rendering */}
          {activeTab === "overview" ? (
            <>
              {/* Line Chart */}
              <AlbumPerformanceOverviewChart />
              
              {/* Audience Summary (Geography + Source Breakdown) */}
              <AlbumAudienceSummaryCards />
              
              {/* Side by side validation panels */}
              <View style={styles.sideBySide}>
                <AlbumReleaseHealthPanel />
                <AlbumReleaseInfoPanel album={album} />
              </View>

              {/* Tracks preview */}
              <AlbumTrackPreview
                album={album}
                onViewAll={() => setActiveTab("tracks")}
              />

              {/* Action grid */}
              <AlbumQuickActions
                onEdit={() => router.push(`/catalog/albums/${album.id}/edit` as never)}
              />
            </>
          ) : activeTab === "tracks" ? (
            <AlbumFullTrackList album={album} />
          ) : (
            <ComingSoonStub tab={activeTab} />
          )}
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
  sideBySide: {
    flexDirection: "row",
    gap: 10,
  },
});
