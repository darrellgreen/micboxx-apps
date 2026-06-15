import { useEffect } from "react";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";

import type { PublicTrackSummary } from "@micboxx/contracts";
import { usePlaybackController } from "@/features/player/hooks/usePlaybackController";

export function useDiscoverPlayer() {
  const playback = usePlaybackController();

  const activeId = playback.currentItem
    ? Number(playback.currentItem.id)
    : null;

  /* Animated progress value for the ring on TrackRow PlayButton */
  const progressValue = useSharedValue(0);

  /* Keep the shared value in sync with global progress */
  useEffect(() => {
    if (activeId !== null) {
      progressValue.value = withTiming(playback.progressPercent, {
        duration: 240,
        easing: Easing.linear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressValue is a stable Reanimated SharedValue ref
  }, [activeId, playback.progressPercent]);

  const handleAction = (
    track: PublicTrackSummary,
    allTracks?: PublicTrackSummary[],
  ) => {
    void playback.playOrToggleTrack(
      track,
      { type: "recommendation" },
      allTracks,
    );
  };

  return { activeId, playing: playback.isPlaying, progressValue, handleAction };
}
