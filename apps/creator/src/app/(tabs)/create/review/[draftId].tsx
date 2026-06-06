import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { DashboardTrack } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { getTrackStatus, publishTrack } from "@/shared/api/creator-dashboard";
import { ErrorState, KeyValueRow, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function ReviewTrackScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const bootstrap = useCreatorBootstrap();
  const [track, setTrack] = useState<DashboardTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    setError(null);
    try {
      setTrack(await getTrackStatus(draftId));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load draft review.");
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePublish() {
    if (!draftId) return;
    try {
      const nextTrack = await publishTrack(draftId);
      setTrack(nextTrack);
      await bootstrap.refetch();
      router.replace(`/create/success/track/${nextTrack.id}` as never);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to publish draft.");
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Review & Publish" fallbackRoute="/(tabs)/create" />}
      contentContainerStyle={styles.screenContent}
    >
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading || !track ? (
        <Panel title="Loading draft" description="Reading the current draft track payload." />
      ) : (
        <>
          <Panel title={track.title} description={track.description ?? "No description yet."}>
            <KeyValueRow label="Album" value={track.album?.title ?? "No album"} />
            <KeyValueRow label="Genre" value={track.genre?.name ?? "No genre"} />
            <KeyValueRow label="Processing" value={track.status.processing} />
            <KeyValueRow label="Release state" value={resolveTrackReleaseState(track.status)} />
          </Panel>
          <View style={styles.actionsRow}>
            <PillButton
              label="Edit metadata"
              onPress={() => router.push(`/catalog/tracks/${track.id}/edit` as never)}
            />
            {track.status.canPublish ? (
              <PillButton
                label="Publish now"
                tone="accent"
                onPress={() => void handlePublish()}
              />
            ) : null}
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
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 2,
    borderTopColor: tokens.colors.borderSubtle,
  },
});
