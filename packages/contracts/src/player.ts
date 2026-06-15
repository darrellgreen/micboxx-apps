export type PlaybackSourceKind = 'full' | 'demo' | 'locked' | 'unavailable';

export type QueueContextType =
  | 'track'
  | 'album'
  | 'artist'
  | 'playlist'
  | 'recommendation'
  | 'search';

export interface PlaybackAuthorization {
  allowed: boolean;
  sourceKind: PlaybackSourceKind;
  url: string | null;
  reason?:
    | 'requires_subscription'
    | 'requires_purchase'
    | 'not_available'
    | 'geo_blocked'
    | 'unknown';
  planKey?: string | null;
  requiredCapability?: string | null;
}

export interface PlayerItem {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistUsername?: string | null;
  albumTitle?: string | null;
  albumId?: string | null;
  artworkUrl?: string | null;
  waveformDarkUrl?: string | null;
  waveformLightUrl?: string | null;
  waveformFallbackUrl?: string | null;
  durationSec?: number | null;
  locked: boolean;
  isSubscriberOnly?: boolean;
  isPurchasable?: boolean;
  requiredCapability?: string | null;
  planKey?: string | null;
  fullAudioUrl?: string | null;
  demoAudioUrl?: string | null;
  authorization: PlaybackAuthorization;
}

export interface QueueContext {
  type: QueueContextType;
  id?: string | null;
  slug?: string | null;
  title?: string | null;
}

export interface PlayerQueueState {
  items: PlayerItem[];
  currentIndex: number;
  context: QueueContext | null;
  shuffled: boolean;
  repeatMode: 'off' | 'queue' | 'track';
}

export interface PlaybackPositionState {
  positionSec: number;
  durationSec: number;
  bufferedSec: number;
}

export type PlaybackIntent = 'play' | 'pause';

export interface NowPlayingState {
  currentItem: PlayerItem | null;
  playbackState:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'playing'
    | 'paused'
    | 'buffering'
    | 'ended'
    | 'error';
  /** Declared intent for the current load. Drives UI during the "loading" window
   *  so controls never flip to the opposite state while the engine initialises. */
  playbackIntent: PlaybackIntent;
  position: PlaybackPositionState;
  volume?: number;
  rate?: number;
  error?: string | null;
}

export interface PersistedPlaybackSession {
  queue: PlayerQueueState;
  lastKnownTrackId?: string | null;
  lastKnownPositionSec?: number;
  updatedAt: string;
}

export interface QueueEntrySnapshot {
  items: PlayerItem[];
  currentIndex: number;
  context: QueueContext | null;
  shuffled: boolean;
  repeatMode: PlayerQueueState['repeatMode'];
}

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
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export interface EngineNowPlaying {
  trackId: string | null;
  state: EnginePlaybackState;
  position: PlaybackPositionState;
  error?: string | null;
}

export type MicBoxxPlayerEvent =
  | { type: 'playback-state-changed'; state: EnginePlaybackState }
  | { type: 'active-track-changed'; trackId: string | null }
  | { type: 'position-changed'; position: PlaybackPositionState }
  | { type: 'remote-play' }
  | { type: 'remote-pause' }
  | { type: 'remote-next' }
  | { type: 'remote-previous' }
  | { type: 'remote-seek'; positionSec: number }
  | { type: 'interruption-began' }
  | { type: 'interruption-ended'; shouldResume: boolean }
  | { type: 'audio-becoming-noisy' }
  | { type: 'playback-error'; message: string };

export interface PlayerEngineAdapter {
  setup(options: EngineSetupOptions): Promise<void>;
  reset(): Promise<void>;
  destroy?(): Promise<void>;
  loadQueue(tracks: EngineTrack[], startIndex: number, startPositionSec?: number): Promise<void>;
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
  setRepeatMode(mode: 'off' | 'queue' | 'track'): Promise<void>;
  setMetadata(item: PlayerItem): Promise<void>;
  subscribe(listener: (event: MicBoxxPlayerEvent) => void): () => void;
}
