import type {
  PlaybackPositionState,
  PlayerItem,
} from "@/features/player/types/player";

export interface EngineSetupOptions {
  appName: string;
  iosCategory?: string;
  androidChannelId?: string;
}

export interface EngineTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
}

export type EnginePlaybackState =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export interface EngineNowPlaying {
  trackId: string | null;
  state: EnginePlaybackState;
  position: PlaybackPositionState;
  error?: string | null;
}

export type MicBoxxPlayerEvent =
  | { type: "playback-state-changed"; state: EnginePlaybackState }
  | { type: "active-track-changed"; trackId: string | null }
  | { type: "position-changed"; position: PlaybackPositionState }
  | { type: "remote-play" }
  | { type: "remote-pause" }
  | { type: "remote-next" }
  | { type: "remote-previous" }
  | { type: "remote-seek"; positionSec: number }
  | { type: "interruption-began" }
  | { type: "interruption-ended"; shouldResume: boolean }
  | { type: "audio-becoming-noisy" }
  | { type: "playback-error"; message: string };

export interface PlayerEngineAdapter {
  setup(options: EngineSetupOptions): Promise<void>;
  reset(): Promise<void>;
  destroy?(): Promise<void>;
  loadQueue(
    tracks: EngineTrack[],
    startIndex: number,
    startPositionSec?: number,
  ): Promise<void>;
  addToQueue(tracks: EngineTrack[]): Promise<void>;
  skipTo(index: number): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seekTo(positionSec: number): Promise<void>;
  skipNext(): Promise<void>;
  skipPrevious(): Promise<void>;
  getNowPlaying(): Promise<EngineNowPlaying>;
  getActiveTrackId(): Promise<string | null>;
  getPosition(): Promise<PlaybackPositionState>;
  setRepeatMode(mode: "off" | "queue" | "track"): Promise<void>;
  setMetadata(item: PlayerItem): Promise<void>;
  subscribe(listener: (event: MicBoxxPlayerEvent) => void): () => void;
}
