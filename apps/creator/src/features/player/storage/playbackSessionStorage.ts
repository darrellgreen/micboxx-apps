import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PersistedPlaybackSession } from "@micboxx/contracts";

const STORAGE_KEY = "micboxx.mobile.player.session";
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isValidPersistedPlaybackSession(
  value: unknown,
): value is PersistedPlaybackSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.updatedAt === "string" &&
    isRecord(value.queue)
  );
}

export async function readPersistedPlaybackSession(): Promise<PersistedPlaybackSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedPlaybackSession(parsed)) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function persistPlaybackSession(
  session: PersistedPlaybackSession,
): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, 500);
}

export async function clearPersistedPlaybackSession(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
