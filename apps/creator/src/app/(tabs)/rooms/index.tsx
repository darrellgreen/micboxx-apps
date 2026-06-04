import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { CreatorRoomListItem } from "@/features/rooms/types";
import { getCreatorRoomList } from "@/features/rooms/api";
import {
  ChipTabs,
  ListHeader,
  ListRow,
  ListShell,
  StatusPill,
} from "@/shared/ui/dashboard-primitives";
import { ErrorState, Panel, PillButton } from "@/shared/ui/layout";
import { Screen } from "@micboxx/ui";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { formatRelativeTime } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

type RoomFilter = "all" | "active" | "unvisited" | "artist_live";

function matchesFilter(item: CreatorRoomListItem, filter: RoomFilter) {
  if (filter === "active") return item.room_status === "awakened";
  if (filter === "unvisited") return !item.has_visits || item.room_status === "unvisited";
  if (filter === "artist_live") return item.artist_presence_state === "active";
  return true;
}

function releaseTone(item: CreatorRoomListItem) {
  if (item.artist_presence_state === "active") return "warning" as const;
  if (item.room_status === "awakened") return "success" as const;
  return "muted" as const;
}

function formatRoomTime(value: number | null) {
  if (!value) return "not visited yet";
  return formatRelativeTime(new Date(value * 1000).toISOString());
}

export default function RoomsIndexScreen() {
  const [items, setItems] = useState<CreatorRoomListItem[]>([]);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const nextItems = await getCreatorRoomList();
        if (active) {
          setItems(nextItems);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load Rooms.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => ({
    all: items.length,
    active: items.filter((item) => item.room_status === "awakened").length,
    unvisited: items.filter((item) => !item.has_visits || item.room_status === "unvisited").length,
    artist_live: items.filter((item) => item.artist_presence_state === "active").length,
  }), [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items],
  );

  return (
    <Screen header={<ScreenHeader title="Live Rooms" />} contentContainerStyle={styles.screenContent}>
      <ChipTabs
        value={filter}
        onChange={(next) => setFilter(next as RoomFilter)}
        options={[
          { key: "all", label: "All", count: counts.all },
          { key: "active", label: "Active", count: counts.active },
          { key: "unvisited", label: "Unvisited", count: counts.unvisited },
          { key: "artist_live", label: "Artist live", count: counts.artist_live },
        ]}
      />

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <Panel title="Loading Rooms" description="Reading your managed Rooms from MicBoxx." />
      ) : filteredItems.length === 0 ? (
        <Panel
          title="No Rooms in this filter"
          description="Rooms appear for published releases you can manage."
        />
      ) : (
        <ListShell>
          <ListHeader
            columns={[
              { key: "release", label: "Release" },
              { key: "state", label: "State", align: "right" },
            ]}
          />
          {filteredItems.map((item) => (
            <ListRow
              key={`${item.release_ref_type}:${item.release_ref_id}`}
              onPress={() => router.push(`/rooms/${item.release_ref_id}` as never)}
            >
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  {item.artwork_url ? (
                    <Image source={{ uri: item.artwork_url }} style={styles.artwork} contentFit="cover" />
                  ) : (
                    <Ionicons name="radio-outline" size={18} color={tokens.colors.accent} />
                  )}
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={1}>{item.release_title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.state_line} · {formatRoomTime(item.last_activity_at)}
                  </Text>
                </View>
                <StatusPill label={item.artist_presence_state === "active" ? "artist live" : item.room_status} tone={releaseTone(item)} />
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: tokens.radii.md,
    backgroundColor: tokens.colors.accentDim,
    height: 34,
    justifyContent: "center",
    width: 34,
    overflow: "hidden",
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
});
