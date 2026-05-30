import { useCallback, useEffect } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import type { PublicTrackSummary } from "@/contracts/micboxx";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { usePlayerControls } from "@/features/player/hooks/usePlayerControls";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { mapTrackListToPlayerItems } from "@/features/player/mapper/playerItemMapper";

export function useDiscoverPlayer() {
  const { currentItem, playbackState, progressPercent } = useNowPlaying();
  const { play, pause } = usePlayerControls();
  const { startPlayback } = usePlayerQueue();

  const playing = playbackState === "playing";
  const activeId = currentItem ? Number(currentItem.id) : null;

  /* Animated progress value for the ring on TrackRow PlayButton */
  const progressValue = useSharedValue(0);

  /* Keep the shared value in sync with global progress */
  useEffect(() => {
    if (activeId !== null) {
      progressValue.value = withTiming(progressPercent, {
        duration: 240,
        easing: Easing.linear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressValue is a stable Reanimated SharedValue ref
  }, [activeId, progressPercent]);

  const handleAction = useCallback(
    (track: PublicTrackSummary, allTracks?: PublicTrackSummary[]) => {
      /* Already-active track: toggle play/pause */
      if (Number(currentItem?.id) === track.id) {
        if (playing) {
          pause();
        } else {
          play();
        }
        return;
      }

      /* Build PlayerItem list and start global playback */
      const tracksToMap = allTracks ?? [track];
      const items = mapTrackListToPlayerItems(tracksToMap);
      const startIndex = tracksToMap.findIndex((t) => t.id === track.id);

      startPlayback({
        items,
        startIndex: startIndex >= 0 ? startIndex : 0,
        context: { type: "recommendation" },
        autoplay: true,
      });
    },
    [currentItem?.id, playing, play, pause, startPlayback],
  );

  return { activeId, playing, progressValue, handleAction };
}
