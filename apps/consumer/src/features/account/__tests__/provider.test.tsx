import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import {
  AccountPreferencesProvider,
  useAccountPreferences,
  DEFAULT_ACCOUNT_PREFERENCES,
} from '../provider';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@micboxx/api', () => ({
  fetchAccountNotificationPreferences: jest.fn().mockResolvedValue({}),
  writeStoredAccountNotificationPreferences: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../auth/provider', () => ({
  useAuth: () => ({ session: { user: { uuid: 'test-user-123' } } }),
}));

describe('AccountPreferencesProvider Rapid Toggles', () => {
  it('correctly merges rapid back-to-back preference toggles without losing state', async () => {
    let currentPrefs: any = null;
    let currentIsHydrating = true;
    let toggleAutoplay: any = null;
    let toggleExplicit: any = null;

    const TestComponent = () => {
      const { preferences, isHydrating, setAutoplayPreviewEnabled, setExplicitFilterEnabled } =
        useAccountPreferences();
      currentPrefs = preferences;
      currentIsHydrating = isHydrating;
      toggleAutoplay = setAutoplayPreviewEnabled;
      toggleExplicit = setExplicitFilterEnabled;
      return null;
    };

    await act(async () => {
      render(
        <AccountPreferencesProvider>
          <TestComponent />
        </AccountPreferencesProvider>,
      );
    });

    // Wait for hydration
    await waitFor(() => {
      expect(currentIsHydrating).toBe(false);
    });

    // Initial state: uses default or mocked API state
    // We only care about the transition
    const initialAutoplay = currentPrefs.autoplayPreview;
    const initialExplicit = currentPrefs.explicitFilter;

    // Rapid sequential toggles
    await act(async () => {
      toggleAutoplay(!initialAutoplay);
      toggleExplicit(!initialExplicit);
    });

    // Both should be toggled
    expect(currentPrefs.autoplayPreview).toBe(!initialAutoplay);
    expect(currentPrefs.explicitFilter).toBe(!initialExplicit);
  });
});
