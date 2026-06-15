import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react';

import { createServerPlayerAnalyticsSink } from '@/features/player/analytics';
import { PLAYER_ANALYTICS_EVENTS } from '@micboxx/analytics';
import { noopDownloadPlaybackResolver } from '@/features/player/downloads';
import { trackPlayerAdapter } from '@/features/player/engine/adapter';
import { apiFetch } from '@micboxx/api';
import type { EngineTrack } from '@micboxx/contracts';
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
} from '@/features/player/player-slice';
import {
  clearPersistedPlaybackSession,
  persistPlaybackSession,
  readPersistedPlaybackSession,
} from '@/features/player/storage/playbackSessionStorage';
import {
  clearPersistedQueue,
  persistQueueState,
  readPersistedQueue,
} from '@/features/player/storage/queueStorage';
import { emptyPlaybackPosition, emptyQueueState } from '@/features/player/store';
import type { PlayerItem, PlayerQueueState } from '@micboxx/contracts';
import type {
  PlayerActionResult,
  ReplaceQueuePayload,
  StartPlaybackPayload,
} from '@micboxx/contracts';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

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
  setRepeatMode(mode: 'off' | 'queue' | 'track'): Promise<PlayerActionResult>;
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
    url: item.authorization.url ?? '',
    title: item.title,
    artist: item.artistName,
    album: item.albumTitle ?? undefined,
    artwork: item.artworkUrl ?? undefined,
    duration: item.durationSec ?? undefined,
  };
}

function getQueueIndexByTrackId(queue: PlayerQueueState, trackId: string | null): number {
  if (!trackId) {
    return -1;
  }

  return queue.items.findIndex((item) => item.id === trackId);
}

function isRoomOwnedQueue(queue: PlayerQueueState): boolean {
  return Boolean(queue.context?.id?.startsWith('room:'));
}

