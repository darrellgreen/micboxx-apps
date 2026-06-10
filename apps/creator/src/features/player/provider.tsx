import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react";

import { noopPlayerAnalyticsSink } from "@/features/player/analytics"; // creator has no listener session; consumer wires the concrete sink
import { PLAYER_ANALYTICS_EVENTS } from "@micboxx/analytics";
import { noopDownloadPlaybackResolver } from "@/features/player/downloads";
import { trackPlayerAdapter } from "@/features/player/engine/adapter";
import type { EngineTrack , PlayerItem, PlayerQueueState ,
  PlayerActionResult,
  ReplaceQueuePayload,
  StartPlaybackPayload,
} from "@micboxx/contracts";
import {
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
} from "@/features/player/player-slice";
import {
  clearPersistedPlaybackSession,
  persistPlaybackSession,
  readPersistedPlaybackSession,
} from "@/features/player/storage/playbackSessionStorage";
import {
  clearPersistedQueue,
  persistQueueState,
  readPersistedQueue,
} from "@/features/player/storage/queueStorage";
import {
  emptyQueueState,
} from "@/features/player/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface PlayerProviderActions {
  initialize(): Promise<void>;
  restoreSession(): Promise<void>;
  startPlayback(payload: StartPlaybackPayload): Promise<PlayerActionResult>;
  replaceQueue(payload: ReplaceQueuePayload): Promise<PlayerActionResult>;
  play(): Promise<PlayerActionResult>;
  pause(): Promise<PlayerActionResult>;
  seekTo(positionSec: number): Promise<PlayerActionResult>;
  skipNext(): Promise<PlayerActionResult>;
  skipPrevious(): Promise<PlayerActionResult>;
  skipToIndex(index: number): Promise<PlayerActionResult>;
  setRepeatMode(mode: "off" | "queue" | "track"): Promise<PlayerActionResult>;
  enqueue(items: PlayerItem[]): Promise<PlayerActionResult>;
  clearQueue(): Promise<PlayerActionResult>;
}

interface PlayerProviderContextValue {
  actions: PlayerProviderActions;
}

const PlayerContext = createContext<PlayerProviderContextValue | null>(null);

function toEngineTrack(item: PlayerItem): EngineTrack {
  return {
    id: item.id,
    url: item.authorization.url ?? "",
    title: item.title,
    artist: item.artistName,
    album: item.albumTitle ?? undefined,
    artwork: item.artworkUrl ?? undefined,
    duration: item.durationSec ?? undefined,
  };
}

function getQueueIndexByTrackId(
  queue: PlayerQueueState,
  trackId: string | null,
): number {
  if (!trackId) {
    return -1;
  }

  return queue.items.findIndex((item) => item.id === trackId);
}

