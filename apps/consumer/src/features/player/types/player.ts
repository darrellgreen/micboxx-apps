export type PlaybackSourceKind = "full" | "demo" | "locked" | "unavailable";

export type QueueContextType =
  | "track"
  | "album"
  | "artist"
  | "playlist"
  | "recommendation"
  | "search";

export interface PlaybackAuthorization {
  allowed: boolean;
  sourceKind: PlaybackSourceKind;
  url: string | null;
  reason?:
    | "requires_subscription"
    | "requires_purchase"
    | "not_available"
    | "geo_blocked"
    | "unknown";
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
  repeatMode: "off" | "queue" | "track";
}

export interface PlaybackPositionState {
  positionSec: number;
  durationSec: number;
  bufferedSec: number;
}

export interface NowPlayingState {
  currentItem: PlayerItem | null;
  playbackState:
    | "idle"
    | "loading"
    | "ready"
    | "playing"
    | "paused"
    | "buffering"
    | "ended"
    | "error";
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
