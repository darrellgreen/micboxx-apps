import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DashboardAlbumSummary } from "@/contracts/creator";
import { getMyAlbums } from "@/shared/api/creator-dashboard";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { ErrorState, Panel, PillButton, ScreenShell } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

type AlbumFilter = "all" | "draft" | "scheduled" | "published";

function matchesFilter(album: DashboardAlbumSummary, filter: AlbumFilter) {
  if (filter === "draft") return album.status.releaseState === "draft";
  if (filter === "scheduled") return album.status.releaseState === "scheduled";
  if (filter === "published") return album.status.releaseState === "published";
  return true;
}

function releaseTone(album: DashboardAlbumSummary) {
  if (album.status.releaseState === "published") {
    return "success" as const;
  }
  if (album.status.releaseState === "scheduled") {
    return "warning" as const;
  }
  return "muted" as const;
}

export default function AlbumsListScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const filter: AlbumFilter =
    params.filter === "draft" ||
    params.filter === "scheduled" ||
    params.filter === "published"
      ? params.filter
      : "all";
  const [items, setItems] = useState<DashboardAlbumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyAlbums(1, 50);
        if (!active) return;
        setItems(response.albums);
      } catch (nextError) {
        if (!active) return;
        setError(
          nextError instanceof Error ? nextError.message : "Unable to load albums.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const filterCounts = useMemo(() => {
    const draft = items.filter((item) => item.status.releaseState === "draft").length;
    const scheduled = items.filter(
      (item) => item.status.releaseState === "scheduled",
    ).length;
    const published = items.filter(
      (item) => item.status.releaseState === "published",
    ).length;
    return {
      all: items.length,
      draft,
      scheduled,
      published,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items],
  );

  return (
    <ScreenShell
      title="Albums"
      subtitle="Album entities with release-state filters and membership health."
      actions={
        <PillButton
          label="Create album"
          tone="accent"
          onPress={() => router.push("/create/album")}
        />
      }
    >
      <ChipTabs
        value={filter}
        onChange={(value) =>
          router.replace(
            value === "all" ? "/catalog/albums" : `/catalog/albums?filter=${value}`,
          )
        }
        options={[
          { key: "all", label: "All", count: filterCounts.all },
          { key: "draft", label: "Draft", count: filterCounts.draft },
          { key: "scheduled", label: "Scheduled", count: filterCounts.scheduled },
          {
            key: "published",
            label: "Published",
            count: filterCounts.published,
          },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel
          title="Loading albums"
          description="Pulling creator album rows from the dashboard endpoint."
        />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No albums in this filter"
          description="Try another state filter or create a new album."
        />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "album", label: "Album" },
              { key: "status", label: "Status" },
            ]}
          />
          {filteredItems.map((album) => (
            <ListRow
              key={album.id}
              onPress={() => router.push(`/catalog/albums/${album.id}` as never)}
            >
              <View style={styles.rowMain}>
                <View style={styles.albumCopy}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.albumMeta} numberOfLines={1}>
                    {album.counts.tracks} tracks · {album.counts.publicReadyTracks}{" "}
                    public-ready
                  </Text>
                </View>
                <View style={styles.albumStatus}>
                  <StatusPill label={album.status.releaseState} tone={releaseTone(album)} />
                  <View style={styles.rowActions}>
                    <PillButton
                      label="Detail"
                      onPress={() =>
                        router.push(`/catalog/albums/${album.id}` as never)
                      }
                    />
                    <PillButton
                      label="Edit"
                      tone="accent"
                      onPress={() =>
                        router.push(`/catalog/albums/${album.id}/edit` as never)
                      }
                    />
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={tokens.colors.textSecondary}
                />
              </View>
            </ListRow>
          ))}
        </ListShell>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  albumCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  albumTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  albumMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  albumStatus: {
    alignItems: "flex-end",
    gap: 8,
  },
  rowActions: {
    flexDirection: "row",
    gap: 6,
  },
});
