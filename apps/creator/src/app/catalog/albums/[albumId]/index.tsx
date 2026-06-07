import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { NestableScrollContainer } from "react-native-draggable-flatlist";
import { tokens } from "@micboxx/theme";

import type { DashboardAlbum } from "@/contracts/creator";
import { getAlbumStatus, unpublishAlbum } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { Screen, AnimatedPressable, BottomActionSheet, useToast } from "@micboxx/ui";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";
import { useAccountPreferences } from "@/features/account/provider";

import { AlbumAudienceSummaryCards } from "@/features/catalog/album-detail-components/AlbumAudienceSummaryCards";
import { AlbumFullTrackList } from "@/features/catalog/album-detail-components/AlbumFullTrackList";
import { AlbumHeroCard } from "@/features/catalog/album-detail-components/AlbumHeroCard";
import { AlbumPerformanceOverviewChart } from "@/features/catalog/album-detail-components/AlbumPerformanceOverviewChart";
import { AlbumPerformanceSnapshot } from "@/features/catalog/album-detail-components/AlbumPerformanceSnapshot";
import { AlbumReleaseHealthPanel } from "@/features/catalog/album-detail-components/AlbumReleaseHealthPanel";
import { AlbumReleaseInfoPanel } from "@/features/catalog/album-detail-components/AlbumReleaseInfoPanel";
import { AlbumTabs } from "@/features/catalog/album-detail-components/AlbumTabs";
import { AlbumTrackPreview } from "@/features/catalog/album-detail-components/AlbumTrackPreview";

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
  const { albumId, tab, highlightTrackId, refreshKey, uploadingTrackTitle } = useLocalSearchParams<{
    albumId?: string;
    tab?: string;
    highlightTrackId?: string;
    refreshKey?: string;
    uploadingTrackTitle?: string;
  }>();
  const { preferences } = useAccountPreferences();
  const advancedModeEnabled = preferences?.advancedModeEnabled ?? false;
  const [album, setAlbum] = useState<DashboardAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(tab === "tracks" ? "tracks" : "overview");
  const [menuVisible, setMenuVisible] = useState(false);
  const { showToast } = useToast();
  const unreadCount = useUnreadNotificationCount();

  const handleChangeTab = useCallback((nextTab: string) => {
    setMenuVisible(false);
    setActiveTab(nextTab);
  }, []);

  const handleUnpublish = async () => {
    if (!album || !albumId) return;
    setMenuVisible(false);
    Alert.alert(
      "Unpublish Release",
      "This will take your release offline and move it back to draft. You can re-publish it at any time from the Release Builder.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unpublish",
          style: "destructive",
          onPress: async () => {
            try {
              await unpublishAlbum(album.id);
              showToast({
                tone: "success",
                title: "Release unpublished",
                message: "Release unpublished successfully. This release is now a draft.",
              });
              router.dismissAll();
              router.replace(`/create/release?draftAlbumId=${album.id}` as never);
            } catch (err) {
              showToast({
                tone: "error",
                title: "Unpublish failed",
                message: err instanceof Error ? err.message : "Unable to unpublish release.",
              });
            }
          },
        },
      ],
    );
  };

  const menuItems = [
    {
      key: "edit",
      label: "Edit Album",
      icon: "create-outline" as const,
      onPress: () => {
        if (albumId) {
          router.push(`/catalog/albums/${albumId}/edit` as never);
        }
      },
    },
    {
      key: "share",
      label: "Share Album",
      icon: "share-outline" as const,
      onPress: () => void handleShare(),
    },
    ...(album?.status.canUnpublish ? [{
      key: "unpublish",
      label: "Unpublish Release",
      icon: "arrow-down-circle-outline" as const,
      tone: "destructive" as const,
      onPress: () => void handleUnpublish(),
    }] : []),
  ];

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


  useEffect(() => {
    if (tab === "tracks") {
      setActiveTab("tracks");
    }
  }, [tab]);

  const handleShare = async () => {
    if (!album) return;
    try {
      const shareUrl = album.publicHref || `https://micboxx.com/album/${album.uuid}`;
      await Share.share({
        message: `Check out my album "${album.title}" on MicBoxx! ${shareUrl}`,
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

          <AnimatedPressable style={styles.circularBtn} onPress={() => setMenuVisible(true)} haptic="selection">
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </AnimatedPressable>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false} noPaddingHorizontal noPaddingBottom contentContainerStyle={styles.noInnerPadding} header={renderCustomHeader()}>
      <NestableScrollContainer
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
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
            onChangeTab={handleChangeTab}
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
                {advancedModeEnabled && <AlbumReleaseHealthPanel album={album} />}
                <AlbumReleaseInfoPanel album={album} />
              </View>

              {/* Tracks preview */}
              <AlbumTrackPreview
                album={album}
                onViewAll={() => handleChangeTab("tracks")}
              />
            </>
          ) : activeTab === "tracks" ? (
            <AlbumFullTrackList
              album={album}
              highlightTrackId={highlightTrackId}
              pendingTrackTitle={uploadingTrackTitle}
              onAlbumUpdate={setAlbum}
            />
          ) : (
            <ComingSoonStub tab={activeTab} />
          )}

          <BottomActionSheet
            visible={menuVisible}
            title="Album Options"
            items={menuItems}
            onClose={() => setMenuVisible(false)}
          />
        </>
      )}
      </NestableScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  noInnerPadding: {
    padding: 0,
    gap: 0,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 18,
  },
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
