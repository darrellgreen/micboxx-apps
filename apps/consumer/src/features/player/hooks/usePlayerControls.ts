import { usePlayerContext } from "@/features/player/provider";

export function usePlayerControls() {
  const { actions } = usePlayerContext();
  return {
    play: actions.play,
    pause: actions.pause,
    seekTo: actions.seekTo,
    skipNext: actions.skipNext,
    skipPrevious: actions.skipPrevious,
    skipToIndex: actions.skipToIndex,
    setRepeatMode: actions.setRepeatMode,
  };
}
