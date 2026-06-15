import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { PlayerSheetProvider, usePlayerSheet } from '../PlayerSheetContext';
import { withTiming } from 'react-native-reanimated';

jest.mock('react-native-reanimated', () => {
  return {
    withTiming: jest.fn((toValue, config, callback) => {
      return { toValue, callback };
    }),
    runOnJS: jest.fn((fn) => fn),
    useSharedValue: jest.fn((val) => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(() => ({ value: 0 })),
  };
});

describe('PlayerSheetContext', () => {
  it('does not setIsExpandedState to false if collapse animation is interrupted (finished: false)', async () => {
    let currentIsExpanded = false;
    let expand: any = null;
    let collapse: any = null;

    const TestComponent = () => {
      const data = usePlayerSheet();
      currentIsExpanded = data.isExpandedState;
      expand = data.expand;
      collapse = data.collapse;
      return null;
    };

    await act(async () => {
      render(
        <PlayerSheetProvider>
          <TestComponent />
        </PlayerSheetProvider>,
      );
    });

    await waitFor(() => {
      expect(expand).not.toBeNull();
    });

    await act(async () => {
      expand();
    });
    await waitFor(() => {
      expect(currentIsExpanded).toBe(true);
    });

    await act(async () => {
      collapse();
    });

    // The collapse function calls withTiming(0, { duration: 220 }, callback)
    const mockWithTiming = withTiming as unknown as jest.Mock;
    const callback = mockWithTiming.mock.calls[mockWithTiming.mock.calls.length - 1][2];

    await act(async () => {
      // Simulate interruption
      callback(false);
    });

    // Should still be expanded
    expect(currentIsExpanded).toBe(true);

    await act(async () => {
      // Simulate completion
      callback(true);
    });

    // Now it should be false
    expect(currentIsExpanded).toBe(false);
  });
});
