import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import type { DashboardTrackSummary } from "@/contracts/creator";
import { formatDuration, formatRelativeTime } from "@micboxx/api";
import { resolveTrackReleaseState } from "@/features/catalog/release-state";
import { getMyTracks } from "@/shared/api/creator-dashboard";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { ErrorState, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

type TrackFilter = "all" | "ready" | "published" | "failed";

function matchesFilter(track: DashboardTrackSummary, filter: TrackFilter) {
  const releaseState = resolveTrackReleaseState(track.status);
  if (filter === "published") return releaseState === "published";
  if (filter === "failed") return track.status.processing === "failed";
  if (filter === "ready") {
    return (
      track.status.ready &&
      track.status.processing !== "failed" &&
      releaseState !== "published"
    );
  }
  return true;
}

function releaseTone(track: DashboardTrackSummary) {
  const releaseState = resolveTrackReleaseState(track.status);
  if (track.status.processing === "failed") return "danger" as const;
  if (releaseState === "published") return "success" as const;
  if (track.status.ready) return "warning" as const;
  return "muted" as const;
}

function statusLabel(track: DashboardTrackSummary) {
  const releaseState = resolveTrackReleaseState(track.status);
  if (track.status.processing === "failed") return "failed";
  if (releaseState === "published") return "published";
  if (track.status.ready) return "ready";
  return track.status.processing;
}

export default function DashboardTracksScreen() {
  const [items, setItems] = useState<DashboardTrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TrackFilter>("all");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyTracks(1, 100);
        if (!active) return;
        setItems(response.tracks);
      } catch (nextError) {
        if (!active) return;
        setError(
          nextError instanceof Error ? nextError.message : "Unable to load tracks.",
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
      ready: items.filter((item) => matchesFilter(item, "ready")).length,
      published: items.filter((item) => matchesFilter(item, "published")).length,
      failed: items.filter((item) => matchesFilter(item, "failed")).length,
    }),
    [items],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter],
  );

  return (
    <Screen
      header={<AppHeader variant="detail" title="Tracks" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <PillButton
          label="Upload track"
          tone="accent"
          onPress={() => router.push("/create/upload")}
        />
      </View>
      <ChipTabs
        value={filter}
        onChange={(next) => setFilter(next as TrackFilter)}
        options={[
          { key: "all", label: "All", count: counts.all },
          { key: "ready", label: "Ready", count: counts.ready },
          { key: "published", label: "Published", count: counts.published },
          { key: "failed", label: "Failed", count: counts.failed },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel title="Loading tracks" description="Fetching track dashboard rows." />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No tracks in this filter"
          description="Try another filter or upload more tracks."
        />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "track", label: "Track" },
              { key: "genre", label: "Genre" },
              { key: "length", label: "Length" },
              { key: "status", label: "Status" },
            ]}
          />
          {filteredItems.map((track) => (
            <ListRow
              key={track.id}
              onPress={() => router.push(`/catalog/tracks/${track.id}` as never)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: "#F7FAFC", fontSize: 13, fontWeight: "700" }}>
                    {track.title}
                  </Text>
                  <Text style={{ color: "#A9B4C0", fontSize: 11 }}>
                    Updated {formatRelativeTime(track.timestamps.updatedAt)}
                  </Text>
                </View>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {track.genre?.name ?? "No genre"}
                </Text>
                <Text style={{ color: "#A9B4C0", fontSize: 12 }}>
                  {formatDuration(track.duration)}
                </Text>
                <StatusPill label={statusLabel(track)} tone={releaseTone(track)} />
              </View>
            </ListRow>
          ))}
        </ListShell>
      )}
    </Screen>
  );
}
