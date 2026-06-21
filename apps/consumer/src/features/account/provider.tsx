import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useRef,
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

export { DEFAULT_ACCOUNT_PREFERENCES };

interface AccountPreferencesContextValue {
  preferences: AccountPreferences;
  isHydrating: boolean;
  isSavingLocalPreferences: boolean;
  isSavingAccountPreferences: boolean;
  error: string | null;
  canManagePushNotifications: boolean;
  pushPreferenceReady: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setAutoplayPreviewEnabled: (enabled: boolean) => Promise<void>;
  setExplicitFilterEnabled: (enabled: boolean) => Promise<void>;
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
  const [hydratedUserUuid, setHydratedUserUuid] = useState<string | null>(null);

  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let isCancelled = false;

    async function hydratePreferences() {
      setIsHydrating(true);
      setHydratedUserUuid(null);
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
        setHydratedUserUuid(currentUserUuid);
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
      const previous = preferencesRef.current;
      const next = {
        ...previous,
        autoplayPreview: enabled,
      };

      preferencesRef.current = next;
      setPreferences(next);
      setIsSavingLocalPreferences(true);
      setError(null);

      try {
        await writeStoredLocalAppPreferences({
          autoplayPreview: next.autoplayPreview,
          explicitFilter: next.explicitFilter,
        });
      } catch (nextError) {
        preferencesRef.current = previous;
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
    [],
  );

  const setExplicitFilterEnabled = useCallback(
    async (enabled: boolean) => {
      const previous = preferencesRef.current;
      const next = {
        ...previous,
        explicitFilter: enabled,
      };

      preferencesRef.current = next;
      setPreferences(next);
      setIsSavingLocalPreferences(true);
      setError(null);

      try {
        await writeStoredLocalAppPreferences({
          autoplayPreview: next.autoplayPreview,
          explicitFilter: next.explicitFilter,
        });
      } catch (nextError) {
        preferencesRef.current = previous;
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
    [],
  );

  const setPushNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!currentUserUuid) {
        setError("Sign in to manage push notifications.");
        return;
      }

      const previous = preferencesRef.current;
      const next = {
        ...previous,
        pushNotifications: enabled,
      };

      preferencesRef.current = next;
      setPreferences(next);
      setIsSavingAccountPreferences(true);
      setError(null);

      try {
        await writeStoredAccountNotificationPreferences(currentUserUuid, {
          pushNotifications: next.pushNotifications,
        });
      } catch (nextError) {
        preferencesRef.current = previous;
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
    [currentUserUuid],
  );

  const value = useMemo<AccountPreferencesContextValue>(
    () => ({
      preferences,
      isHydrating,
      isSavingLocalPreferences,
      isSavingAccountPreferences,
      error,
      canManagePushNotifications: Boolean(currentUserUuid),
      pushPreferenceReady: Boolean(currentUserUuid) && hydratedUserUuid === currentUserUuid,
      setPushNotificationsEnabled,
      setAutoplayPreviewEnabled,
      setExplicitFilterEnabled,
    }),
    [
      currentUserUuid,
      error,
      hydratedUserUuid,
      isHydrating,
      isSavingAccountPreferences,
      isSavingLocalPreferences,
      preferences,
      setAutoplayPreviewEnabled,
      setExplicitFilterEnabled,
      setPushNotificationsEnabled,
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
