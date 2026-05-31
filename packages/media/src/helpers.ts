export function normalizeMediaUrl(baseUrl: string | null | undefined, rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (!baseUrl) return null;

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function joinBaseUrl(baseUrl: string | null | undefined, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  const safeBase = baseUrl?.replace(/\/+$/, "") ?? "";
  const safePath = path.startsWith("/") ? path : `/${path}`;
  
  return `${safeBase}${safePath}`;
}

export function generateCacheKey(remoteUrl: string): string {
  // Simple hashing or base64 encoding could go here, for now return as-is
  // or a simple sanitization to make it safe for filenames
  return remoteUrl.replace(/[^a-zA-Z0-9]/g, "_");
}
