import { useEffect, useRef } from 'react';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PublicTrackSummary } from '@micboxx/contracts';
import { usePlaybackController } from '@/features/player/hooks/usePlaybackController';

export function useDiscoverPlayer() {
  const playback = usePlaybackController();

  const activeId = playback.currentItem ? Number(playback.currentItem.id) : null;

  const progressValue = useSharedValue(0);
  const previousActiveIdRef = useRef<number | null>(null);

  useEffect(() => {
    const activeTrackChanged = previousActiveIdRef.current !== activeId;

    previousActiveIdRef.current = activeId;

    /*
     * Never carry an existing track's progress or animation into
     * a newly selected track.
     */
    if (activeTrackChanged || activeId === null) {
      cancelAnimation(progressValue);
      progressValue.value = 0;
      return;
    }

    const nextProgress = Math.min(1, Math.max(0, playback.progressPercent));

    progressValue.value = withTiming(nextProgress, {
      duration: 120,
      easing: Easing.linear,
    });
  }, [activeId, playback.progressPercent, progressValue]);

  const handleAction = (track: PublicTrackSummary, allTracks?: PublicTrackSummary[]) => {
    void playback.playOrToggleTrack(track, { type: 'recommendation' }, allTracks);
  };

  return {
    activeId,
    playing: playback.isPlaying,
    progressValue,
    handleAction,
  };
}
