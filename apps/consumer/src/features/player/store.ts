import type {
  NowPlayingState,
  PlaybackPositionState,
  PlayerItem,
  PlayerQueueState,
} from "@/features/player/types/player";

export interface PlayerProviderState {
  initialized: boolean;
  restoring: boolean;
  queue: PlayerQueueState;
  nowPlaying: NowPlayingState;
}

export type PlayerAction =
  | { type: "initializing" }
  | { type: "initialized" }
  | { type: "set-restoring"; restoring: boolean }
  | { type: "set-queue"; queue: PlayerQueueState }
  | { type: "set-current-index"; currentIndex: number }
  | { type: "set-current-item"; item: PlayerItem | null }
  | { type: "set-playback-state"; playbackState: NowPlayingState["playbackState"] }
  | { type: "set-position"; position: PlaybackPositionState }
  | { type: "set-error"; error: string | null };

export const emptyPlaybackPosition: PlaybackPositionState = {
  positionSec: 0,
  durationSec: 0,
  bufferedSec: 0,
};

export const emptyQueueState: PlayerQueueState = {
  items: [],
  currentIndex: 0,
  context: null,
  shuffled: false,
  repeatMode: "off",
};

export const initialPlayerProviderState: PlayerProviderState = {
  initialized: false,
  restoring: false,
  queue: emptyQueueState,
  nowPlaying: {
    currentItem: null,
    playbackState: "idle",
    position: emptyPlaybackPosition,
    volume: 1,
    rate: 1,
    error: null,
  },
};

export function playerReducer(
  state: PlayerProviderState,
  action: PlayerAction,
): PlayerProviderState {
  switch (action.type) {
    case "initializing":
      return {
        ...state,
        restoring: true,
      };
    case "initialized":
      return {
        ...state,
        initialized: true,
      };
    case "set-restoring":
      return {
        ...state,
        restoring: action.restoring,
      };
    case "set-queue":
      return {
        ...state,
        queue: action.queue,
        nowPlaying: {
          ...state.nowPlaying,
          currentItem: action.queue.items[action.queue.currentIndex] ?? null,
        },
      };
    case "set-current-index":
      return {
        ...state,
        queue: {
          ...state.queue,
          currentIndex: action.currentIndex,
        },
        nowPlaying: {
          ...state.nowPlaying,
          currentItem: state.queue.items[action.currentIndex] ?? null,
        },
      };
    case "set-current-item":
      return {
        ...state,
        nowPlaying: {
          ...state.nowPlaying,
          currentItem: action.item,
        },
      };
    case "set-playback-state":
      return {
        ...state,
        nowPlaying: {
          ...state.nowPlaying,
          playbackState: action.playbackState,
        },
      };
    case "set-position":
      return {
        ...state,
        nowPlaying: {
          ...state.nowPlaying,
          position: action.position,
        },
      };
    case "set-error":
      return {
        ...state,
        nowPlaying: {
          ...state.nowPlaying,
          error: action.error,
          playbackState: action.error ? "error" : state.nowPlaying.playbackState,
        },
      };
    default:
      return state;
  }
}
