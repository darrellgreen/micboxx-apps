import type { RoomChatMessage } from "@micboxx/contracts";

const AVATAR_PALETTES = ["#0f172a", "#1f2937", "#0b3d2a", "#2a1f3d"] as const;

export const toMillis = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object") {
    if ("toMillis" in value) {
      const fn = (value as { toMillis?: unknown }).toMillis;
      if (typeof fn === "function") {
        try {
          const ms = fn.call(value);
          return typeof ms === "number" && Number.isFinite(ms) ? ms : 0;
        } catch {
          return 0;
        }
      }
    }
    if ("seconds" in value) {
      const seconds = (value as { seconds?: unknown }).seconds;
      if (typeof seconds === "number") return seconds * 1000;
    }
  }
  return 0;
};

export const formatTime = (value: unknown): string => {
  const millis = toMillis(value);
  if (!millis) return "now";
  return new Date(millis).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const getInitials = (displayName: string | null, username: string | null): string => {
  const source = (displayName?.trim() ?? username?.trim() ?? "").trim();
  if (!source) return "MB";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
};

export const getAvatarBackground = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length] ?? AVATAR_PALETTES[0]!;
};

export const getMessageOpacity = (index: number, total: number, expanded: boolean): number => {
  const distanceFromNewest = total - index - 1;
  if (distanceFromNewest <= 0) return 1;

  const fadeStep = expanded ? 0.09 : 0.16;
  const minimumOpacity = expanded ? 0.28 : 0.16;
  return Math.max(minimumOpacity, 1 - distanceFromNewest * fadeStep);
};

export const shouldCompactWithPrevious = (
  messages: RoomChatMessage[],
  index: number,
): boolean => {
  if (index <= 0) {
    return false;
  }

  const previous = messages[index - 1];
  const current = messages[index];
  if (!previous || !current) {
    return false;
  }

  return previous.senderUid === current.senderUid;
};
