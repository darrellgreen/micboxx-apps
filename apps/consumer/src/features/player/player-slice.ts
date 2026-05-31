import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  emptyPlaybackPosition,
  emptyQueueState,
  initialPlayerProviderState,
} from "@/features/player/store";
import type {
  NowPlayingState,
  PlaybackPositionState,
  PlayerItem,
  PlayerQueueState,
} from "@micboxx/contracts";

export interface PlayerSliceState {
  initialized: boolean;
  restoring: boolean;
  queue: PlayerQueueState;
  nowPlaying: NowPlayingState;
}

const initialState: PlayerSliceState = initialPlayerProviderState;

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    setInitializing(state) {
      state.restoring = true;
    },
    setInitialized(state) {
      state.initialized = true;
    },
    setRestoring(state, action: PayloadAction<boolean>) {
      state.restoring = action.payload;
    },
    setQueue(state, action: PayloadAction<PlayerQueueState>) {
      state.queue = action.payload;
      state.nowPlaying.currentItem =
        action.payload.items[action.payload.currentIndex] ?? null;
    },
    setCurrentIndex(state, action: PayloadAction<number>) {
      state.queue.currentIndex = action.payload;
      state.nowPlaying.currentItem =
        state.queue.items[action.payload] ?? null;
    },
    setCurrentItem(state, action: PayloadAction<PlayerItem | null>) {
      state.nowPlaying.currentItem = action.payload;
    },
    setPlaybackState(
      state,
      action: PayloadAction<NowPlayingState["playbackState"]>,
    ) {
      state.nowPlaying.playbackState = action.payload;
    },
    setPosition(state, action: PayloadAction<PlaybackPositionState>) {
      state.nowPlaying.position = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.nowPlaying.error = action.payload;
      if (action.payload) {
        state.nowPlaying.playbackState = "error";
      }
    },
    resetPlayerState(state) {
      state.queue = emptyQueueState;
      state.nowPlaying.currentItem = null;
      state.nowPlaying.playbackState = "idle";
      state.nowPlaying.position = emptyPlaybackPosition;
      state.nowPlaying.error = null;
    },
  },
});

export const {
  resetPlayerState,
  setCurrentIndex,
  setCurrentItem,
  setError,
  setInitialized,
  setInitializing,
  setPlaybackState,
  setPosition,
  setQueue,
  setRestoring,
} = playerSlice.actions;

export const playerReducer = playerSlice.reducer;
