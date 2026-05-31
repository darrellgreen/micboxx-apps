import type { EmitterSubscription } from "react-native";
import type {
  PlaybackActiveTrackChangedEvent,
  PlaybackErrorEvent,
  PlaybackProgressUpdatedEvent,
  RemoteDuckEvent,
  RemoteSeekEvent,
} from "react-native-track-player";

import type {
  EnginePlaybackState,
  MicBoxxPlayerEvent,
} from "@micboxx/contracts";
import { requireTrackPlayerBundle } from "@/features/player/engine/trackPlayer/runtime";

function mapPlaybackState(state: string): EnginePlaybackState {
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

export function subscribeToTrackPlayerEvents(
  listener: (event: MicBoxxPlayerEvent) => void,
): () => void {
  const bundle = requireTrackPlayerBundle();
  const { default: TrackPlayer, Event, State } = bundle;
  const subscriptions: EmitterSubscription[] = [
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      listener({
        type: "playback-state-changed",
        state: mapPlaybackState(
          event.state === State.Loading
            ? "loading"
            : event.state === State.Ready
              ? "ready"
              : event.state === State.Playing
                ? "playing"
                : event.state === State.Paused
                  ? "paused"
                  : event.state === State.Buffering
                    ? "buffering"
                    : event.state === State.Ended
                      ? "ended"
                      : event.state === State.Error
                        ? "error"
                        : "idle",
        ),
      });
    }),
    TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (event: PlaybackActiveTrackChangedEvent) => {
      listener({
        type: "active-track-changed",
        trackId: event.track ? String(event.track.id) : null,
      });
      },
    ),
    TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (event: PlaybackProgressUpdatedEvent) => {
      listener({
        type: "position-changed",
        position: {
          positionSec: event.position,
          durationSec: event.duration,
          bufferedSec: event.buffered,
        },
      });
      },
    ),
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      listener({ type: "remote-play" });
    }),
    TrackPlayer.addEventListener(Event.RemotePause, () => {
      listener({ type: "remote-pause" });
      listener({ type: "audio-becoming-noisy" });
    }),
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      listener({ type: "remote-next" });
    }),
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      listener({ type: "remote-previous" });
    }),
    TrackPlayer.addEventListener(Event.RemoteSeek, (event: RemoteSeekEvent) => {
      listener({ type: "remote-seek", positionSec: event.position });
    }),
    TrackPlayer.addEventListener(Event.RemoteDuck, (event: RemoteDuckEvent) => {
      if (event.paused) {
        listener({ type: "interruption-began" });
        return;
      }

      listener({
        type: "interruption-ended",
        shouldResume: !event.permanent,
      });
    }),
    TrackPlayer.addEventListener(Event.PlaybackError, (event: PlaybackErrorEvent) => {
      listener({
        type: "playback-error",
        message: event.message,
      });
    }),
  ];

  return () => {
    subscriptions.forEach((subscription) => subscription.remove());
  };
}
