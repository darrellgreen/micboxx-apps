import { tryGetTrackPlayerBundle } from "@/features/player/engine/trackPlayer/runtime";
import { playbackService } from "@/features/player/engine/trackPlayer/service";

let registered = false;

export function registerMicboxxPlaybackService(): void {
  if (registered) {
    return;
  }

  const bundle = tryGetTrackPlayerBundle();
  if (!bundle) {
    return;
  }

  bundle.default.registerPlaybackService(() => playbackService);
  registered = true;
}
