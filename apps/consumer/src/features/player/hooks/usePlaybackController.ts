import { useCallback } from 'react';

import type {
  PublicTrack,
  PublicTrackSummary,
  QueueContext,
  PlayerActionResult,
} from '@micboxx/contracts';
import { useNowPlaying } from './useNowPlaying';
import { usePlayerControls } from './usePlayerControls';
import { usePlayerQueue } from './usePlayerQueue';
import { mapTrackListToPlayerItems } from '../mapper/playerItemMapper';

type MappableTrack = PublicTrack | PublicTrackSummary;

interface PlayOrToggleOptions {
  /** What to do if the requested track is already active. Default: "toggle" */
  ifCurrent?: 'toggle' | 'noop';
}

/**
 * App-facing playback controller.
 *
 * This hook composes the lower-level player hooks (`usePlayerControls`,
 * `usePlayerQueue`, `useNowPlaying`) into high-level intent methods that
 * UI components call.  It does **not** own the audio engine, queue state,
 * persistence, or analytics — those remain in `PlayerProvider`.
 *
 * Hierarchy:
 *   UI components  →  usePlaybackController()  →  player hooks  →  PlayerProvider  →  native engine
 */
export function usePlaybackController() {
  const { currentItem, playbackState, playbackIntent, position, progressPercent } = useNowPlaying();
  const { play, pause, seekTo, skipNext, skipPrevious, setRepeatMode } = usePlayerControls();
  const { startPlayback, clearQueue } = usePlayerQueue();

  const isPlaying =
    playbackState === 'playing' ||
    playbackState === 'buffering' ||
    ((playbackState === 'loading' || playbackState === 'ready') && playbackIntent === 'play');

  /* ── Intent: toggle play / pause ────────────────────────────────────────── */

  const togglePlayPause = useCallback(async (): Promise<PlayerActionResult> => {
    return isPlaying ? await pause() : await play();
  }, [isPlaying, play, pause]);

  /* ── Intent: play a catalog track (or toggle if already active) ─────────── */

  /**
   * Play a track, or toggle play/pause if the same track is already active.
   *
   * Callers provide catalog track objects (`PublicTrack | PublicTrackSummary`).
   * The controller handles mapping them to `PlayerItem[]` and starting the
   * queue through the provider's `startPlayback`.
   *
   * @param track      - The track the user tapped.
   * @param context    - Queue context (e.g. `{ type: "track", slug }` or `{ type: "album" }`).
   * @param allTracks  - The full list surrounding `track`. If omitted a single-item queue is created.
   * @param options    - `{ ifCurrent: "toggle" | "noop" }` — what happens when the requested track is already active.
   */
  const playOrToggleTrack = useCallback(
    async (
      track: MappableTrack,
      context: QueueContext,
      allTracks?: MappableTrack[],
      options?: PlayOrToggleOptions,
    ): Promise<PlayerActionResult> => {
      const ifCurrent = options?.ifCurrent ?? 'toggle';

      // Same track is already active
      if (currentItem && currentItem.id === String(track.id)) {
        if (ifCurrent === 'toggle') {
          return await togglePlayPause();
        }
        return { ok: true }; // noop
      }

      // New track — build queue and start playback
      const tracksToMap = allTracks && allTracks.length > 0 ? allTracks : [track];
      const items = mapTrackListToPlayerItems(tracksToMap);
      const startIndex = tracksToMap.findIndex((t) => t.id === track.id);

      return await startPlayback({
        items,
        startIndex: startIndex >= 0 ? startIndex : 0,
        context,
        autoplay: true,
      });
    },
    [currentItem, startPlayback, togglePlayPause],
  );

  /* ── Intent: end the current playback session ──────────────────────────── */

  /**
   * End the current playback session entirely.
   *
   * Stops audio (`trackPlayerAdapter.reset()`), clears the persisted queue
   * and session, and resets Redux state.  Used exclusively for intentional
   * user dismissal — e.g. swiping away the mini player.
   *
   * This must **never** be called on sheet collapse.
   */
  const dismissSession = useCallback(async (): Promise<PlayerActionResult> => {
    return await clearQueue();
  }, [clearQueue]);

  /* ── Public surface ────────────────────────────────────────────────────── */

  return {
    // Read-only state
    currentItem,
    playbackState,
    isPlaying,
    position,
    progressPercent,

    // Intent methods
    togglePlayPause,
    playOrToggleTrack,
    dismissSession,
    seekTo,
    skipNext,
    skipPrevious,
    setRepeatMode,
  };
}
