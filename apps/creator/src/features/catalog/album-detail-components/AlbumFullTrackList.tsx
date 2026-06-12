import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

import type { DashboardAlbum, DashboardAlbumTrack, DashboardTrack } from "@/contracts/creator";
import { DraggableTrackList } from "@/components/DraggableTrackList";
import { getTrackStatus, reorderAlbumTracks } from "@/shared/api/creator-dashboard";
import { useToast } from "@micboxx/ui";

interface AlbumFullTrackListProps {
  album: DashboardAlbum;
  highlightTrackId?: string;
  pendingTrackTitle?: string;
  /** Called after a successful reorder so the parent can refresh album state. */
  onAlbumUpdate?: (album: DashboardAlbum) => void;
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
    rightsAttested: track.rightsAttested ?? false,
    publicHref: track.publicHref,
  };
}

export function AlbumFullTrackList({
  album,
  highlightTrackId,
  pendingTrackTitle,
  onAlbumUpdate,
}: AlbumFullTrackListProps) {
  const [tracks, setTracks] = useState(album.tracks);
  const { showToast } = useToast();

  const isDraft = album.status.releaseState === "draft";

  useEffect(() => {
    setTracks(album.tracks);
  }, [album.tracks]);

  // ---------- Processing poll ----------
  const refreshProcessingRows = useCallback(async () => {
    const processingTracks = tracks.filter(isTrackProcessing);
    if (processingTracks.length === 0) return;

    const settledRows = await Promise.allSettled(
      processingTracks.map(async (track) =>
        mapTrackToAlbumRow(await getTrackStatus(track.trackId)),
      ),
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

  // ---------- Reorder handler ----------
  const handleReorder = useCallback(
    async (reorderedTracks: DashboardAlbumTrack[]) => {
      // Optimistically set local state.
      setTracks(reorderedTracks);

      const payload = reorderedTracks.map((t, idx) => ({
        trackId: t.trackId,
        position: idx + 1,
      }));

      try {
        const updatedAlbum = await reorderAlbumTracks(album.id, payload);
        setTracks(updatedAlbum.tracks);
        onAlbumUpdate?.(updatedAlbum);
      } catch (err) {
        showToast({
          tone: "error",
          title: "Reorder Failed",
          message:
            err instanceof Error
              ? err.message
              : "Failed to save track order.",
        });
        // Rollback to album's canonical order.
        setTracks(album.tracks);
      }
    },
    [album.id, album.tracks, onAlbumUpdate, showToast],
  );

  // ---------- Navigation ----------
  const handleTrackPress = useCallback((trackId: number) => {
    router.push(`/catalog/tracks/${trackId}` as never);
  }, []);

  return (
    <DraggableTrackList
      tracks={tracks}
      reorderEnabled={isDraft}
      onTrackPress={handleTrackPress}
      onReorder={handleReorder}
      highlightTrackId={highlightTrackId}
      pendingTrackTitle={pendingTrackTitle}
    />
  );
}
