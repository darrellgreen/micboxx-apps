import { selectProgressPercent } from "@/features/player/selectors";
import { useAppSelector } from "@/store/hooks";

export function useNowPlaying() {
  const state = useAppSelector((rootState) => rootState.player);
  const currentItem = state.nowPlaying.currentItem;
  const durationSec = state.nowPlaying.position.durationSec;
  const positionSec = state.nowPlaying.position.positionSec;
  const progressPercent = selectProgressPercent(state);

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
