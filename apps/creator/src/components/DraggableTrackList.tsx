import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  NestableDraggableFlatList,
  type RenderItemParams,
  type DragEndParams,
} from "react-native-draggable-flatlist";

import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbumTrack } from "@/contracts/creator";

export interface DraggableTrackItem {
  trackId: number;
  title: string;
  index: number;
  status: { label: string; tone: "ready" | "working" | "failed" | "draft" };
}

interface DraggableTrackListProps {
  tracks: DashboardAlbumTrack[];
  reorderEnabled: boolean;
  onTrackPress?: (trackId: number) => void;
  onReorder: (reorderedTracks: DashboardAlbumTrack[]) => void;
  highlightTrackId?: string;
  pendingTrackTitle?: string;
}

function resolveTrackStatus(track: DashboardAlbumTrack): {
  label: string;
  tone: "ready" | "working" | "failed" | "draft";
} {
  if (track.status.processing === "failed") return { label: "Failed", tone: "failed" };
  if (track.status.processing === "pending" || track.status.processing === "processing") {
    return { label: "Processing audio...", tone: "working" };
  }
  if (track.status.ready || track.status.publicReady) return { label: "Ready", tone: "ready" };
  return { label: "Draft", tone: "draft" };
}

export function DraggableTrackList({
  tracks,
  reorderEnabled,
  onTrackPress,
  onReorder,
  highlightTrackId,
  pendingTrackTitle,
}: DraggableTrackListProps) {
  const [localTracks, setLocalTracks] = useState(tracks);

  useEffect(() => {
    setLocalTracks(tracks);
  }, [tracks]);

  const handleDragEnd = useCallback(
    ({ data }: DragEndParams<DashboardAlbumTrack>) => {
      setLocalTracks(data);
      onReorder(data);
    },
    [onReorder],
  );

  const renderItem = useCallback(
    ({ item: track, getIndex, drag, isActive }: RenderItemParams<DashboardAlbumTrack>) => {
      const index = getIndex() ?? 0;
      const isLast = index === localTracks.length - 1;
      const status = resolveTrackStatus(track);
      const highlighted = String(track.trackId) === highlightTrackId;

      return (
        <View
          style={[
            styles.row,
            isLast && styles.rowLast,
            highlighted && styles.rowHighlighted,
            isActive && styles.rowActive,
          ]}
        >
          <AnimatedPressable
            style={styles.rowContent}
            onPress={onTrackPress ? () => onTrackPress(track.trackId) : undefined}
            haptic="selection"
          >
            <View style={styles.left}>
              <Text style={styles.index}>{index + 1}.</Text>
              <View style={styles.trackCopy}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <View style={styles.statusLine}>
                  <View
                    style={[
                      styles.statusDot,
                      status.tone === "ready" && styles.statusDot_ready,
                      status.tone === "working" && styles.statusDot_working,
                      status.tone === "failed" && styles.statusDot_failed,
                      status.tone === "draft" && styles.statusDot_draft,
                    ]}
                  />
                  <Text
                    style={[
                      styles.trackStatus,
                      status.tone === "ready" && styles.trackStatus_ready,
                      status.tone === "working" && styles.trackStatus_working,
                      status.tone === "failed" && styles.trackStatus_failed,
                      status.tone === "draft" && styles.trackStatus_draft,
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedPressable>

          {reorderEnabled ? (
            <AnimatedPressable
              style={styles.dragHandle}
              onLongPress={drag}
              delayLongPress={100}
              haptic="selection"
            >
              <Ionicons
                name="reorder-three-outline"
                size={22}
                color={tokens.colors.textSecondary}
              />
            </AnimatedPressable>
          ) : (
            <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
          )}
        </View>
      );
    },
    [highlightTrackId, localTracks.length, onTrackPress, reorderEnabled],
  );

  const visibleTrackCount = localTracks.length + (pendingTrackTitle ? 1 : 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tracklist</Text>
          <Text style={styles.subtitle}>
            {visibleTrackCount} {visibleTrackCount === 1 ? "track" : "tracks"} in this release
          </Text>
        </View>
        {reorderEnabled && localTracks.length > 1 ? (
          <View style={styles.reorderBadge}>
            <Ionicons name="swap-vertical-outline" size={12} color={tokens.colors.accent} />
            <Text style={styles.reorderBadgeText}>Drag to reorder</Text>
          </View>
        ) : null}
      </View>

      {localTracks.length > 0 || pendingTrackTitle ? (
        <>
          {pendingTrackTitle ? (
            <View style={[styles.row, styles.rowPending]}>
              <View style={styles.left}>
                <Text style={styles.index}>{localTracks.length + 1}.</Text>
                <View style={styles.trackCopy}>
                  <Text style={styles.trackTitle}>{pendingTrackTitle}</Text>
                  <View style={styles.statusLine}>
                    <View style={[styles.statusDot, styles.statusDot_working]} />
                    <Text style={[styles.trackStatus, styles.trackStatus_working]}>
                      Uploading...
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="cloud-upload-outline" size={14} color={tokens.colors.accent} />
            </View>
          ) : null}

          <NestableDraggableFlatList
            data={localTracks}
            keyExtractor={(item) => String(item.trackId)}
            renderItem={renderItem}
            onDragEnd={handleDragEnd}
            dragItemOverflow
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={24} color={tokens.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No tracks added yet</Text>
          <Text style={styles.emptyCopy}>
            Tracks will be shown here once they are added to the release draft.
          </Text>
        </View>
      )}
    </View>
  );
}

const CARD_BG = "#131820";

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  reorderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0, 179, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 179, 166, 0.15)",
  },
  reorderBadgeText: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "700",
  },
  separator: {
    height: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.03)",
    backgroundColor: CARD_BG,
    minHeight: 56,
  },
  rowContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowHighlighted: {
    backgroundColor: "rgba(0, 179, 166, 0.08)",
    borderBottomColor: "rgba(0, 179, 166, 0.18)",
  },
  rowActive: {
    backgroundColor: "rgba(0, 179, 166, 0.12)",
    borderRadius: 10,
    elevation: 8,
  },
  rowPending: {
    backgroundColor: "rgba(0, 179, 166, 0.06)",
    borderBottomColor: "rgba(0, 179, 166, 0.12)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  index: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    width: 18,
  },
  trackCopy: {
    gap: 3,
    flex: 1,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDot_ready: { backgroundColor: tokens.colors.success },
  statusDot_working: { backgroundColor: tokens.colors.accent },
  statusDot_failed: { backgroundColor: tokens.colors.danger },
  statusDot_draft: { backgroundColor: tokens.colors.textMuted },
  trackStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  trackStatus_ready: { color: tokens.colors.success },
  trackStatus_working: { color: tokens.colors.accent },
  trackStatus_failed: { color: tokens.colors.danger },
  trackStatus_draft: { color: tokens.colors.textSecondary },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
});
