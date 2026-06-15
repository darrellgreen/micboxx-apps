import { useCallback, useMemo } from "react";

import type { PublicTrack, PublicTrackSummary } from "@micboxx/contracts";
import { usePlaybackController } from "@/features/player/hooks/usePlaybackController";
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
  const playback = usePlaybackController();
  const { enqueue, startPlayback } = usePlayerQueue();

  const queueItems = useMemo(
    () => mapTrackListToPlayerItems(tracks, authorizationOptions),
    [authorizationOptions, tracks],
  );
  const activeTrackId = playback.currentItem
    ? Number(playback.currentItem.id)
    : null;

  const playFromTrack = useCallback(
    async (track: MappableTrack) => {
      await playback.playOrToggleTrack(track, context, tracks);
    },
    [context, playback, tracks],
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
    isPlaying: playback.isPlaying,
    playFromTrack,
    playAll,
    shuffleAll,
    enqueueAll,
  };
}
