import { MICBOXX_PROGRESS_INTERVAL_SEC } from "@/features/player/constants/capabilities";
import type { EngineSetupOptions } from "@micboxx/contracts";
import { requireTrackPlayerBundle } from "@/features/player/engine/trackPlayer/runtime";

let setupPromise: Promise<void> | null = null;

export async function setupTrackPlayer(
  _options?: EngineSetupOptions,
): Promise<void> {
  if (setupPromise) {
    return setupPromise;
  }

  setupPromise = (async () => {
    const bundle = requireTrackPlayerBundle();
    const {
      default: TrackPlayer,
      AndroidAudioContentType,
      Capability,
      IOSCategory,
      AppKilledPlaybackBehavior,
    } = bundle;

    try {
      await TrackPlayer.setupPlayer({
        iosCategory: IOSCategory.Playback,
        androidAudioContentType: AndroidAudioContentType.Music,
        autoHandleInterruptions: false,
        autoUpdateMetadata: true,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("player_already_initialized")
      ) {
        return;
      }
      throw error;
    }

    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: MICBOXX_PROGRESS_INTERVAL_SEC,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.ContinuePlayback,
        alwaysPauseOnInterruption: true,
      },
    });
  })();

  return setupPromise;
}
