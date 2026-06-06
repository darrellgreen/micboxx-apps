import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardAlbum, DashboardAlbumTrack, DashboardTrack } from "@/contracts/creator";
import { getTrackStatus } from "@/shared/api/creator-dashboard";

const CARD_BG = "#131820";

interface AlbumFullTrackListProps {
  album: DashboardAlbum;
  highlightTrackId?: string;
  pendingTrackTitle?: string;
}

function resolveTrackStatus(track: DashboardAlbumTrack): {
  label: string;
  tone: "ready" | "working" | "failed" | "draft";
} {
  if (track.status.processing === "failed") {
    return { label: "Failed", tone: "failed" };
  }

  if (track.status.processing === "pending") {
    return { label: "Processing audio...", tone: "working" };
  }

  if (track.status.processing === "processing") {
    return { label: "Processing audio...", tone: "working" };
  }

  if (track.status.ready || track.status.publicReady) {
    return { label: "Ready", tone: "ready" };
  }

  return { label: "Draft", tone: "draft" };
}

function isTrackProcessing(track: DashboardAlbumTrack) {
  return (
    track.status.processing === "pending" ||
    track.status.processing === "processing" ||
    track.status.processing === "failed"
  );
}

function mapTrackToAlbumRow(track: DashboardTrack): DashboardAlbumTrack {
  return {
    trackId: track.id,
    title: track.title,
    slug: track.slug,
    duration: track.duration,
    artist: track.owner
      ? {
          id: track.owner.id,
          displayName: track.owner.displayName,
          verifiedBadge: track.owner.verifiedBadge,
        }
      : null,
    genre: track.genre,
    artworkUrl: track.assets.artworkUrl,
    status: {
      published: track.status.published,
      processing: track.status.processing,
      ready: track.status.ready,
      publicReady: Boolean(track.publicHref && track.status.ready),
    },
    publicHref: track.publicHref,
  };
}

export function AlbumFullTrackList({
  album,
  highlightTrackId,
  pendingTrackTitle,
}: AlbumFullTrackListProps) {
  const [tracks, setTracks] = useState(album.tracks);
  const visibleTrackCount = tracks.length + (pendingTrackTitle ? 1 : 0);

  useEffect(() => {
    setTracks(album.tracks);
  }, [album.tracks]);

  const refreshProcessingRows = useCallback(async () => {
    const processingTracks = tracks.filter(isTrackProcessing);
    if (processingTracks.length === 0) return;

    const settledRows = await Promise.allSettled(
      processingTracks.map(async (track) => mapTrackToAlbumRow(await getTrackStatus(track.trackId))),
    );
    const refreshedById = new Map<number, DashboardAlbumTrack>();

    settledRows.forEach((result) => {
      if (result.status === "fulfilled") {
        refreshedById.set(result.value.trackId, result.value);
      }
    });

    if (refreshedById.size === 0) return;

    setTracks((currentTracks) =>
      currentTracks.map((track) => refreshedById.get(track.trackId) ?? track),
    );
  }, [tracks]);

  useEffect(() => {
    if (!tracks.some(isTrackProcessing)) return;

    const interval = setInterval(() => {
      void refreshProcessingRows();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshProcessingRows, tracks]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tracks</Text>
          <Text style={styles.subtitle}>
            {visibleTrackCount} {visibleTrackCount === 1 ? "track" : "tracks"} in this release
          </Text>
        </View>
        <AnimatedPressable
          style={styles.addButton}
          onPress={() => router.push(`/create/upload-push?albumId=${album.id}` as never)}
          haptic="selection"
        >
          <Ionicons name="add" size={16} color={tokens.colors.accent} />
          <Text style={styles.addButtonText}>Add Track</Text>
        </AnimatedPressable>
      </View>
      
      {album.tracks.length > 0 || pendingTrackTitle ? (
        <View style={styles.list}>
          {pendingTrackTitle ? (
            <View style={[styles.row, styles.rowPending]}>
              <View style={styles.left}>
                <Text style={styles.index}>{tracks.length + 1}.</Text>
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
          {tracks.map((track, idx) => {
            const status = resolveTrackStatus(track);
            const highlighted = String(track.trackId) === highlightTrackId;

            return (
              <View key={track.trackId} style={[styles.row, highlighted && styles.rowHighlighted]}>
                <View style={styles.left}>
                  <Text style={styles.index}>{idx + 1}.</Text>
                  <View style={styles.trackCopy}>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                    <View style={styles.statusLine}>
                      <View style={[styles.statusDot, styles[`statusDot_${status.tone}`]]} />
                      <Text style={[styles.trackStatus, styles[`trackStatus_${status.tone}`]]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={14} color={tokens.colors.textSecondary} />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="musical-notes-outline" size={24} color={tokens.colors.textSecondary} />
          <Text style={styles.emptyTitle}>No tracks added yet</Text>
          <Text style={styles.emptyCopy}>
            Upload the first track to this release before publishing.
          </Text>
          <AnimatedPressable
            style={styles.emptyCta}
            onPress={() => router.push(`/create/upload-push?albumId=${album.id}` as never)}
            haptic="selection"
          >
            <Ionicons name="add" size={16} color={tokens.colors.accent} />
            <Text style={styles.emptyCtaText}>Add Track</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

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
  addButton: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 12,
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
  },
  rowHighlighted: {
    backgroundColor: "rgba(0, 179, 166, 0.08)",
    borderBottomColor: "rgba(0, 179, 166, 0.18)",
  },
  rowPending: {
    backgroundColor: "rgba(0, 179, 166, 0.06)",
    borderBottomColor: "rgba(0, 179, 166, 0.12)",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  index: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    width: 18,
  },
  trackCopy: {
    gap: 3,
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
  statusDot_ready: {
    backgroundColor: tokens.colors.success,
  },
  statusDot_working: {
    backgroundColor: tokens.colors.accent,
  },
  statusDot_failed: {
    backgroundColor: tokens.colors.danger,
  },
  statusDot_draft: {
    backgroundColor: tokens.colors.textMuted,
  },
  trackStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  trackStatus_ready: {
    color: tokens.colors.success,
  },
  trackStatus_working: {
    color: tokens.colors.accent,
  },
  trackStatus_failed: {
    color: tokens.colors.danger,
  },
  trackStatus_draft: {
    color: tokens.colors.textSecondary,
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
  emptyCta: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  emptyCtaText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
