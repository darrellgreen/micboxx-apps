import { toNowPlayingMetadata } from "@/features/player/engine/trackPlayer/metadata";
import { requireTrackPlayerBundle } from "@/features/player/engine/trackPlayer/runtime";
import type {
  EngineNowPlaying,
  EngineTrack,

  PlaybackPositionState,
  PlayerItem} from "@micboxx/contracts";

function mapEngineState(state: string): EngineNowPlaying["state"] {
  switch (state) {
    case "loading":
      return "loading";
    case "ready":
      return "ready";
    case "playing":
      return "playing";
    case "paused":
      return "paused";
    case "buffering":
      return "buffering";
    case "ended":
      return "ended";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

export async function loadEngineQueue(
  tracks: EngineTrack[],
  startIndex: number,
  startPositionSec?: number,
): Promise<void> {
  const { default: TrackPlayer } = requireTrackPlayerBundle();
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);
  await TrackPlayer.skip(startIndex, startPositionSec ?? 0);
}

export async function addEngineQueueItems(
  tracks: EngineTrack[],
): Promise<void> {
  if (!tracks.length) {
    return;
  }

  const { default: TrackPlayer } = requireTrackPlayerBundle();
  await TrackPlayer.add(tracks);
}

export async function readEnginePosition(): Promise<PlaybackPositionState> {
  const { default: TrackPlayer } = requireTrackPlayerBundle();
  const progress = await TrackPlayer.getProgress();
  return {
    positionSec: progress.position,
    durationSec: progress.duration,
    bufferedSec: progress.buffered,
  };
}

export async function readEngineNowPlaying(): Promise<EngineNowPlaying> {
  const bundle = requireTrackPlayerBundle();
  const { default: TrackPlayer, State } = bundle;
  const [activeTrack, playbackState, progress] = await Promise.all([
    TrackPlayer.getActiveTrack(),
    TrackPlayer.getPlaybackState(),
    TrackPlayer.getProgress(),
  ]);

  return {
    trackId: activeTrack ? String(activeTrack.id) : null,
    state: mapEngineState(
      playbackState.state === State.Loading
        ? "loading"
        : playbackState.state === State.Ready
          ? "ready"
          : playbackState.state === State.Playing
            ? "playing"
            : playbackState.state === State.Paused
              ? "paused"
              : playbackState.state === State.Buffering
                ? "buffering"
                : playbackState.state === State.Ended
                  ? "ended"
                  : playbackState.state === State.Error
                    ? "error"
                    : "idle",
    ),
    position: {
      positionSec: progress.position,
      durationSec: progress.duration,
      bufferedSec: progress.buffered,
    },
  };
}

export async function setEngineMetadata(item: PlayerItem): Promise<void> {
  const { default: TrackPlayer } = requireTrackPlayerBundle();
  await TrackPlayer.updateNowPlayingMetadata(toNowPlayingMetadata(item));
}

export async function setEngineRepeatMode(
  mode: "off" | "queue" | "track",
): Promise<void> {
  const bundle = requireTrackPlayerBundle();
  const { default: TrackPlayer, RepeatMode } = bundle;
  if (mode === "track") {
    await TrackPlayer.setRepeatMode(RepeatMode.Track);
    return;
  }

  if (mode === "queue") {
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    return;
  }

  await TrackPlayer.setRepeatMode(RepeatMode.Off);
}

export async function getEngineActiveTrackId(): Promise<string | null> {
  const { default: TrackPlayer } = requireTrackPlayerBundle();
  const activeTrack = await TrackPlayer.getActiveTrack();
  return activeTrack ? String(activeTrack.id) : null;
}

export const playbackService = async () => {
  return;
};
