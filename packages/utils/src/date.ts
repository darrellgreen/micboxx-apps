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
