import type { ForYouResponse } from "@micboxx/contracts";
import { env } from "@/config/env";
import { apiFetch } from "@/lib/api/client";

export async function getForYouRecommendations(accessToken?: string | null): Promise<ForYouResponse> {
  if (!env.micboxxWebBaseUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_MICBOXX_WEB_BASE_URL for recommendations API.",
    );
  }

  return apiFetch<{ items: ForYouResponse["items"]; nextCursor: string | null; surface: string; meta: ForYouResponse["meta"] }>(
    "/api/recommendations/for-you?limit=8&surface=discover_for_you",
    {
      baseUrl: env.micboxxWebBaseUrl,
      accessToken,
    },
  );
}
