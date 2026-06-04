import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { DashboardTrackSummary } from "@/contracts/creator";
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
import { tokens } from "@micboxx/theme";

type TrackFilter = "all" | "draft" | "scheduled" | "published" | "failed";

function matchesFilter(track: DashboardTrackSummary, filter: TrackFilter) {
  if (filter === "draft") return track.status.releaseState === "draft";
  if (filter === "scheduled") return track.status.releaseState === "scheduled";
  if (filter === "published") return track.status.releaseState === "published";
  if (filter === "failed") return track.status.processing === "failed";
  return true;
}

function releaseTone(track: DashboardTrackSummary) {
  if (track.status.processing === "failed") {
    return "danger" as const;
  }
  if (track.status.releaseState === "published") {
    return "success" as const;
  }
  if (track.status.releaseState === "scheduled") {
    return "warning" as const;
  }
  return "muted" as const;
}

export default function TracksListScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const filter: TrackFilter =
    params.filter === "draft" ||
    params.filter === "scheduled" ||
    params.filter === "published" ||
    params.filter === "failed"
      ? params.filter
      : "all";
  const [items, setItems] = useState<DashboardTrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyTracks(1, 50);
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

  const filterCounts = useMemo(() => {
    const draft = items.filter((item) => item.status.releaseState === "draft").length;
    const scheduled = items.filter(
      (item) => item.status.releaseState === "scheduled",
    ).length;
    const published = items.filter(
      (item) => item.status.releaseState === "published",
    ).length;
    const failed = items.filter((item) => item.status.processing === "failed").length;
    return {
      all: items.length,
      draft,
      scheduled,
      published,
      failed,
    };
  }, [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items],
  );

  return (
    <Screen
      header={<AppHeader variant="detail" title="Tracks" fallbackRoute="/(tabs)/catalog" />}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.actionsRow}>
        <PillButton
          label="Upload track"
          tone="accent"
          onPress={() => router.push("/create")}
        />
      </View>
      <ChipTabs
        value={filter}
        onChange={(value) =>
          router.replace(
            value === "all" ? "/catalog/tracks" : `/catalog/tracks?filter=${value}`,
          )
        }
        options={[
          { key: "all", label: "All", count: filterCounts.all },
          { key: "draft", label: "Draft", count: filterCounts.draft },
          { key: "scheduled", label: "Scheduled", count: filterCounts.scheduled },
          { key: "published", label: "Published", count: filterCounts.published },
          { key: "failed", label: "Failed", count: filterCounts.failed },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel
          title="Loading tracks"
          description="Pulling creator track rows from the dashboard endpoint."
        />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No tracks in this filter"
          description="Try another state filter or upload a new track."
        />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "track", label: "Track" },
              { key: "status", label: "Status" },
            ]}
          />
          {filteredItems.map((track) => (
            <ListRow
              key={track.id}
              onPress={() => router.push(`/catalog/tracks/${track.id}` as never)}
            >
              <View style={styles.rowMain}>
                <View style={styles.trackCopy}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackMeta} numberOfLines={1}>
                    {track.album?.title ?? "No album"} ·{" "}
                    {track.genre?.name ?? "No genre"}
                  </Text>
                </View>
                <View style={styles.trackStatus}>
                  <View style={styles.statusRow}>
                    <StatusPill
                      label={track.status.releaseState}
                      tone={releaseTone(track)}
                    />
                    {track.status.processing !== "ready" ? (
                      <StatusPill
                        label={track.status.processing}
                        tone={
                          track.status.processing === "failed"
                            ? "danger"
                            : "warning"
                        }
                      />
                    ) : null}
                  </View>
                  <View style={styles.rowActions}>
                    <PillButton
                      label="Detail"
                      onPress={() =>
                        router.push(`/catalog/tracks/${track.id}` as never)
                      }
                    />
                    <PillButton
                      label="Edit"
                      tone="accent"
                      onPress={() =>
                        router.push(`/catalog/tracks/${track.id}/edit` as never)
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
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  trackMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  trackStatus: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },
  rowActions: {
    flexDirection: "row",
    gap: 6,
  },
});
