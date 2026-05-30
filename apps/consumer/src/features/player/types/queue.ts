import type {
  PlayerItem,
  PlayerQueueState,
  QueueContext,
} from "@/features/player/types/player";

export interface QueueEntrySnapshot {
  items: PlayerItem[];
  currentIndex: number;
  context: QueueContext | null;
  shuffled: boolean;
  repeatMode: PlayerQueueState["repeatMode"];
}
