import type {
  PlayerItem,
  QueueContext,
} from "@/features/player/types/player";

export interface StartPlaybackPayload {
  items: PlayerItem[];
  startIndex: number;
  context: QueueContext | null;
  startPositionSec?: number;
  autoplay?: boolean;
}

export type ReplaceQueuePayload = StartPlaybackPayload;

export interface PlayerActionResult {
  ok: boolean;
  error?: string;
}
