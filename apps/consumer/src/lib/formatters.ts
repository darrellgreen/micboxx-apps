export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

/** Alias for formatCompactNumber — used in card meta */
export const formatCount = formatCompactNumber;

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatCurrency(
  amount: string | null,
  currency = "USD",
): string {
  if (!amount) {
    return "Included";
  }

  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return amount;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) < 1) {
    return "now";
  }

  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return `${Math.abs(diffDays)}d`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}
