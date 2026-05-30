import {
    createAudioPlayer,
    setAudioModeAsync,
    type AudioPlayer,
} from "expo-audio";

import type {
    EngineNowPlaying,
    EngineSetupOptions,
    EngineTrack,
    MicBoxxPlayerEvent,
    PlayerEngineAdapter,
} from "@/features/player/engine/types";
import type {
    PlaybackPositionState,
    PlayerItem,
} from "@/features/player/types/player";

/**
 * Expo-Audio–backed engine adapter for Expo Go / dev-client environments
 * where react-native-track-player is not available.
 */

let player: AudioPlayer | null = null;
let subscription: ReturnType<AudioPlayer["addListener"]> | null = null;
let queue: EngineTrack[] = [];
let currentIndex = 0;
let repeatMode: "off" | "queue" | "track" = "off";
let lastPosition: PlaybackPositionState = {
  positionSec: 0,
  durationSec: 0,
  bufferedSec: 0,
};
let listeners: Set<(event: MicBoxxPlayerEvent) => void> = new Set();
let isPlaying = false;

function emit(event: MicBoxxPlayerEvent) {
  for (const fn of listeners) {
    try {
      fn(event);
    } catch {}
  }
}

function destroyPlayer() {
  subscription?.remove();
  subscription = null;
  if (player) {
    try {
      player.pause();
    } catch {}
    try {
      player.remove();
    } catch {}
    player = null;
  }
  isPlaying = false;
}

function createAndBindPlayer(track: EngineTrack, startPositionSec?: number) {
  destroyPlayer();

  if (!track.url) {
    emit({ type: "playback-error", message: "No playback URL available." });
    return;
  }

  emit({ type: "playback-state-changed", state: "loading" });
  emit({ type: "active-track-changed", trackId: track.id });

  const p = createAudioPlayer({ uri: track.url }, { updateInterval: 500 });
  player = p;

  let hasStarted = false;
  let didSeekToStart = !startPositionSec;

  subscription = p.addListener("playbackStatusUpdate", (status) => {
    if (status.isLoaded && !hasStarted) {
      hasStarted = true;

      if (startPositionSec && !didSeekToStart) {
        didSeekToStart = true;
        p.seekTo(startPositionSec);
      }

      if (isPlaying) {
        // play() was called before the audio finished loading — re-apply
        p.play();
        emit({ type: "playback-state-changed", state: "playing" });
      } else {
        emit({ type: "playback-state-changed", state: "ready" });
      }
    }

    if (status.isLoaded && status.duration > 0) {
      lastPosition = {
        positionSec: status.currentTime,
        durationSec: status.duration,
        bufferedSec: status.duration, // expo-audio doesn't expose buffered
      };
      emit({ type: "position-changed", position: lastPosition });
    }

    if (
      status.isLoaded &&
      isPlaying &&
      status.playing === false &&
      !status.didJustFinish
    ) {
      // playback paused externally (interruption / audio focus loss)
    }

    if (status.didJustFinish) {
      isPlaying = false;

      if (repeatMode === "track") {
        // Repeat single track
        p.seekTo(0);
        p.play();
        isPlaying = true;
        return;
      }

      if (currentIndex < queue.length - 1) {
        // Auto-advance to next track
        currentIndex++;
        createAndBindPlayer(queue[currentIndex]!);
        player?.play();
        isPlaying = true;
        emit({ type: "playback-state-changed", state: "playing" });
        return;
      }

      if (repeatMode === "queue" && queue.length > 0) {
        // Loop back to start
        currentIndex = 0;
        createAndBindPlayer(queue[0]!);
        player?.play();
        isPlaying = true;
        emit({ type: "playback-state-changed", state: "playing" });
        return;
      }

      emit({ type: "playback-state-changed", state: "ended" });
    }
  });
}

export const expoAudioAdapter: PlayerEngineAdapter = {
  async setup(_options: EngineSetupOptions) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  },

  async reset() {
    destroyPlayer();
    queue = [];
    currentIndex = 0;
    lastPosition = { positionSec: 0, durationSec: 0, bufferedSec: 0 };
    emit({ type: "playback-state-changed", state: "idle" });
    emit({ type: "active-track-changed", trackId: null });
  },

  async destroy() {
    destroyPlayer();
    queue = [];
    listeners.clear();
  },

  async loadQueue(tracks, startIndex, startPositionSec) {
    queue = tracks;
    currentIndex = Math.min(startIndex, tracks.length - 1);
    const track = queue[currentIndex];
    if (track) {
      createAndBindPlayer(track, startPositionSec);
    }
  },

  async addToQueue(tracks) {
    queue = [...queue, ...tracks];
  },

  async skipTo(index) {
    if (index < 0 || index >= queue.length) return;
    currentIndex = index;
    const wasPlaying = isPlaying;
    createAndBindPlayer(queue[currentIndex]!);
    if (wasPlaying) {
      player?.play();
      isPlaying = true;
      emit({ type: "playback-state-changed", state: "playing" });
    }
  },

  async play() {
    if (!player && queue[currentIndex]) {
      createAndBindPlayer(queue[currentIndex]!);
    }
    player?.play();
    isPlaying = true;
    emit({ type: "playback-state-changed", state: "playing" });
  },

  async pause() {
    player?.pause();
    isPlaying = false;
    emit({ type: "playback-state-changed", state: "paused" });
  },

  async stop() {
    player?.pause();
    player?.seekTo(0);
    isPlaying = false;
    emit({ type: "playback-state-changed", state: "idle" });
  },

  async seekTo(positionSec) {
    player?.seekTo(positionSec);
  },

  async skipNext() {
    if (currentIndex < queue.length - 1) {
      await this.skipTo(currentIndex + 1);
    } else if (repeatMode === "queue" && queue.length > 0) {
      await this.skipTo(0);
    }
  },

  async skipPrevious() {
    if (lastPosition.positionSec > 3) {
      player?.seekTo(0);
      return;
    }
    if (currentIndex > 0) {
      await this.skipTo(currentIndex - 1);
    }
  },

  async getNowPlaying(): Promise<EngineNowPlaying> {
    return {
      trackId: queue[currentIndex]?.id ?? null,
      state: isPlaying ? "playing" : "paused",
      position: lastPosition,
    };
  },

  async getActiveTrackId() {
    return queue[currentIndex]?.id ?? null;
  },

  async getPosition() {
    return lastPosition;
  },

  async setRepeatMode(mode) {
    repeatMode = mode;
  },

  async setMetadata(_item: PlayerItem) {
    // expo-audio doesn't support lock-screen metadata in the same way
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
