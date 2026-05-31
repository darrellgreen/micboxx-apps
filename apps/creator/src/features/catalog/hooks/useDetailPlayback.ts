import { useCallback, useMemo } from "react";

import type { PublicTrack, PublicTrackSummary } from "@micboxx/contracts";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { mapTrackListToPlayerItems } from "@/features/player/mapper/playerItemMapper";
import type { QueueContext } from "@micboxx/contracts";

type MappableTrack = PublicTrack | PublicTrackSummary;
type PlaybackAccessOptions = Parameters<typeof mapTrackListToPlayerItems>[1];

export function useDetailPlayback(
  tracks: MappableTrack[],
  context: QueueContext,
  authorizationOptions?: PlaybackAccessOptions,
) {
  const { currentItem, playbackState } = useNowPlaying();
  const { play, pause } = usePlayerControls();
  const { enqueue, startPlayback } = usePlayerQueue();

  const queueItems = useMemo(
    () => mapTrackListToPlayerItems(tracks, authorizationOptions),
    [authorizationOptions, tracks],
  );
  const activeTrackId = currentItem ? Number(currentItem.id) : null;
  const isPlaying =
    playbackState === "playing" || playbackState === "buffering";

  const playFromTrack = useCallback(
    async (track: MappableTrack) => {
      if (currentItem?.id === String(track.id)) {
        if (isPlaying) {
          await pause();
        } else {
          await play();
        }
        return;
      }

      const startIndex = tracks.findIndex((item) => item.id === track.id);
      await startPlayback({
        items: queueItems,
        startIndex: startIndex >= 0 ? startIndex : 0,
        context,
        autoplay: true,
      });
    },
    [
      context,
      currentItem?.id,
      isPlaying,
      pause,
      play,
      queueItems,
      startPlayback,
      tracks,
    ],
  );

  const playAll = useCallback(async () => {
    const firstTrack = tracks[0];
    if (!firstTrack) {
      return;
    }

    await playFromTrack(firstTrack);
  }, [playFromTrack, tracks]);

  const shuffleAll = useCallback(async () => {
    if (!tracks.length) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * tracks.length);
    await startPlayback({
      items: queueItems,
      startIndex: randomIndex,
      context,
      autoplay: true,
    });
  }, [context, queueItems, startPlayback, tracks.length]);

  const enqueueAll = useCallback(async () => {
    if (!queueItems.length) {
      return;
    }

    await enqueue(queueItems);
  }, [enqueue, queueItems]);

  return {
    activeTrackId,
    isPlaying,
    playFromTrack,
    playAll,
    shuffleAll,
    enqueueAll,
  };
}
