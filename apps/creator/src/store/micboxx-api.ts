import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
    EntitlementState,
    PublicSubscriptionPlan,
} from "@/contracts/commerce";
import type {
    DashboardPlaylist,
    DashboardPlaylistList,
} from "@/contracts/dashboard";
import type {
    ForYouResponse,
    PublicAlbumPage,
    PublicArtistPage,
    PublicArtistSummary,
    PublicPlaylistPage,
    PublicSearchResults,
    PublicTrackList,
    PublicTrackPage,
    PublicTrackSummary,
} from "@/contracts/micboxx";
import {
    getAlbumPage,
    getArtistPage,
    getDiscoverTracks,
    getPlaylistPage,
    getPopularArtists,
    getPopularTracks,
    getRecentlyPlayedTracks,
    getTrackPage,
    getTrendingArtists,
    searchCatalog,
} from "@/features/catalog/api";
import {
    getCurrentEntitlements,
    getDashboardPlaylist,
    getMyPlaylists,
    getPublicSubscriptionPlans,
} from "@/features/dashboard/api";
import { getForYouRecommendations } from "@/features/recommendations/api";

type MicboxxApiError = {
  message: string;
};

export const micboxxApi = createApi({
  reducerPath: "micboxxApi",
  baseQuery: fakeBaseQuery<MicboxxApiError>(),
  endpoints: (builder) => ({
    getMyPlaylists: builder.query<
      DashboardPlaylistList,
      { accessToken?: string | null; page?: number; pageSize?: number }
    >({
      async queryFn({ accessToken, page = 1, pageSize = 24 }) {
        try {
          const data = await getMyPlaylists(page, pageSize, accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load your playlists.",
            },
          };
        }
      },
    }),
    getDashboardPlaylist: builder.query<
      DashboardPlaylist,
      { playlistId: string | number; accessToken?: string | null }
    >({
      async queryFn({ playlistId, accessToken }) {
        try {
          const data = await getDashboardPlaylist(playlistId, accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load your playlist.",
            },
          };
        }
      },
    }),
    getCurrentEntitlements: builder.query<
      EntitlementState | null,
      { accessToken?: string | null }
    >({
      async queryFn({ accessToken }) {
        try {
          const data = await getCurrentEntitlements(accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load current entitlements.",
            },
          };
        }
      },
    }),
    getForYou: builder.query<ForYouResponse, { accessToken?: string | null }>({
      async queryFn({ accessToken }) {
        try {
          const data = await getForYouRecommendations(accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load recommendations.",
            },
          };
        }
      },
    }),
    getDiscoverTracks: builder.query<PublicTrackList, void>({
      async queryFn() {
        try {
          const data = await getDiscoverTracks();
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load discover tracks.",
            },
          };
        }
      },
    }),
    getTrackPage: builder.query<PublicTrackPage, string>({
      async queryFn(slug) {
        try {
          const data = await getTrackPage(slug);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load track.",
            },
          };
        }
      },
    }),
    getAlbumPage: builder.query<PublicAlbumPage, string>({
      async queryFn(slug) {
        try {
          const data = await getAlbumPage(slug);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load album.",
            },
          };
        }
      },
    }),
    getArtistPage: builder.query<PublicArtistPage, string>({
      async queryFn(username) {
        try {
          const data = await getArtistPage(username);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load artist.",
            },
          };
        }
      },
    }),
    getPlaylistPage: builder.query<PublicPlaylistPage, string>({
      async queryFn(slug) {
        try {
          const data = await getPlaylistPage(slug);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load playlist.",
            },
          };
        }
      },
    }),
    searchCatalog: builder.query<PublicSearchResults, string>({
      async queryFn(query, { signal }) {
        try {
          const data = await searchCatalog(query, { signal });
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to search catalog.",
            },
          };
        }
      },
    }),
    getPopularTracks: builder.query<{ tracks: PublicTrackSummary[] }, void>({
      async queryFn() {
        try {
          const data = await getPopularTracks(7);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load popular tracks.",
            },
          };
        }
      },
    }),
    getPopularArtists: builder.query<{ artists: PublicArtistSummary[] }, void>({
      async queryFn() {
        try {
          const data = await getPopularArtists(6);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load popular artists.",
            },
          };
        }
      },
    }),
    getTrendingArtists: builder.query<{ artists: PublicArtistSummary[] }, void>(
      {
        async queryFn() {
          try {
            const data = await getTrendingArtists(3);
            return { data };
          } catch (error) {
            return {
              error: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Unable to load trending artists.",
              },
            };
          }
        },
      },
    ),
    getRecentlyPlayed: builder.query<
      { tracks: PublicTrackSummary[] },
      { accessToken?: string | null }
    >({
      async queryFn({ accessToken }) {
        try {
          const data = await getRecentlyPlayedTracks(5, accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load recently played tracks.",
            },
          };
        }
      },
    }),
    getPublicSubscriptionPlans: builder.query<PublicSubscriptionPlan[], void>({
      async queryFn() {
        try {
          const data = await getPublicSubscriptionPlans();
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : "Unable to load subscription plans.",
            },
          };
        }
      },
    }),
  }),
});

export const {
  useGetAlbumPageQuery,
  useGetArtistPageQuery,
  useGetCurrentEntitlementsQuery,
  useGetDashboardPlaylistQuery,
  useGetDiscoverTracksQuery,
  useGetForYouQuery,
  useGetMyPlaylistsQuery,
  useGetPlaylistPageQuery,
  useGetPopularArtistsQuery,
  useGetPopularTracksQuery,
  useGetPublicSubscriptionPlansQuery,
  useGetRecentlyPlayedQuery,
  useGetTrackPageQuery,
  useGetTrendingArtistsQuery,
  useSearchCatalogQuery,
} = micboxxApi;

export const useGetUserPageQuery = useGetArtistPageQuery;
