import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

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
import { formatDuration, formatRelativeTime } from "@micboxx/api";

type AlbumFilter = "all" | "published" | "scheduled" | "draft";

function matchesFilter(album: DashboardAlbumSummary, filter: AlbumFilter) {
  if (filter === "published") return album.status.releaseState === "published";
  if (filter === "scheduled") return album.status.releaseState === "scheduled";
  if (filter === "draft") return album.status.releaseState === "draft";
  return true;
}

function releaseTone(album: DashboardAlbumSummary) {
  if (album.status.releaseState === "published") return "success" as const;
  if (album.status.releaseState === "scheduled") return "warning" as const;
  return "muted" as const;
}

export default function DashboardAlbumsScreen() {
  const [items, setItems] = useState<DashboardAlbumSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AlbumFilter>("all");

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

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter((item) => item.status.releaseState === "published")
        .length,
      scheduled: items.filter((item) => item.status.releaseState === "scheduled")
        .length,
      draft: items.filter((item) => item.status.releaseState === "draft").length,
    }),
    [items],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  );

  return (
    <ScreenShell
      title="Albums"
      subtitle="Collections that group released tracks into one catalog page."
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
        onChange={(next) => setFilter(next as AlbumFilter)}
        options={[
          { key: "all", label: "Albums", count: counts.all },
          { key: "published", label: "Published", count: counts.published },
          { key: "scheduled", label: "Scheduled", count: counts.scheduled },
          { key: "draft", label: "Draft", count: counts.draft },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel title="Loading albums" description="Fetching album dashboard rows." />
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
              { key: "tracks", label: "Tracks" },
              { key: "length", label: "Length" },
              { key: "status", label: "Status" },
            ]}
          />
          {filteredItems.map((album) => (
            <ListRow
              key={album.id}
              onPress={() => router.push(`/catalog/albums/${album.id}` as never)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "#F7FAFC", fontSize: 13, fontWeight: "700" }}>
                    {album.title}
                  </Text>
                  <Text style={{ color: "#A9B4C0", fontSize: 11 }}>
                    Updated {formatRelativeTime(album.timestamps.updatedAt)}
                  </Text>
                </View>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {album.counts.tracks}
                </Text>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {formatDuration(album.counts.duration)}
                </Text>
                <StatusPill label={album.status.releaseState} tone={releaseTone(album)} />
              </View>
            </ListRow>
          ))}
        </ListShell>
      )}
    </ScreenShell>
  );
}
