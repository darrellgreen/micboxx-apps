import { shouldUseLocalWebFixtures } from "@/config/env";
import { selectProgressPercent } from "@/features/player/selectors";
import { useAppSelector } from "@/store/hooks";

export function useNowPlaying() {
  const state = useAppSelector((rootState) => rootState.player);
  const currentItem = state.nowPlaying.currentItem;
  const fixtureDurationSec =
    shouldUseLocalWebFixtures() && currentItem?.durationSec
      ? currentItem.durationSec
      : null;
  const durationSec = fixtureDurationSec ?? state.nowPlaying.position.durationSec;
  const positionSec = fixtureDurationSec
    ? Math.min(state.nowPlaying.position.positionSec, fixtureDurationSec)
    : state.nowPlaying.position.positionSec;
  const progressPercent = fixtureDurationSec
    ? durationSec > 0
      ? Math.max(0, Math.min(1, positionSec / durationSec))
      : 0
    : selectProgressPercent(state);

  return {
    currentItem,
    playbackState: state.nowPlaying.playbackState,
    position: {
      ...state.nowPlaying.position,
      positionSec,
      durationSec,
    },
    progressPercent,
  };
}
