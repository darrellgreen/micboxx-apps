import { env, shouldUseLocalWebFixtures } from "@/config/env";
import type { DiscoverPersonalizedResponse, ForYouResponse } from "@/contracts/micboxx";
import { apiFetch } from "@/lib/api/client";
import { mockForYou } from "@/lib/mock-data";

export async function getForYouRecommendations(accessToken?: string | null): Promise<ForYouResponse> {
  if (shouldUseLocalWebFixtures() || !env.micboxxWebBaseUrl) {
    return mockForYou;
  }

  return apiFetch<{ items: ForYouResponse["items"]; nextCursor: string | null; surface: string; meta: ForYouResponse["meta"] }>(
    "/api/recommendations/for-you?limit=8&surface=discover_for_you",
    {
      baseUrl: env.micboxxWebBaseUrl,
      accessToken,
    },
  );
}

export async function getDiscoverPersonalized(
  accessToken?: string | null,
): Promise<DiscoverPersonalizedResponse> {
  if (!env.micboxxWebBaseUrl) {
    return {
      forYou: {
        items: mockForYou.items.map((item) => ({
          trackId: item.trackId,
          reasons: item.reasons,
          track: item.track,
        })),
      },
      followedArtistFeed: null,
    };
  }

  const response = await apiFetch<{
    data?: {
      forYou?: DiscoverPersonalizedResponse["forYou"];
      followedArtistFeed?: DiscoverPersonalizedResponse["followedArtistFeed"];
    };
  }>("/api/discover/personalized?limit=8&trackLimit=5", {
    baseUrl: env.micboxxWebBaseUrl,
    accessToken,
  });

  return {
    forYou: response.data?.forYou ?? null,
    followedArtistFeed: response.data?.followedArtistFeed ?? null,
  };
}
