import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import type { DashboardPlaylistSummary } from "@micboxx/contracts";
import {
  formatDuration,
  formatRelativeTime,
  getMyPlaylists,
} from "@micboxx/api";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { ErrorState, Panel, ScreenShell } from "@/shared/ui/layout";

type PlaylistFilter = "all" | "published" | "draft";

function matchesFilter(
  playlist: DashboardPlaylistSummary,
  filter: PlaylistFilter,
) {
  if (filter === "published") return playlist.status.published;
  if (filter === "draft") return !playlist.status.published;
  return true;
}

export default function DashboardPlaylistsScreen() {
  const [items, setItems] = useState<DashboardPlaylistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlaylistFilter>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyPlaylists(1, 50);
        if (!active) return;
        setItems(response.playlists);
      } catch (nextError) {
        if (!active) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load playlists.",
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
      published: items.filter((item) => item.status.published).length,
      draft: items.filter((item) => !item.status.published).length,
    }),
    [items],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  );

  return (
    <ScreenShell
      title="Playlists"
      subtitle="Listener collections built from your catalog tracks."
    >
      <ChipTabs
        value={filter}
        onChange={(next) => setFilter(next as PlaylistFilter)}
        options={[
          { key: "all", label: "Playlists", count: counts.all },
          { key: "published", label: "Published", count: counts.published },
          { key: "draft", label: "Draft", count: counts.draft },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel
          title="Loading playlists"
          description="Fetching playlist dashboard rows."
        />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No playlists in this filter"
          description="Playlists appear here as soon as they are created."
        />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "playlist", label: "Playlist" },
              { key: "tracks", label: "Tracks" },
              { key: "length", label: "Length" },
              { key: "status", label: "Status" },
            ]}
          />
          {filteredItems.map((playlist) => (
            <ListRow key={playlist.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "#F7FAFC", fontSize: 13, fontWeight: "700" }}>
                    {playlist.title}
                  </Text>
                  <Text style={{ color: "#A9B4C0", fontSize: 11 }}>
                    Updated {formatRelativeTime(playlist.timestamps.updatedAt)}
                  </Text>
                </View>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {playlist.counts.tracks}
                </Text>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {formatDuration(playlist.counts.duration)}
                </Text>
                <StatusPill
                  label={playlist.status.published ? "published" : "draft"}
                  tone={playlist.status.published ? "success" : "muted"}
                />
              </View>
            </ListRow>
          ))}
        </ListShell>
      )}
    </ScreenShell>
  );
}
