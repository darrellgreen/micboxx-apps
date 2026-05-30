import type { MicBoxxPlayerEvent } from "@/features/player/engine/types";

export function subscribeToTrackPlayerEvents(
  _listener: (event: MicBoxxPlayerEvent) => void,
): () => void {
  return () => {};
}
