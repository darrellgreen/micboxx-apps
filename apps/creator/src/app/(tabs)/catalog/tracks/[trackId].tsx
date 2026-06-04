import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";

import type { DashboardTrack } from "@/contracts/creator";
import { getTrackStatus, publishTrack, requeueTrack, unpublishTrack } from "@/shared/api/creator-dashboard";
import { ErrorState, Panel } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

import { TrackHeroCard } from "./[trackId]/_components/TrackHeroCard";
import { PerformanceSnapshot } from "./[trackId]/_components/PerformanceSnapshot";
import { TrackTabs } from "./[trackId]/_components/TrackTabs";
import { PerformanceOverviewChart } from "./[trackId]/_components/PerformanceOverviewChart";
import { AudienceSummaryCards } from "./[trackId]/_components/AudienceSummaryCards";
import { TrackStatusPanel } from "./[trackId]/_components/TrackStatusPanel";
import { ReleaseHealthPanel } from "./[trackId]/_components/ReleaseHealthPanel";
import { TrackQuickActions } from "./[trackId]/_components/TrackQuickActions";

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

  return (
    <Screen header={<AppHeader variant="detail" title="Track Details" fallbackRoute="/(tabs)/catalog" />}>
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
              <ReleaseHealthPanel track={track} />
              <TrackQuickActions track={track} />
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
  copy: {
    color: "#A9B4C0",
    fontSize: 14,
    lineHeight: 20,
  },
});