function usePlayerProviderValue(): PlayerProviderContextValue {
  const dispatch = useAppDispatch();
  const state = useAppSelector((rootState) => rootState.player);
  const session = useAppSelector((rootState) => rootState.auth.session);
  const initializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const wasPlayingBeforeInterruptionRef = useRef(false);
  const stateRef = useRef(state);
  const sessionRef = useRef(session);

  const playbackReportRef = useRef<{ trackId: string | null; reported: boolean }>({
    trackId: null,
    reported: false,
  });

  const eventFlagsRef = useRef<{
    trackId: string | null;
    started: boolean;
    qualified: boolean;
    completed: boolean;
  }>({ trackId: null, started: false, qualified: false, completed: false });

  const analyticsSessionIdRef = useRef<string | null>(null);

  const currentTrackId = state.nowPlaying.currentItem?.id ?? null;

  useEffect(() => {
    playbackReportRef.current = {
      trackId: currentTrackId,
      reported: false,
    };
    eventFlagsRef.current = {
      trackId: currentTrackId,
      started: false,
      qualified: false,
      completed: false,
    };
    analyticsSessionIdRef.current = currentTrackId
      ? `mobile-play-${Date.now()}-${Math.random().toString(36).slice(2)}`
      : null;
  }, [currentTrackId]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const resolveSourceType = useCallback((): string => {
    const contextType = stateRef.current.queue.context?.type;
    switch (contextType) {
      case 'track':
        return 'public_track';
      case 'album':
        return 'album';
      case 'artist':
        return 'artist_profile';
      case 'playlist':
        return 'playlist';
      case 'recommendation':
        return 'discover';
      case 'search':
        return 'search';
      default:
        return 'unknown';
    }
  }, []);

  const resolveSourceRef = useCallback((): string | null => {
    return stateRef.current.queue.context?.slug ?? stateRef.current.queue.context?.id ?? null;
  }, []);

  const reportCurrentTrackPlay = useCallback(async () => {
    const currentTrack = stateRef.current.nowPlaying.currentItem;
    if (!currentTrack) {
      return;
    }

    const trackId = currentTrack.id;
    if (playbackReportRef.current.trackId === trackId && playbackReportRef.current.reported) {
      return;
    }

    playbackReportRef.current = {
      trackId,
      reported: true,
    };

    try {
      await apiFetch(`/v1/public/tracks/${trackId}/analytics/play`, {
        method: 'POST',
        accessToken: session?.accessToken ?? null,
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[Analytics] recordTrackPlayback failed:', err);
      }
    }
  }, [session?.accessToken]);

  const reportPlayEvent = useCallback(
    async (eventType: 'play_started' | 'play_qualified' | 'play_completed') => {
      const currentTrack = stateRef.current.nowPlaying.currentItem;
      if (!currentTrack) return;

      const trackId = currentTrack.id;
      const flags = eventFlagsRef.current;
      if (flags.trackId !== trackId) {
        eventFlagsRef.current = { trackId, started: false, qualified: false, completed: false };
      }

      const key =
        eventType === 'play_started'
          ? 'started'
          : eventType === 'play_qualified'
            ? 'qualified'
            : 'completed';
      if (eventFlagsRef.current[key]) {
        return;
      }

      eventFlagsRef.current[key] = true;

      try {
        await apiFetch(`/v1/public/tracks/${trackId}/analytics/event`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            eventType,
            sourceType: resolveSourceType(),
            sourceRef: resolveSourceRef(),
            sessionId: analyticsSessionIdRef.current ?? 'unknown',
          }),
          accessToken: session?.accessToken ?? null,
        });
      } catch (err) {
        if (__DEV__) {
          console.warn(`[Analytics] reportPlayEvent (${eventType}) failed:`, err);
        }
      }
    },
    [session?.accessToken, resolveSourceType, resolveSourceRef],
  );

  const checkQualifiedAndCompleted = useCallback(
    (currentTime: number, trackDuration: number) => {
      const currentTrack = stateRef.current.nowPlaying.currentItem;
      if (!currentTrack || trackDuration <= 0) return;

      const trackId = currentTrack.id;
      const flags = eventFlagsRef.current;
      if (flags.trackId !== trackId) return;

      // Qualified: >= 30s or >= 25% of duration, whichever is smaller but >= 5s.
      if (!flags.qualified) {
        const qualifyThreshold = Math.max(5, Math.min(30, trackDuration * 0.25));
        if (currentTime >= qualifyThreshold) {
          void reportPlayEvent('play_qualified');
        }
      }

      // Completed: >= 90% of duration.
      if (!flags.completed && currentTime >= trackDuration * 0.9) {
        void reportPlayEvent('play_completed');
      }
    },
    [reportPlayEvent],
  );

  const playerAnalyticsSinkRef = useRef(
    createServerPlayerAnalyticsSink(
      () => (stateRef.current ? (sessionRef.current?.accessToken ?? null) : null),
      () => analyticsSessionIdRef.current ?? 'unknown',
    ),
  );

  const emitAnalytics = useCallback(
    (
      event: keyof typeof PLAYER_ANALYTICS_EVENTS,
      payload: {
        trackId: string | null;
        sourceKind?: string | null;
        currentPositionSec?: number;
      },
    ) => {
      playerAnalyticsSinkRef.current.emit(PLAYER_ANALYTICS_EVENTS[event], {
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

  const activeLoadIdRef = useRef(0);
  const controlledLoadRef = useRef<{ loadId: number; trackId: string } | null>(null);
  const inFlightPlaybackActionRef = useRef(false);

  const applyQueueState = useCallback(
    (queue: PlayerQueueState) => {
      dispatch(setQueue(queue));
    },
    [dispatch],
  );

  const clearQueue = useCallback(async (): Promise<PlayerActionResult> => {
    activeLoadIdRef.current++;
    controlledLoadRef.current = null;
    try {
      await trackPlayerAdapter.reset();
      await clearPersistedQueue();
      await clearPersistedPlaybackSession();
      applyQueueState(emptyQueueState);
      dispatch(resetPlayerState());
      return { ok: true };
    } catch (error) {
      applyQueueState(emptyQueueState);
      dispatch(resetPlayerState());
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to clear queue.',
      };
    }
  }, [applyQueueState, dispatch]);

  const loadAuthorizedQueue = useCallback(
    async (payload: StartPlaybackPayload, loadId: number): Promise<PlayerActionResult> => {
      const requestedItem = payload.items[payload.startIndex] ?? null;
      if (!requestedItem) {
        return { ok: false, error: 'No track was selected for playback.' };
      }

      if (loadId !== activeLoadIdRef.current) {
        return { ok: false, error: 'Playback load cancelled.' };
      }

      if (!requestedItem.authorization.allowed || !requestedItem.authorization.url) {
        emitAnalytics('playbackBlocked', {
          trackId: requestedItem.id,
          sourceKind: requestedItem.authorization.sourceKind,
        });
        return {
          ok: false,
          error: 'This track is currently unavailable for playback.',
        };
      }

      const playableItems = payload.items.filter(
        (item) => item.authorization.allowed && item.authorization.url,
      );
      const nextStartIndex = playableItems.findIndex((item) => item.id === requestedItem.id);

      if (nextStartIndex < 0) {
        return {
          ok: false,
          error: 'No playable tracks were found in the queue.',
        };
      }

      const queue: PlayerQueueState = {
        items: playableItems,
        currentIndex: nextStartIndex,
        context: payload.context,
        shuffled: false,
        repeatMode: stateRef.current.queue.repeatMode,
      };

      if (loadId !== activeLoadIdRef.current) {
        return { ok: false, error: 'Playback load cancelled.' };
      }

      controlledLoadRef.current = {
        loadId,
        trackId: requestedItem.id,
      };
      applyQueueState(queue);
      dispatch(setPosition(emptyPlaybackPosition));
      dispatch(setPlaybackState('loading'));
      dispatch(setError(null));

      try {
        await trackPlayerAdapter.loadQueue(
          playableItems.map(toEngineTrack),
          nextStartIndex,
          payload.startPositionSec,
        );

        if (loadId !== activeLoadIdRef.current) {
          return { ok: false, error: 'Playback load cancelled.' };
        }

        await trackPlayerAdapter.setRepeatMode(queue.repeatMode);
        await syncMetadata(playableItems[nextStartIndex] ?? null);

        if (loadId !== activeLoadIdRef.current) {
          return { ok: false, error: 'Playback load cancelled.' };
        }

        if (payload.autoplay !== false) {
          await trackPlayerAdapter.play();
        } else {
          await trackPlayerAdapter.pause();
        }
      } finally {
        if (controlledLoadRef.current?.loadId === loadId) {
          controlledLoadRef.current = null;
        }
      }

      emitAnalytics('playbackSourceSelected', {
        trackId: playableItems[nextStartIndex]?.id ?? null,
        sourceKind: playableItems[nextStartIndex]?.authorization.sourceKind ?? null,
      });
      return { ok: true };
    },
    [applyQueueState, dispatch, emitAnalytics, syncMetadata],
  );

  const restoreSession = useCallback(async (): Promise<void> => {
    const loadId = ++activeLoadIdRef.current;
    dispatch(setRestoring(true));

    try {
      const [persistedQueue, persistedSession] = await Promise.all([
        readPersistedQueue(),
        readPersistedPlaybackSession(),
      ]);

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      if (
        !persistedQueue ||
        !Array.isArray(persistedQueue.items) ||
        persistedQueue.items.length === 0
      ) {
        return;
      }

      if (isRoomOwnedQueue(persistedQueue)) {
        await clearPersistedQueue();
        await clearPersistedPlaybackSession();
        return;
      }

      const restoredItems = await Promise.all(
        persistedQueue.items.map(async (item): Promise<PlayerItem> => {
          const localCandidate = await noopDownloadPlaybackResolver.resolveLocalCandidate(item);
          if (!localCandidate.localFileUrl) {
            return item;
          }

          return {
            ...item,
            authorization: {
              ...item.authorization,
              allowed: true,
              sourceKind: 'full',
              url: localCandidate.localFileUrl,
            },
          };
        }),
      );

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      const requestedIndex = Math.min(persistedQueue.currentIndex, restoredItems.length - 1);
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

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      const result = await loadAuthorizedQueue(
        {
          items: restoredItems,
          startIndex,
          context: persistedQueue.context,
          startPositionSec:
            persistedSession?.lastKnownTrackId === restoredItems[startIndex]?.id
              ? persistedSession.lastKnownPositionSec
              : 0,
          autoplay: false,
        },
        loadId,
      );

      if (loadId !== activeLoadIdRef.current) {
        return;
      }

      if (result.ok) {
        dispatch(setPlaybackState('paused'));
      }
    } finally {
      if (loadId === activeLoadIdRef.current) {
        dispatch(setRestoring(false));
      }
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
        appName: 'MicBoxx',
        iosCategory: 'playback',
        androidChannelId: 'micboxx-playback',
      });

      unsubscribeRef.current = trackPlayerAdapter.subscribe((event) => {
        const currentState = stateRef.current;

        switch (event.type) {
          case 'playback-state-changed':
            if (controlledLoadRef.current) {
              break;
            }
            dispatch(setPlaybackState(event.state));
            if (event.state === 'playing') {
              wasPlayingBeforeInterruptionRef.current = true;
              emitAnalytics('playbackStarted', {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind: currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
              void reportCurrentTrackPlay();
              void reportPlayEvent('play_started');
            }
            if (event.state === 'paused') {
              emitAnalytics('playbackPaused', {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind: currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
            }
            if (event.state === 'ended') {
              emitAnalytics('playbackCompleted', {
                trackId: currentState.nowPlaying.currentItem?.id ?? null,
                sourceKind: currentState.nowPlaying.currentItem?.authorization.sourceKind ?? null,
                currentPositionSec: currentState.nowPlaying.position.positionSec,
              });
            }
            break;
          case 'active-track-changed': {
            const controlledLoad = controlledLoadRef.current;
            const loadingRequestedTrack =
              currentState.nowPlaying.playbackState === 'loading' &&
              currentState.nowPlaying.currentItem !== null;
            if (!event.trackId && (controlledLoad || loadingRequestedTrack)) {
              break;
            }

            const nextIndex = getQueueIndexByTrackId(currentState.queue, event.trackId);
            if (nextIndex >= 0) {
              dispatch(setCurrentIndex(nextIndex));
              void syncMetadata(currentState.queue.items[nextIndex] ?? null);
              if (controlledLoad?.trackId === event.trackId) {
                controlledLoadRef.current = null;
              }
            } else {
              // Ignore spurious unmatched track events from the native engine
              // while we are explicitly loading a new queue.
              if (!controlledLoad) {
                dispatch(setCurrentItem(null));
              }
            }
            break;
          }
          case 'position-changed':
            if (controlledLoadRef.current) {
              break;
            }
            dispatch(setPosition(event.position));
            void checkQualifiedAndCompleted(event.position.positionSec, event.position.durationSec);
            break;
          case 'remote-play':
            void trackPlayerAdapter.play();
            break;
          case 'remote-pause':
            void trackPlayerAdapter.pause();
            break;
          case 'remote-next':
            void trackPlayerAdapter.skipNext();
            break;
          case 'remote-previous':
            void trackPlayerAdapter.skipPrevious();
            break;
          case 'remote-seek':
            void trackPlayerAdapter.seekTo(event.positionSec);
            break;
          case 'interruption-began':
            wasPlayingBeforeInterruptionRef.current =
              currentState.nowPlaying.playbackState === 'playing';
            void trackPlayerAdapter.pause();
            break;
          case 'interruption-ended':
            if (event.shouldResume && wasPlayingBeforeInterruptionRef.current) {
              void trackPlayerAdapter.play();
            }
            break;
          case 'audio-becoming-noisy':
            void trackPlayerAdapter.pause();
            break;
          case 'playback-error':
            dispatch(setError(event.message));
            break;
        }
      });

      await restoreSession();
      dispatch(setInitialized());
    } catch (error) {
      dispatch(
        setError(error instanceof Error ? error.message : 'Unable to initialize MicBoxx playback.'),
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
    if (isRoomOwnedQueue(state.queue)) {
      void clearPersistedQueue();
      return;
    }

    persistQueueState(state.queue);
  }, [state.queue]);

  // Only persist the session when paused or the track changes — not on every
  // position tick. Position is saved at pause time so resume is accurate;
  // saving every second just keeps a debounce timer alive during playback
  // which fires async storage writes mid-animation when the modal closes.
  const playbackState = state.nowPlaying.playbackState;
  const sessionTrackId = state.nowPlaying.currentItem?.id ?? null;
  const isRoomQueue = Boolean(state.queue.context?.id?.startsWith('room:'));
  useEffect(() => {
    if (isRoomQueue) {
      void clearPersistedPlaybackSession();
      return;
    }

    if (playbackState !== 'paused') {
      return;
    }

    persistPlaybackSession({
      queue: stateRef.current.queue,
      lastKnownTrackId: sessionTrackId,
      lastKnownPositionSec: stateRef.current.nowPlaying.position.positionSec,
      updatedAt: new Date().toISOString(),
    });
  }, [isRoomQueue, sessionTrackId, playbackState]);

  const play = useCallback(async (): Promise<PlayerActionResult> => {
    if (inFlightPlaybackActionRef.current) {
      return { ok: true };
    }
    inFlightPlaybackActionRef.current = true;
    try {
      await trackPlayerAdapter.play();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to play.',
      };
    } finally {
      inFlightPlaybackActionRef.current = false;
    }
  }, []);

  const pause = useCallback(async (): Promise<PlayerActionResult> => {
    if (inFlightPlaybackActionRef.current) {
      return { ok: true };
    }
    inFlightPlaybackActionRef.current = true;
    try {
      await trackPlayerAdapter.pause();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to pause.',
      };
    } finally {
      inFlightPlaybackActionRef.current = false;
    }
  }, []);

  const seekTo = useCallback(async (positionSec: number): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.seekTo(positionSec);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to seek.',
      };
    }
  }, []);

  const skipNext = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.skipNext();
      emitAnalytics('playbackSkipped', {
        trackId: stateRef.current.nowPlaying.currentItem?.id ?? null,
        sourceKind: stateRef.current.nowPlaying.currentItem?.authorization.sourceKind ?? null,
        currentPositionSec: stateRef.current.nowPlaying.position.positionSec,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to skip next.',
      };
    }
  }, [emitAnalytics]);

  const skipPrevious = useCallback(async (): Promise<PlayerActionResult> => {
    try {
      await trackPlayerAdapter.skipPrevious();
      emitAnalytics('playbackSkipped', {
        trackId: stateRef.current.nowPlaying.currentItem?.id ?? null,
        sourceKind: stateRef.current.nowPlaying.currentItem?.authorization.sourceKind ?? null,
        currentPositionSec: stateRef.current.nowPlaying.position.positionSec,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to skip previous.',
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
        error: error instanceof Error ? error.message : 'Unable to skip to track.',
      };
    }
  }, []);

  const setRepeatMode = useCallback(
    async (mode: 'off' | 'queue' | 'track'): Promise<PlayerActionResult> => {
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
          error: error instanceof Error ? error.message : 'Unable to update repeat mode.',
        };
      }
    },
    [applyQueueState],
  );

  const enqueue = useCallback(
    async (items: PlayerItem[]): Promise<PlayerActionResult> => {
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
          error: error instanceof Error ? error.message : 'Unable to enqueue tracks.',
        };
      }
    },
    [applyQueueState],
  );

  const startPlayback = useCallback(
    async (payload: StartPlaybackPayload): Promise<PlayerActionResult> => {
      const loadId = ++activeLoadIdRef.current;
      try {
        return await loadAuthorizedQueue(payload, loadId);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unable to start playback.',
        };
      }
    },
    [loadAuthorizedQueue],
  );

  const replaceQueue = useCallback(
    async (payload: ReplaceQueuePayload): Promise<PlayerActionResult> => {
      const loadId = ++activeLoadIdRef.current;
      try {
        return await loadAuthorizedQueue(payload, loadId);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unable to replace the playback queue.',
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
    throw new Error('usePlayerContext must be used within PlayerProvider.');
  }

  return context;
}
