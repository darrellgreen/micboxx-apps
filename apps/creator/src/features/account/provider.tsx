import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";

import { useAuth } from "@/features/auth/provider";

import {
    DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES,
    DEFAULT_ACCOUNT_PREFERENCES,
    readStoredAccountNotificationPreferences,
    readStoredLocalAppPreferences,
    writeStoredAccountNotificationPreferences,
    writeStoredLocalAppPreferences,
    type AccountPreferences,
} from "./preferences-storage";

interface AccountPreferencesContextValue {
  preferences: AccountPreferences;
  isHydrating: boolean;
  isSavingLocalPreferences: boolean;
  isSavingAccountPreferences: boolean;
  error: string | null;
  canManagePushNotifications: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAutoplayPreviewEnabled: (enabled: boolean) => Promise<void>;
  setExplicitFilterEnabled: (enabled: boolean) => Promise<void>;
  setAdvancedModeEnabled: (enabled: boolean) => Promise<void>;
}

const AccountPreferencesContext =
  createContext<AccountPreferencesContextValue | null>(null);

export function AccountPreferencesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const currentUserUuid = session?.user.uuid ?? null;

  const [preferences, setPreferences] = useState<AccountPreferences>(
    DEFAULT_ACCOUNT_PREFERENCES,
  );
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSavingLocalPreferences, setIsSavingLocalPreferences] =
    useState(false);
  const [isSavingAccountPreferences, setIsSavingAccountPreferences] =
    useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function hydratePreferences() {
      setIsHydrating(true);
      setError(null);

      try {
        const [localPreferences, accountPreferences] = await Promise.all([
          readStoredLocalAppPreferences(),
          currentUserUuid
            ? readStoredAccountNotificationPreferences(currentUserUuid)
            : Promise.resolve(DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES),
        ]);

        if (isCancelled) {
          return;
        }

        setPreferences({
          ...DEFAULT_ACCOUNT_PREFERENCES,
          ...localPreferences,
          ...accountPreferences,
        });
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setPreferences(DEFAULT_ACCOUNT_PREFERENCES);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load account preferences.",
        );
      } finally {
        if (!isCancelled) {
          setIsHydrating(false);
        }
      }
    }

    void hydratePreferences();

    return () => {
      isCancelled = true;
    };
  }, [currentUserUuid]);

  const setAutoplayPreviewEnabled = useCallback(
    async (enabled: boolean) => {
      const previous = preferences;
      const next = {
        ...preferences,
        autoplayPreview: enabled,
      };

      setPreferences(next);
      setIsSavingLocalPreferences(true);
      setError(null);

      try {
        await writeStoredLocalAppPreferences({
          autoplayPreview: next.autoplayPreview,
          explicitFilter: next.explicitFilter,
          advancedModeEnabled: next.advancedModeEnabled,
        });
      } catch (nextError) {
        setPreferences(previous);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to save local preferences.",
        );
      } finally {
        setIsSavingLocalPreferences(false);
      }
    },
    [preferences],
  );

  const setExplicitFilterEnabled = useCallback(
    async (enabled: boolean) => {
      const previous = preferences;
      const next = {
        ...preferences,
        explicitFilter: enabled,
      };

      setPreferences(next);
      setIsSavingLocalPreferences(true);
      setError(null);

      try {
        await writeStoredLocalAppPreferences({
          autoplayPreview: next.autoplayPreview,
          explicitFilter: next.explicitFilter,
          advancedModeEnabled: next.advancedModeEnabled,
        });
      } catch (nextError) {
        setPreferences(previous);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to save local preferences.",
        );
      } finally {
        setIsSavingLocalPreferences(false);
      }
    },
    [preferences],
  );

  const setAdvancedModeEnabled = useCallback(
    async (enabled: boolean) => {
      const previous = preferences;
      const next = {
        ...preferences,
        advancedModeEnabled: enabled,
      };

      setPreferences(next);
      setIsSavingLocalPreferences(true);
      setError(null);

      try {
        await writeStoredLocalAppPreferences({
          autoplayPreview: next.autoplayPreview,
          explicitFilter: next.explicitFilter,
          advancedModeEnabled: next.advancedModeEnabled,
        });
      } catch (nextError) {
        setPreferences(previous);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to save local preferences.",
        );
      } finally {
        setIsSavingLocalPreferences(false);
      }
    },
    [preferences],
  );

  const setPushNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!currentUserUuid) {
        setError("Sign in to manage push notifications.");
        return;
      }

      const previous = preferences;
      const next = {
        ...preferences,
        pushNotifications: enabled,
      };

      setPreferences(next);
      setIsSavingAccountPreferences(true);
      setError(null);

      try {
        await writeStoredAccountNotificationPreferences(currentUserUuid, {
          pushNotifications: next.pushNotifications,
        });
      } catch (nextError) {
        setPreferences(previous);
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to save account notification preferences.",
        );
      } finally {
        setIsSavingAccountPreferences(false);
      }
    },
    [currentUserUuid, preferences],
  );

  const value = useMemo<AccountPreferencesContextValue>(
    () => ({
      preferences,
      isHydrating,
      isSavingLocalPreferences,
      isSavingAccountPreferences,
      error,
      canManagePushNotifications: Boolean(currentUserUuid),
      setPushNotificationsEnabled,
      setAutoplayPreviewEnabled,
      setExplicitFilterEnabled,
      setAdvancedModeEnabled,
    }),
    [
      currentUserUuid,
      error,
      isHydrating,
      isSavingAccountPreferences,
      isSavingLocalPreferences,
      preferences,
      setAutoplayPreviewEnabled,
      setExplicitFilterEnabled,
      setPushNotificationsEnabled,
      setAdvancedModeEnabled,
    ],
  );

  return (
    <AccountPreferencesContext.Provider value={value}>
      {children}
    </AccountPreferencesContext.Provider>
  );
}

export function useAccountPreferences(): AccountPreferencesContextValue {
  const context = useContext(AccountPreferencesContext);
  if (!context) {
    throw new Error(
      "useAccountPreferences must be used within AccountPreferencesProvider.",
    );
  }

  return context;
}
