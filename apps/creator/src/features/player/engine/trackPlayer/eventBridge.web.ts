import type { MicBoxxPlayerEvent } from "@micboxx/contracts";

export function subscribeToTrackPlayerEvents(
  _listener: (event: MicBoxxPlayerEvent) => void,
): () => void {
  return () => {};
}
