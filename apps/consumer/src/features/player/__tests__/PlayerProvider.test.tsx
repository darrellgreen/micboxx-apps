import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { PlayerProvider, usePlayerContext } from '../provider';
import { trackPlayerAdapter } from '../engine/adapter';
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: jest.fn((selector) => {
    const rootState = {
      player: {
        nowPlaying: { currentItem: null },
        queue: { items: [] },
      },
      auth: {
        session: null,
      },
    };
    return selector(rootState);
  }),
}));

jest.mock('../engine/adapter', () => ({
  trackPlayerAdapter: {
    setup: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    addToQueue: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../storage/playbackSessionStorage', () => ({
  readPersistedPlaybackSession: jest.fn().mockResolvedValue(null),
  clearPersistedPlaybackSession: jest.fn().mockResolvedValue(undefined),
  persistPlaybackSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../storage/queueStorage', () => ({
  readPersistedQueue: jest.fn().mockResolvedValue(null),
  clearPersistedQueue: jest.fn().mockResolvedValue(undefined),
  persistQueueState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/player/analytics', () => ({
  createServerPlayerAnalyticsSink: () => ({ emit: jest.fn() }),
}));

describe('PlayerProvider Concurrency', () => {
  it('Restore-vs-Start: aborts restoreSession if startPlayback is triggered', async () => {
    let actions: any = null;
    const TestComponent = () => {
      const data = usePlayerContext();
      actions = data.actions;
      return null;
    };

    render(
      <PlayerProvider>
        <TestComponent />
      </PlayerProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    let resolveStorage: any;
    const storagePromise = new Promise((res) => {
      resolveStorage = res;
    });
    const mockStorage = require('@react-native-async-storage/async-storage');
    mockStorage.getItem.mockReturnValue(storagePromise);

    await act(async () => {
      await actions.restoreSession();
    });

    await act(async () => {
      await actions.startPlayback({ id: 'new-track' }, []);
    });

    await act(async () => {
      resolveStorage(JSON.stringify({ queue: [{ id: 'old-track' }], activeTrackId: 'old-track' }));
    });

    expect(trackPlayerAdapter.addToQueue).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'old-track' })]),
    );

    // Reset the mock so it doesn't affect the second test
    mockStorage.getItem.mockReset();
    mockStorage.getItem.mockResolvedValue(null);
  });

  it.skip('Play/Pause Double Tap: serializes calls to prevent adapter clobbering', async () => {
    let actions: any = null;
    const TestComponent = () => {
      const data = usePlayerContext();
      actions = data.actions;
      return null;
    };

    render(
      <PlayerProvider>
        <TestComponent />
      </PlayerProvider>,
    );

    await waitFor(() => {
      expect(actions).not.toBeNull();
    });

    let resolvePlay: any;
    const playPromise = new Promise((res) => {
      resolvePlay = res;
    });
    (trackPlayerAdapter.play as jest.Mock).mockReturnValue(playPromise);

    let p1: any;
    let p2: any;
    await act(async () => {
      p1 = actions.play();
      p2 = actions.pause();
    });

    expect(trackPlayerAdapter.pause).not.toHaveBeenCalled();

    await act(async () => {
      resolvePlay();
    });

    await act(async () => {
      await Promise.all([p1, p2].map((p) => Promise.resolve(p).catch(() => {})));
    });

    await waitFor(() => {
      expect(trackPlayerAdapter.pause).toHaveBeenCalledTimes(1);
    });

    expect(trackPlayerAdapter.play).toHaveBeenCalledTimes(1);

    await act(async () => {
      await actions.pause();
    });

    expect(trackPlayerAdapter.pause).toHaveBeenCalledTimes(2);
  });
});
