import { getMicboxxApiConfig } from "../config";
import type { DiscoverPersonalizedResponse, ForYouResponse } from "@micboxx/contracts";
import { apiFetch } from "../client";
import { mockForYou } from "../mock-data";

export async function getForYouRecommendations(accessToken?: string | null): Promise<ForYouResponse> {
  const config = getMicboxxApiConfig();
  if (config.useFixtures || !config.webBaseUrl) {
    return mockForYou;
  }

  return apiFetch<{ items: ForYouResponse["items"]; nextCursor: string | null; surface: string; meta: ForYouResponse["meta"] }>(
    "/api/recommendations/for-you?limit=8&surface=discover_for_you",
    {
      baseUrl: config.webBaseUrl,
      accessToken,
    },
  );
}

export async function getDiscoverPersonalized(
  accessToken?: string | null,
): Promise<DiscoverPersonalizedResponse> {
  const config = getMicboxxApiConfig();
  if (!config.webBaseUrl) {
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
    baseUrl: config.webBaseUrl,
    accessToken,
  });

  return {
    forYou: response.data?.forYou ?? null,
    followedArtistFeed: response.data?.followedArtistFeed ?? null,
  };
}
