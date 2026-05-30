import { useAppSelector } from "@/store/hooks";

export function usePlayerState() {
  const state = useAppSelector((rootState) => rootState.player);
  return {
    initialized: state.initialized,
    restoring: state.restoring,
    queue: state.queue,
    nowPlaying: state.nowPlaying,
  };
}
