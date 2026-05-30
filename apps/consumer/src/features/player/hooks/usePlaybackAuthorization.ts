import type { PlayerItem } from "@/features/player/types/player";
import { resolvePlaybackAuthorization } from "@/features/player/mapper/playbackSourceResolver";

export function usePlaybackAuthorization(item: Omit<PlayerItem, "authorization">) {
  const authorization = resolvePlaybackAuthorization(item);
  let message: string | null = null;

  if (!authorization.allowed) {
    switch (authorization.reason) {
      case "requires_subscription":
        message = "Requires a MicBoxx subscription.";
        break;
      case "requires_purchase":
        message = "Requires purchase before full playback.";
        break;
      default:
        message = "Playback is unavailable for this track.";
        break;
    }
  }

  return {
    authorization,
    message,
  };
}
