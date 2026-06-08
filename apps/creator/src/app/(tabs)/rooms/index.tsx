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
import { ErrorState } from "@/shared/ui/layout";
import { AnimatedPressable, Screen } from "@micboxx/ui";
import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";
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

// ─── Empty states ─────────────────────────────────────────────────────────────

function RoomsHeroEmpty() {
  return (
    <View style={e.wrap}>
      {/* Hero card */}
      <View style={e.heroCard}>
        <View style={e.iconWrap}>
          <SoundwaveTabIcon size={28} color={tokens.colors.accent} />
        </View>
        <Text style={e.heroTitle}>Turn your releases into live fan moments</Text>
        <Text style={e.heroBody}>
          Create a release and enable its Room to unlock Live, Q&A, Polls, Support, and real-time audience tools.
        </Text>
        <AnimatedPressable
          style={e.primaryBtn}
          onPress={() => router.push("/create/release" as never)}
          haptic="light"
        >
          <Ionicons name="add" size={16} color="#000" />
          <Text style={e.primaryBtnText}>Create release</Text>
        </AnimatedPressable>
      </View>

      {/* How it works */}
      <View style={e.howCard}>
        <Text style={e.howTitle}>How Rooms work</Text>
        <View style={e.howDivider} />
        <HowStep number={1} title="Create a release" body="Add tracks, artwork, and release details." />
        <View style={e.howDivider} />
        <HowStep number={2} title="Enable the Release Room" body="Turn the release into a live fan space." />
        <View style={e.howDivider} />
        <HowStep number={3} title="Start moments" body="Go live, run Q&As, create polls, and invite fan support." />
      </View>
    </View>
  );
}

function HowStep({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <View style={e.howStep}>
      <View style={e.howNum}>
        <Text style={e.howNumText}>{number}</Text>
      </View>
      <View style={e.howCopy}>
        <Text style={e.howStepTitle}>{title}</Text>
        <Text style={e.howStepBody}>{body}</Text>
      </View>
    </View>
  );
}

function FilterEmpty({ title, body }: { title: string; body: string }) {
  return (
    <View style={e.filterEmpty}>
      <Text style={e.filterEmptyTitle}>{title}</Text>
      <Text style={e.filterEmptyBody}>{body}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

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

  const showFilters = !loading && items.length > 0;

  return (
    <Screen header={<ScreenHeader title="Release Rooms" subtitle="Live release spaces" />} contentContainerStyle={styles.screenContent}>
      {showFilters && (
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
      )}

      {error ? <ErrorState message={error} /> : null}

      {loading ? (
        <FilterEmpty title="Loading rooms…" body="Reading your Release Rooms from MicBoxx." />
      ) : filteredItems.length === 0 ? (
        filter === "all" ? (
          <RoomsHeroEmpty />
        ) : filter === "active" ? (
          <FilterEmpty title="No active Rooms" body="Open a Release Room when you're ready to host fans live." />
        ) : filter === "unvisited" ? (
          <FilterEmpty title="No unvisited Rooms" body="Rooms you haven't opened yet will appear here." />
        ) : (
          <FilterEmpty title="No artist live Rooms" body="Live Rooms will appear here when you're actively hosting." />
        )
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

// ─── Empty state styles ───────────────────────────────────────────────────────

const e = StyleSheet.create({
  wrap: { gap: 12 },

  // Hero card
  heroCard: {
    backgroundColor: "rgba(0,200,180,0.04)",
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    padding: 20,
    gap: 14,
    alignItems: "center",
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 20, fontWeight: "800", letterSpacing: -0.3,
    textAlign: "center",
  },
  heroBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14, lineHeight: 21,
    textAlign: "center",
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 24, paddingVertical: 13,
    alignSelf: "stretch", justifyContent: "center",
  },
  primaryBtnText: { color: "#000", fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 4,
  },
  secondaryBtnText: { color: tokens.colors.accent, fontSize: 14, fontWeight: "600" },

  // How it works card
  howCard: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 16,
    gap: 12,
  },
  howTitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  howDivider: { height: 1, backgroundColor: tokens.colors.borderSubtle },
  howStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  howNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1,
  },
  howNumText: { color: tokens.colors.accent, fontSize: 12, fontWeight: "800" },
  howCopy: { flex: 1, gap: 2 },
  howStepTitle: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  howStepBody: { color: tokens.colors.textSecondary, fontSize: 13, lineHeight: 19 },

  // Filter-specific empty state
  filterEmpty: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  filterEmptyTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "700" },
  filterEmptyBody: { color: tokens.colors.textSecondary, fontSize: 13, lineHeight: 19, textAlign: "center", paddingHorizontal: 24 },
});

// ─── List styles ──────────────────────────────────────────────────────────────

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
