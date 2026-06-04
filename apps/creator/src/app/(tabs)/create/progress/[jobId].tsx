import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, StyleSheet, View } from "react-native";

import type { DashboardTrack } from "@/contracts/creator";
import { getTrackStatus, requeueTrack } from "@/shared/api/creator-dashboard";
import { ErrorState, KeyValueRow, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function UploadProgressScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      setTrack(await getTrackStatus(jobId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load upload progress.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRequeue() {
    if (!jobId) return;
    try {
      setTrack(await requeueTrack(jobId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to requeue the upload.");
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Upload Progress" fallbackRoute="/(tabs)/create" />}
      contentContainerStyle={styles.screenContent}
    >
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading || !track ? (
        <Panel title="Loading upload status" description="Reading current processing state." />
      ) : (
        <>
          <Panel title={track.title}>
            <KeyValueRow label="Processing" value={track.status.processing} />
            <KeyValueRow label="Release state" value={track.status.releaseState} />
            <KeyValueRow label="Attempts" value={String(track.status.attempts)} />
            <KeyValueRow label="Ready" value={track.status.ready ? "Yes" : "No"} />
          </Panel>
          {track.status.error ? (
            <Panel title="Processing issue">
              <Text style={styles.copy}>{track.status.error}</Text>
            </Panel>
          ) : null}
          <View style={styles.actions}>
            <PillButton label="Refresh" onPress={() => void load()} />
            <PillButton label="Review track" tone="accent" onPress={() => router.push(`/create/review/${track.id}` as never)} />
            {track.status.canRequeue ? <PillButton label="Requeue" onPress={() => void handleRequeue()} /> : null}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
