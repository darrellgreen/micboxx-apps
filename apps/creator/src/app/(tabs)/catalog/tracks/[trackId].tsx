import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";

import type { DashboardTrack } from "@/contracts/creator";
import { getTrackStatus, publishTrack, requeueTrack, unpublishTrack } from "@/shared/api/creator-dashboard";
import { ErrorState, KeyValueRow, Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function TrackDetailScreen() {
  const { trackId } = useLocalSearchParams<{ trackId?: string }>();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScreenShell title="Track detail" subtitle="Track-level status, metadata, and operational actions.">
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading || !track ? (
        <Panel title="Loading track" description="Reading the current dashboard track payload." />
      ) : (
        <>
          <Panel title={track.title} description={track.description ?? "No description yet."}>
            <KeyValueRow label="Album" value={track.album?.title ?? "No album"} />
            <KeyValueRow label="Genre" value={track.genre?.name ?? "No genre"} />
            <KeyValueRow label="Release state" value={track.status.releaseState} />
            <KeyValueRow label="Processing" value={track.status.processing} />
            <KeyValueRow label="Published" value={track.status.published ? "Yes" : "No"} />
          </Panel>
          <View style={styles.actions}>
            <PillButton label="Edit track" tone="accent" onPress={() => router.push(`/catalog/tracks/${track.id}/edit` as never)} />
            {track.status.canPublish ? (
              <PillButton label="Publish" onPress={() => void runAction("publish")} />
            ) : null}
            {track.status.canUnpublish ? (
              <PillButton label="Unpublish" onPress={() => void runAction("unpublish")} />
            ) : null}
            {track.status.canRequeue ? (
              <PillButton label="Requeue" onPress={() => void runAction("requeue")} />
            ) : null}
          </View>
          {track.status.error ? (
            <Panel title="Processing error">
              <Text style={styles.copy}>{track.status.error}</Text>
            </Panel>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  copy: {
    color: "#A9B4C0",
    fontSize: 14,
    lineHeight: 20,
  },
});