function usePlayerProviderValue(): PlayerProviderContextValue {
  const dispatch = useAppDispatch();
  const state = useAppSelector((rootState) => rootState.player);
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const wasPlayingBeforeInterruptionRef = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const emitAnalytics = useCallback(
    (
      event: keyof typeof PLAYER_ANALYTICS_EVENTS,
      payload: {
        trackId: string | null;
        sourceKind?: string | null;
        currentPositionSec?: number;
      },
    ) => {
      noopPlayerAnalyticsSink.emit(PLAYER_ANALYTICS_EVENTS[event], {
        trackId: payload.trackId,
        sourceKind: payload.sourceKind ?? null,
        currentPositionSec: payload.currentPositionSec,
        queueContextType: stateRef.current.queue.context?.type ?? null,
      });
    },
    [],
  );

  const syncMetadata = useCallback(async (item: PlayerItem | null) => {
    if (!item) {
      return;
    }

    await trackPlayerAdapter.setMetadata(item);
  }, []);

  const applyQueueState = useCallback((queue: PlayerQueueState) => {
    dispatch(setQueue(queue));
  }, [dispatch]);

  const clearQueue = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.reset();
      await clearPersistedQueue();
      await clearPersistedPlaybackSession();
      applyQueueState(emptyQueueState);
      dispatch(resetPlayerState());
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to clear queue.",
      };
    }
  }, [applyQueueState, dispatch]);

  const loadAuthorizedQueue = useCallback(
    async (payload: StartPlaybackPayload): Promise<PlayerActionResult> => {
      const requestedItem = payload.items[payload.startIndex] ?? null;
      if (!requestedItem) {
        return { ok: false, error: "No track was selected for playback." };
      }

      if (!requestedItem.authorization.allowed || !requestedItem.authorization.url) {
        emitAnalytics("playbackBlocked", {
          trackId: requestedItem.id,
          sourceKind: requestedItem.authorization.sourceKind,
        });
        return {
          ok: false,
          error: "This track is currently unavailable for playback.",
        };
      }

      const playableItems = payload.items.filter(
        (item) => item.authorization.allowed && item.authorization.url,
      );
      const nextStartIndex = playableItems.findIndex(
        (item) => item.id === requestedItem.id,
      );

      if (nextStartIndex < 0) {
        return {
          ok: false,
          error: "No playable tracks were found in the queue.",
        };
      }

      const queue: PlayerQueueState = {
        items: playableItems,
        currentIndex: nextStartIndex,
        context: payload.context,
        shuffled: false,
        repeatMode: stateRef.current.queue.repeatMode,
      };

      await trackPlayerAdapter.loadQueue(
        playableItems.map(toEngineTrack),
        nextStartIndex,
        payload.startPositionSec,
      );
      await trackPlayerAdapter.setRepeatMode(queue.repeatMode);
      applyQueueState(queue);
      await syncMetadata(playableItems[nextStartIndex] ?? null);

      if (payload.autoplay !== false) {
        await trackPlayerAdapter.play();
      } else {
        await trackPlayerAdapter.pause();
      }

      emitAnalytics("playbackSourceSelected", {
        trackId: playableItems[nextStartIndex]?.id ?? null,
        sourceKind: playableItems[nextStartIndex]?.authorization.sourceKind ?? null,
      });
      return { ok: true };
    },
    [applyQueueState, emitAnalytics, syncMetadata],
  );

  const restoreSession = useCallback(async (): Promise<void> => {
    dispatch(setRestoring(true));

    try {
      const [persistedQueue, persistedSession] = await Promise.all([
        readPersistedQueue(),
        readPersistedPlaybackSession(),
      ]);

      if (
        !persistedQueue ||
        !Array.isArray(persistedQueue.items) ||
        persistedQueue.items.length === 0
      ) {
        return;
      }

      const restoredItems = await Promise.all(
        persistedQueue.items.map(async (item): Promise<PlayerItem> => {
          const localCandidate =
            await noopDownloadPlaybackResolver.resolveLocalCandidate(item);
          if (!localCandidate.localFileUrl) {
            return item;
          }

          return {
            ...item,
            authorization: {
              ...item.authorization,
              allowed: true,
              sourceKind: "full",
              url: localCandidate.localFileUrl,
            },
          };
        }),
      );

      const requestedIndex = Math.min(
        persistedQueue.currentIndex,
        restoredItems.length - 1,
      );
      const requestedItem = restoredItems[requestedIndex] ?? null;
      const fallbackIndex = restoredItems.findIndex(
        (item) => item.authorization.allowed && item.authorization.url,
      );
      const startIndex =
        requestedItem?.authorization.allowed && requestedItem.authorization.url
          ? requestedIndex
          : fallbackIndex;

      if (startIndex < 0) {
        await clearQueue();
        return;
      }

      await loadAuthorizedQueue({
        items: restoredItems,
        startIndex,
        context: persistedQueue.context,
        startPositionSec:
          persistedSession?.lastKnownTrackId === restoredItems[startIndex]?.id
            ? persistedSession.lastKnownPositionSec
            : 0,
        autoplay: false,
      });
      dispatch(setPlaybackState("paused"));
    } finally {
      dispatch(setRestoring(false));
    }
  }, [clearQueue, dispatch, loadAuthorizedQueue]);

  const initialize = useCallback(async (): Promise<void> => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    dispatch(setInitializing());
    dispatch(setError(null));

    try {
      await trackPlayerAdapter.setup({
        appName: "MicBoxx",
        iosCategory: "playback",
        androidChannelId: "micboxx-playback",
      });

      unsubscribeRef.current = trackPlayerAdapter.subscribe((event) => {
        const currentState = stateRef.current;

        switch (event.type) {
          case "playback-state-changed":
            dispatch(setPlaybackState(event.state));
            if (event.state === "playing") {
              wasPlayingBeforeInterruptionRef.current = true;
              emitAnalytics("playbackStarted", {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind:
                  currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
            }
            if (event.state === "paused") {
              emitAnalytics("playbackPaused", {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind:
                  currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
            }
            if (event.state === "ended") {
              emitAnalytics("playbackCompleted", {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind:
                  currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
            }
            break;
          case "active-track-changed": {
            const nextIndex = getQueueIndexByTrackId(
              currentState.queue,
              event.trackId,
            );
            if (nextIndex >= 0) {
              dispatch(setCurrentIndex(nextIndex));
              void syncMetadata(currentState.queue.items[nextIndex] ?? null);
            } else {
              dispatch(setCurrentItem(null));
            }
            break;
          }
          case "position-changed":
            dispatch(setPosition(event.position));
            break;
          case "remote-play":
            void trackPlayerAdapter.play();
            break;
          case "remote-pause":
            void trackPlayerAdapter.pause();
            break;
          case "remote-next":
            void trackPlayerAdapter.skipNext();
            break;
          case "remote-previous":
            void trackPlayerAdapter.skipPrevious();
            break;
          case "remote-seek":
            void trackPlayerAdapter.seekTo(event.positionSec);
            break;
          case "interruption-began":
            wasPlayingBeforeInterruptionRef.current =
              currentState.nowPlaying.playbackState === "playing";
            void trackPlayerAdapter.pause();
            break;
          case "interruption-ended":
            if (event.shouldResume && wasPlayingBeforeInterruptionRef.current) {
              void trackPlayerAdapter.play();
            }
            break;
          case "audio-becoming-noisy":
            void trackPlayerAdapter.pause();
            break;
          case "playback-error":
            dispatch(setError(event.message));
            break;
        }
      });

      await restoreSession();
      dispatch(setInitialized());
    } catch (error) {
      dispatch(
        setError(
          error instanceof Error
            ? error.message
            : "Unable to initialize MicBoxx playback.",
        ),
      );
      initializedRef.current = false;
    } finally {
      dispatch(setRestoring(false));
    }
  }, [dispatch, emitAnalytics, restoreSession, syncMetadata]);

  useEffect(() => {
    void initialize();

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [initialize]);

  useEffect(() => {
    persistQueueState(state.queue);
  }, [state.queue]);

  useEffect(() => {
    persistPlaybackSession({
      queue: state.queue,
      lastKnownTrackId: state.nowPlaying.currentItem?.id ?? null,
      lastKnownPositionSec: state.nowPlaying.position.positionSec,
      updatedAt: new Date().toISOString(),
    });
  }, [
    state.queue,
    state.nowPlaying.currentItem?.id,
    state.nowPlaying.position.positionSec,
  ]);

  const play = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.play();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to play.",
      };
    }
  }, []);

  const pause = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.pause();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to pause.",
      };
    }
  }, []);

  const seekTo = useCallback(async (positionSec: number): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.seekTo(positionSec);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to seek.",
      };
    }
  }, []);

  const skipNext = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.skipNext();
      emitAnalytics("playbackSkipped", {
        trackId: stateRef.current.nowPlaying.currentItem?.id ?? null,
        sourceKind:
          stateRef.current.nowPlaying.currentItem?.authorization.sourceKind ?? null,
        currentPositionSec: stateRef.current.nowPlaying.position.positionSec,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to skip next.",
      };
    }
  }, [emitAnalytics]);

  const skipPrevious = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.skipPrevious();
      emitAnalytics("playbackSkipped", {
        trackId: stateRef.current.nowPlaying.currentItem?.id ?? null,
        sourceKind:
          stateRef.current.nowPlaying.currentItem?.authorization.sourceKind ?? null,
        currentPositionSec: stateRef.current.nowPlaying.position.positionSec,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to skip previous.",
      };
    }
  }, [emitAnalytics]);

  const skipToIndex = useCallback(async (index: number): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.skipTo(index);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to skip to track.",
      };
    }
  }, []);

  const setRepeatMode = useCallback(
    async (mode: "off" | "queue" | "track"): Promise<PlayerActionResult> => {
      try {
        await trackPlayerAdapter.setRepeatMode(mode);
        applyQueueState({
          ...stateRef.current.queue,
          repeatMode: mode,
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to update repeat mode.",
        };
      }
    },
    [applyQueueState],
  );

  const enqueue = useCallback(async (items: PlayerItem[]): Promise<PlayerActionResult> => {
    try {
      const playableItems = items.filter(
        (item) => item.authorization.allowed && item.authorization.url,
      );
      await trackPlayerAdapter.addToQueue(playableItems.map(toEngineTrack));
      applyQueueState({
        ...stateRef.current.queue,
        items: [...stateRef.current.queue.items, ...playableItems],
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unable to enqueue tracks.",
      };
    }
  }, [applyQueueState]);

  const startPlayback = useCallback(
    async (payload: StartPlaybackPayload): Promise<PlayerActionResult> => {
      try {
        return await loadAuthorizedQueue(payload);
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to start playback.",
        };
      }
    },
    [loadAuthorizedQueue],
  );

  const replaceQueue = useCallback(
    async (payload: ReplaceQueuePayload): Promise<PlayerActionResult> => {
      try {
        return await loadAuthorizedQueue(payload);
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to replace the playback queue.",
        };
      }
    },
    [loadAuthorizedQueue],
  );

  const actions = useMemo<PlayerProviderActions>(
    () => ({
      initialize,
      restoreSession,
      startPlayback,
      replaceQueue,
      play,
      pause,
      seekTo,
      skipNext,
      skipPrevious,
      skipToIndex,
      setRepeatMode,
      enqueue,
      clearQueue,
    }),
    [
      clearQueue,
      enqueue,
      initialize,
      pause,
      play,
      replaceQueue,
      restoreSession,
      seekTo,
      setRepeatMode,
      skipNext,
      skipPrevious,
      skipToIndex,
      startPlayback,
    ],
  );

  return useMemo(
    () => ({
      actions,
    }),
    [actions],
  );
}

export function PlayerProvider({ children }: PropsWithChildren) {
  const value = usePlayerProviderValue();
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayerContext must be used within PlayerProvider.");
  }

  return context;
}
