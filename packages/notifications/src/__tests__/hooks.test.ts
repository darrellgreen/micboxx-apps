import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { useMicboxxNotifications } from '../hooks';

describe('useMicboxxNotifications loop', () => {
  it('only subscribes to notifications once and does not loop when unread count changes', async () => {
    let subscriberCallback: any = null;
    const mockAdapter = {
      isSocialConfigured: () => true,
      subscribeToSocialNotifications: jest.fn((uid, max, onData) => {
        subscriberCallback = onData;
        return jest.fn(); // unsubscribe mock
      }),
      fetchRoomNotifications: jest.fn().mockResolvedValue({ notifications: [] }),
    };

    let unreadCount = 0;
    const TestComponent = (props: any) => {
      const data = useMicboxxNotifications(props);
      unreadCount = data.unreadCount;
      return null;
    };

    const initialProps = {
      firebaseUid: 'test-uid',
      socialStatus: 'authenticated' as const,
      socialError: null,
      accessToken: null,
      hasDrupalSession: false,
      adapter: mockAdapter as any,
    };

    const utils = render(React.createElement(TestComponent, initialProps));

    await waitFor(() => {
      expect(mockAdapter.subscribeToSocialNotifications).toHaveBeenCalledTimes(1);
    });

    // Trigger an update by emitting new items from the subscriber
    await act(async () => {
      subscriberCallback([
        { id: '1', isRead: false, createdAt: new Date().toISOString() }, // 1 unread
      ]);
    });

    // Ensure the unread count changed
    expect(unreadCount).toBe(1);

    // Re-render the hook to simulate React reacting to the state change
    if (utils.rerender) {
      utils.rerender(React.createElement(TestComponent, initialProps));
    } else if (utils.update) {
      utils.update(React.createElement(TestComponent, initialProps));
    }

    // Ensure we didn't subscribe again due to the unreadCount change
    await waitFor(() => {
      expect(mockAdapter.subscribeToSocialNotifications).toHaveBeenCalledTimes(1);
    });
  });
});
