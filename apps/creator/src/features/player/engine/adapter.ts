import { expoAudioAdapter } from "@/features/player/engine/expoAudio/adapter";
import { subscribeToTrackPlayerEvents } from "@/features/player/engine/trackPlayer/eventBridge";
import {
  requireTrackPlayerBundle,
  tryGetTrackPlayerBundle,
} from "@/features/player/engine/trackPlayer/runtime";
import {
  addEngineQueueItems,
  getEngineActiveTrackId,
  loadEngineQueue,
  readEngineNowPlaying,
  readEnginePosition,
  setEngineMetadata,
  setEngineRepeatMode,
} from "@/features/player/engine/trackPlayer/service";
import { setupTrackPlayer } from "@/features/player/engine/trackPlayer/setup";
import type { PlayerEngineAdapter } from "@/features/player/engine/types";

const nativeTrackPlayerAdapter: PlayerEngineAdapter = {
  async setup(options) {
    await setupTrackPlayer(options);
  },
  async reset() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.reset();
  },
  async loadQueue(tracks, startIndex, startPositionSec) {
    await loadEngineQueue(tracks, startIndex, startPositionSec);
  },
  async addToQueue(tracks) {
    await addEngineQueueItems(tracks);
  },
  async skipTo(index) {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.skip(index);
  },
  async play() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.play();
  },
  async pause() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.pause();
  },
  async stop() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.stop();
  },
  async seekTo(positionSec) {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.seekTo(positionSec);
  },
  async skipNext() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.skipToNext();
  },
  async skipPrevious() {
    const { default: TrackPlayer } = requireTrackPlayerBundle();
    await TrackPlayer.skipToPrevious();
  },
  async getNowPlaying() {
    return readEngineNowPlaying();
  },
  async getActiveTrackId() {
    return getEngineActiveTrackId();
  },
  async getPosition() {
    return readEnginePosition();
  },
  async setRepeatMode(mode) {
    await setEngineRepeatMode(mode);
  },
  async setMetadata(item) {
    await setEngineMetadata(item);
  },
  subscribe(listener) {
    return subscribeToTrackPlayerEvents(listener);
  },
};

/**
 * Auto-select engine: use react-native-track-player in native builds,
 * fall back to expo-audio in Expo Go / environments without the native module.
 */
export const trackPlayerAdapter: PlayerEngineAdapter = tryGetTrackPlayerBundle()
  ? nativeTrackPlayerAdapter
  : expoAudioAdapter;
