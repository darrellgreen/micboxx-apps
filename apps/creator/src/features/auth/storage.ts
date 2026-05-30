import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import type { MicboxxSession, MicboxxSessionUser } from "@micboxx/contracts";

const LEGACY_SESSION_KEY = "micboxx.mobile.session";
const ACCESS_TOKEN_KEY = "micboxx.mobile.session.accessToken";
const REFRESH_TOKEN_KEY = "micboxx.mobile.session.refreshToken";
const EXPIRES_AT_KEY = "micboxx.mobile.session.expiresAt";
const SESSION_CACHE_KEY = "micboxx.mobile.session.cache";

interface SecureStoreModule {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

interface SecureStoreImportShape extends Partial<SecureStoreModule> {
  default?: Partial<SecureStoreModule>;
}

let secureStorePromise: Promise<SecureStoreModule | null> | null = null;

async function getSecureStore(): Promise<SecureStoreModule | null> {
  if (Platform.OS === "web") {
    return null;
  }

  if (!secureStorePromise) {
    secureStorePromise = import("expo-secure-store")
      .then((module) => {
        const secureStoreImport = module as SecureStoreImportShape;
        const secureStore =
          typeof secureStoreImport.getItemAsync === "function"
            ? secureStoreImport
            : secureStoreImport.default;

        if (
          !secureStore ||
          typeof secureStore.getItemAsync !== "function" ||
          typeof secureStore.setItemAsync !== "function" ||
          typeof secureStore.deleteItemAsync !== "function"
        ) {
          return null;
        }

        return {
          getItemAsync: secureStore.getItemAsync,
          setItemAsync: secureStore.setItemAsync,
          deleteItemAsync: secureStore.deleteItemAsync,
        };
      })
      .catch(() => null);
  }

  return secureStorePromise;
}

async function readSecret(key: string): Promise<string | null> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    return secureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
}

async function writeSecret(key: string, value: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
}

async function deleteSecret(key: string): Promise<void> {
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isMicboxxSessionUser(value: unknown): value is MicboxxSessionUser {
  if (!isRecord(value)) {
    return false;
  }

  const permissions = value.permissions;

  if (!isRecord(permissions)) {
    return false;
  }

  return (
    typeof value.id === "number" &&
    typeof value.uuid === "string" &&
    typeof value.username === "string" &&
    typeof value.displayName === "string" &&
    typeof value.email === "string" &&
    Array.isArray(value.roles) &&
    (value.capabilities === undefined || isStringArray(value.capabilities)) &&
    typeof permissions.canUploadTracks === "boolean" &&
    typeof permissions.canAdministerTracks === "boolean" &&
    typeof permissions.canSellCatalog === "boolean" &&
    typeof permissions.canCreatePlaylists === "boolean" &&
    typeof permissions.canAdministerPlaylists === "boolean" &&
    typeof permissions.canCreateAlbums === "boolean" &&
    typeof permissions.canAdministerAlbums === "boolean"
  );
}

function isSessionEntitlements(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.hasListenerSubscription === undefined ||
      typeof value.hasListenerSubscription === "boolean") &&
    (value.capabilities === undefined || isStringArray(value.capabilities)) &&
    (value.purchasedTrackIds === undefined ||
      isStringArray(value.purchasedTrackIds)) &&
    (value.purchasedAlbumIds === undefined ||
      isStringArray(value.purchasedAlbumIds))
  );
}

function isMicboxxSession(value: unknown): value is MicboxxSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isMicboxxSessionUser(value.user) &&
    typeof value.accessToken === "string" &&
    (typeof value.refreshToken === "string" || value.refreshToken === null) &&
    typeof value.accessTokenExpiresAt === "number" &&
    isSessionEntitlements(value.entitlements)
  );
}

function isSessionCache(
  value: unknown,
): value is Pick<MicboxxSession, "user" | "entitlements"> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isMicboxxSessionUser(value.user) &&
    isSessionEntitlements(value.entitlements)
  );
}

async function migrateLegacySessionIfPresent(): Promise<MicboxxSession | null> {
  const raw = await readSecret(LEGACY_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isMicboxxSession(parsed)) {
      await clearStoredSession();
      return null;
    }

    await writeStoredSession(parsed);
    await deleteSecret(LEGACY_SESSION_KEY);
    return parsed;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function readStoredSession(): Promise<MicboxxSession | null> {
  const [accessToken, refreshToken, expiresAtRaw, cacheRaw] = await Promise.all(
    [
      readSecret(ACCESS_TOKEN_KEY),
      readSecret(REFRESH_TOKEN_KEY),
      readSecret(EXPIRES_AT_KEY),
      AsyncStorage.getItem(SESSION_CACHE_KEY),
    ],
  );

  if (!accessToken || !expiresAtRaw) {
    return migrateLegacySessionIfPresent();
  }

  const accessTokenExpiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(accessTokenExpiresAt)) {
    await clearStoredSession();
    return null;
  }

  if (!cacheRaw) {
    await clearStoredSession();
    return null;
  }

  try {
    const parsedCache: unknown = JSON.parse(cacheRaw);
    if (!isSessionCache(parsedCache)) {
      await clearStoredSession();
      return null;
    }

    return {
      user: parsedCache.user,
      entitlements: parsedCache.entitlements ?? null,
      accessToken,
      refreshToken: refreshToken ?? null,
      accessTokenExpiresAt,
    };
  } catch {
    await clearStoredSession();
    return null;
  }
}

export async function writeStoredSession(
  session: MicboxxSession,
): Promise<void> {
  await Promise.all([
    writeSecret(ACCESS_TOKEN_KEY, session.accessToken),
    session.refreshToken
      ? writeSecret(REFRESH_TOKEN_KEY, session.refreshToken)
      : deleteSecret(REFRESH_TOKEN_KEY),
    writeSecret(EXPIRES_AT_KEY, String(session.accessTokenExpiresAt)),
    AsyncStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        user: session.user,
        entitlements: session.entitlements ?? null,
      }),
    ),
    deleteSecret(LEGACY_SESSION_KEY),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    deleteSecret(LEGACY_SESSION_KEY),
    deleteSecret(ACCESS_TOKEN_KEY),
    deleteSecret(REFRESH_TOKEN_KEY),
    deleteSecret(EXPIRES_AT_KEY),
    AsyncStorage.removeItem(SESSION_CACHE_KEY),
  ]);
}
