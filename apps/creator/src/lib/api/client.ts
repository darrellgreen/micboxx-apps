import { env } from "@/config/env";

interface Envelope<T> {
  data?: T;
  error?: {
    message?: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & {
    accessToken?: string | null;
    baseUrl?: string;
  },
): Promise<T> {
  const baseUrl = init?.baseUrl ?? env.drupalBaseUrl;
  if (!baseUrl) {
    throw new ApiError("Missing EXPO_PUBLIC_DRUPAL_BASE_URL.", 500);
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    signal: init?.signal,
    headers: {
      accept: "application/json",
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : null),
      ...(init?.accessToken
        ? { authorization: `Bearer ${init.accessToken}` }
        : null),
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Envelope<T>;
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message ?? `Request failed with ${response.status}.`,
      response.status,
    );
  }

  if (payload.data !== undefined) {
    return payload.data;
  }

  return payload as T;
}
