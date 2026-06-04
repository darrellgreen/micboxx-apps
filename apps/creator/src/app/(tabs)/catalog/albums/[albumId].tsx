import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

import type { DashboardAlbum } from "@/contracts/creator";
import { getAlbumStatus, publishAlbum, unpublishAlbum } from "@/shared/api/creator-dashboard";
import { ErrorState, KeyValueRow, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function AlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId?: string }>();
  const [album, setAlbum] = useState<DashboardAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function handlePublishToggle() {
    if (!albumId || !album) return;
    try {
      const nextAlbum = album.status.published
        ? await unpublishAlbum(albumId)
        : await publishAlbum(albumId);
      setAlbum(nextAlbum);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Album action failed.");
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Album" fallbackRoute="/(tabs)/catalog" />}
      contentContainerStyle={styles.screenContent}
    >
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading || !album ? (
        <Panel title="Loading album" description="Reading the current dashboard album payload." />
      ) : (
        <>
          <Panel title={album.title} description={album.description ?? "No description yet."}>
            <KeyValueRow label="Tracks" value={String(album.counts.tracks)} />
            <KeyValueRow label="Release state" value={album.status.releaseState} />
            <KeyValueRow label="Published" value={album.status.published ? "Yes" : "No"} />
            <KeyValueRow label="Price" value={album.commerce.price ?? "Not sellable"} />
          </Panel>
          <View style={styles.actions}>
            <PillButton label="Edit album" tone="accent" onPress={() => router.push(`/catalog/albums/${album.id}/edit` as never)} />
            <PillButton
              label={album.status.published ? "Unpublish" : "Publish"}
              onPress={() => void handlePublishToggle()}
            />
          </View>
          <Panel title="Track membership">
            {album.tracks.map((track) => (
              <Text key={track.trackId} style={styles.copy}>
                {track.title} · {track.status.processing}
              </Text>
            ))}
          </Panel>
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
    color: "#A9B4C0",
    fontSize: 14,
    lineHeight: 20,
  },
});
