import AsyncStorage from "@react-native-async-storage/async-storage";

export interface LocalAppPreferences {
  autoplayPreview: boolean;
  explicitFilter: boolean;
}

export interface AccountNotificationPreferences {
  pushNotifications: boolean;
}

export interface AccountPreferences
  extends LocalAppPreferences, AccountNotificationPreferences {}

export const DEFAULT_LOCAL_APP_PREFERENCES: LocalAppPreferences = {
  autoplayPreview: true,
  explicitFilter: false,
};

export const DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES: AccountNotificationPreferences =
  {
    pushNotifications: true,
  };

export const DEFAULT_ACCOUNT_PREFERENCES: AccountPreferences = {
  ...DEFAULT_LOCAL_APP_PREFERENCES,
  ...DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES,
};

const LOCAL_APP_PREFERENCES_KEY = "micboxx.mobile.account.preferences.local";
const ACCOUNT_NOTIFICATION_PREFERENCES_PREFIX =
  "micboxx.mobile.account.preferences.notifications";

function buildAccountNotificationPreferencesKey(userUuid: string): string {
  return `${ACCOUNT_NOTIFICATION_PREFERENCES_PREFIX}:${userUuid}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isLocalAppPreferences(value: unknown): value is LocalAppPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.autoplayPreview === "boolean" &&
    typeof value.explicitFilter === "boolean"
  );
}

function isAccountNotificationPreferences(
  value: unknown,
): value is AccountNotificationPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.pushNotifications === "boolean";
}

export async function readStoredLocalAppPreferences(): Promise<LocalAppPreferences> {
  const raw = await AsyncStorage.getItem(LOCAL_APP_PREFERENCES_KEY);
  if (!raw) {
    return DEFAULT_LOCAL_APP_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isLocalAppPreferences(parsed)) {
      return parsed;
    }

    await AsyncStorage.removeItem(LOCAL_APP_PREFERENCES_KEY);
    return DEFAULT_LOCAL_APP_PREFERENCES;
  } catch {
    await AsyncStorage.removeItem(LOCAL_APP_PREFERENCES_KEY);
    return DEFAULT_LOCAL_APP_PREFERENCES;
  }
}

export async function writeStoredLocalAppPreferences(
  preferences: LocalAppPreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    LOCAL_APP_PREFERENCES_KEY,
    JSON.stringify(preferences),
  );
}

export async function readStoredAccountNotificationPreferences(
  userUuid: string,
): Promise<AccountNotificationPreferences> {
  const raw = await AsyncStorage.getItem(
    buildAccountNotificationPreferencesKey(userUuid),
  );
  if (!raw) {
    return DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isAccountNotificationPreferences(parsed)) {
      return parsed;
    }

    await AsyncStorage.removeItem(
      buildAccountNotificationPreferencesKey(userUuid),
    );
    return DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES;
  } catch {
    await AsyncStorage.removeItem(
      buildAccountNotificationPreferencesKey(userUuid),
    );
    return DEFAULT_ACCOUNT_NOTIFICATION_PREFERENCES;
  }
}

export async function writeStoredAccountNotificationPreferences(
  userUuid: string,
  preferences: AccountNotificationPreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    buildAccountNotificationPreferencesKey(userUuid),
    JSON.stringify(preferences),
  );
}
