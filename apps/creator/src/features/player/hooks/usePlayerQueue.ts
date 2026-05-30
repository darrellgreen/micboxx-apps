import { usePlayerContext } from "@/features/player/provider";
import { useAppSelector } from "@/store/hooks";

export function usePlayerQueue() {
  const { actions } = usePlayerContext();
  const queue = useAppSelector((rootState) => rootState.player.queue);
  return {
    items: queue.items,
    currentIndex: queue.currentIndex,
    context: queue.context,
    enqueue: actions.enqueue,
    clearQueue: actions.clearQueue,
    replaceQueue: actions.replaceQueue,
    startPlayback: actions.startPlayback,
  };
}
