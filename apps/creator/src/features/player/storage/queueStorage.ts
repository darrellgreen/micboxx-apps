import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PlayerQueueState } from "@/features/player/types/player";

const STORAGE_KEY = "micboxx.mobile.player.queue";
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isValidPersistedQueue(value: unknown): value is PlayerQueueState {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    typeof value.currentIndex === "number" &&
    typeof value.shuffled === "boolean" &&
    (value.repeatMode === "off" ||
      value.repeatMode === "queue" ||
      value.repeatMode === "track")
  );
}

export async function readPersistedQueue(): Promise<PlayerQueueState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersistedQueue(parsed)) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function persistQueueState(queue: PlayerQueueState): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }, 350);
}

export async function clearPersistedQueue(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  await AsyncStorage.removeItem(STORAGE_KEY);
}
