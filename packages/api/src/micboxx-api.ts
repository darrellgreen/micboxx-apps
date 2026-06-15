import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type { EntitlementState, PublicSubscriptionPlan } from '@micboxx/contracts';
import type { DashboardPlaylist, DashboardPlaylistList } from '@micboxx/contracts';
import type {
  DiscoverPersonalizedResponse,
  ForYouResponse,
  PublicAlbumPage,
  PublicArtistPage,
  PublicArtistSummary,
  PublicPlaylistPage,
  PublicSearchResults,
  PublicTrackList,
  PublicTrackPage,
  PublicTrackSummary,
} from '@micboxx/contracts';
import type {
  PublicRoomDiscoveryFilter,
  PublicRoomList,
  RoomActivityResponse,
  RoomClockState,
  RoomEntryResponse,
  RoomPollsResponse,
  RoomQuestionsResponse,
  RoomReactionType,
  RoomSupportSendResponse,
  RoomSupportStatusResult,
  RoomTimeMachineResponse,
} from '@micboxx/contracts';
import {
  getAlbumPage,
  getArtistPage,
  getDiscoverTracks,
  getFeaturedTracks,
  getPlaylistPage,
  getPopularArtists,
  getPopularTracks,
  getRecentlyPlayedTracks,
  getTrackPage,
  getTrendingArtists,
  searchCatalog,
} from './features/catalog';
import {
  getCurrentEntitlements,
  getDashboardPlaylist,
  getMyPlaylists,
  getPublicSubscriptionPlans,
} from './features/dashboard';
import { getDiscoverPersonalized, getForYouRecommendations } from './features/recommendations';
import {
  enterRoom,
  getPublicRooms,
  getRoomActivity,
  getRoomClock,
  getRoomPolls,
  getRoomQuestions,
  getRoomSupportStatus,
  getRoomTimeMachine,
  reportRoomChatMessage,
  sendRoomChatMessage,
  sendRoomReaction,
  sendRoomSupport,
  submitRoomQuestion,
  voteRoomPoll,
  voteRoomQuestion,
} from './features/rooms';

type MicboxxApiError = {
  message: string;
};

export const micboxxApi = createApi({
  reducerPath: 'micboxxApi',
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
              message: error instanceof Error ? error.message : 'Unable to load your playlists.',
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
              message: error instanceof Error ? error.message : 'Unable to load your playlist.',
            },
          };
        }
      },
    }),
    getCurrentEntitlements: builder.query<EntitlementState | null, { accessToken?: string | null }>(
      {
        async queryFn({ accessToken }) {
          try {
            const data = await getCurrentEntitlements(accessToken);
            return { data };
          } catch (error) {
            return {
              error: {
                message:
                  error instanceof Error ? error.message : 'Unable to load current entitlements.',
              },
            };
          }
        },
      },
    ),
    getForYou: builder.query<ForYouResponse, { accessToken?: string | null }>({
      async queryFn({ accessToken }) {
        try {
          const data = await getForYouRecommendations(accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load recommendations.',
            },
          };
        }
      },
    }),
    getDiscoverPersonalized: builder.query<
      DiscoverPersonalizedResponse,
      { accessToken?: string | null }
    >({
      async queryFn({ accessToken }) {
        try {
          const data = await getDiscoverPersonalized(accessToken);
          return { data };
        } catch (error) {
          return {
            error: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Unable to load personalized discover content.',
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
              message: error instanceof Error ? error.message : 'Unable to load discover tracks.',
            },
          };
        }
      },
    }),
    getFeaturedTracks: builder.query<{ tracks: PublicTrackSummary[] }, void>({
      async queryFn() {
        try {
          const data = await getFeaturedTracks(8);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load featured tracks.',
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
              message: error instanceof Error ? error.message : 'Unable to load track.',
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
              message: error instanceof Error ? error.message : 'Unable to load album.',
            },
          };
        }
      },
    }),
    getArtistPage: builder.query<PublicArtistPage, string>({
      keepUnusedDataFor: 300,
      async queryFn(username) {
        try {
          const data = await getArtistPage(username);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load artist.',
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
              message: error instanceof Error ? error.message : 'Unable to load playlist.',
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
              message: error instanceof Error ? error.message : 'Unable to search catalog.',
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
              message: error instanceof Error ? error.message : 'Unable to load popular tracks.',
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
              message: error instanceof Error ? error.message : 'Unable to load popular artists.',
            },
          };
        }
      },
    }),
    getTrendingArtists: builder.query<{ artists: PublicArtistSummary[] }, void>({
      async queryFn() {
        try {
          const data = await getTrendingArtists(3);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load trending artists.',
            },
          };
        }
      },
    }),
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
                error instanceof Error ? error.message : 'Unable to load recently played tracks.',
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
                error instanceof Error ? error.message : 'Unable to load subscription plans.',
            },
          };
        }
      },
    }),
    getPublicRooms: builder.query<
      PublicRoomList,
      { filter?: PublicRoomDiscoveryFilter; limit?: number; artist?: string | null }
    >({
      async queryFn(input) {
        try {
          const data = await getPublicRooms(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Rooms.',
            },
          };
        }
      },
    }),
    enterRoom: builder.mutation<
      RoomEntryResponse,
      {
        releaseIdentifier: string;
        sessionId: string;
        accessToken?: string | null;
      }
    >({
      async queryFn(input) {
        try {
          const data = await enterRoom(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to enter Room.',
            },
          };
        }
      },
    }),
    getRoomClock: builder.query<RoomClockState, number | string>({
      async queryFn(roomId) {
        try {
          const data = await getRoomClock(roomId);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room clock.',
            },
          };
        }
      },
    }),
    sendRoomReaction: builder.mutation<
      Record<string, never>,
      {
        roomId: number | string;
        reactionId: string;
        reactionType: RoomReactionType;
        actorVisibility?: 'anonymous' | 'visible';
        accessToken?: string | null;
      }
    >({
      async queryFn(input) {
        try {
          const data = await sendRoomReaction(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to send Room reaction.',
            },
          };
        }
      },
    }),
    sendRoomChatMessage: builder.mutation<
      { message_id?: string },
      Parameters<typeof sendRoomChatMessage>[0]
    >({
      async queryFn(input) {
        try {
          const data = await sendRoomChatMessage(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to send Room message.',
            },
          };
        }
      },
    }),
    reportRoomChatMessage: builder.mutation<
      Record<string, never>,
      Parameters<typeof reportRoomChatMessage>[0]
    >({
      async queryFn(input) {
        try {
          const data = await reportRoomChatMessage(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to report Room message.',
            },
          };
        }
      },
    }),
    getRoomQuestions: builder.query<RoomQuestionsResponse, number | string>({
      async queryFn(roomId) {
        try {
          const data = await getRoomQuestions(roomId);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room questions.',
            },
          };
        }
      },
    }),
    submitRoomQuestion: builder.mutation<
      RoomQuestionsResponse,
      Parameters<typeof submitRoomQuestion>[0]
    >({
      async queryFn(input) {
        try {
          const data = await submitRoomQuestion(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to submit Room question.',
            },
          };
        }
      },
    }),
    voteRoomQuestion: builder.mutation<
      RoomQuestionsResponse,
      Parameters<typeof voteRoomQuestion>[0]
    >({
      async queryFn(input) {
        try {
          const data = await voteRoomQuestion(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to vote for Room question.',
            },
          };
        }
      },
    }),
    getRoomPolls: builder.query<RoomPollsResponse, number | string>({
      async queryFn(roomId) {
        try {
          const data = await getRoomPolls(roomId);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room polls.',
            },
          };
        }
      },
    }),
    voteRoomPoll: builder.mutation<RoomPollsResponse, Parameters<typeof voteRoomPoll>[0]>({
      async queryFn(input) {
        try {
          const data = await voteRoomPoll(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to vote in Room poll.',
            },
          };
        }
      },
    }),
    getRoomActivity: builder.query<RoomActivityResponse, Parameters<typeof getRoomActivity>[0]>({
      async queryFn(input) {
        try {
          const data = await getRoomActivity(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room activity.',
            },
          };
        }
      },
    }),
    getRoomTimeMachine: builder.query<RoomTimeMachineResponse, number | string>({
      async queryFn(roomId) {
        try {
          const data = await getRoomTimeMachine(roomId);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room Time Machine.',
            },
          };
        }
      },
    }),
    getRoomSupportStatus: builder.query<
      RoomSupportStatusResult,
      Parameters<typeof getRoomSupportStatus>[0]
    >({
      async queryFn(input) {
        try {
          const data = await getRoomSupportStatus(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to load Room support.',
            },
          };
        }
      },
    }),
    sendRoomSupport: builder.mutation<
      RoomSupportSendResponse,
      Parameters<typeof sendRoomSupport>[0]
    >({
      async queryFn(input) {
        try {
          const data = await sendRoomSupport(input);
          return { data };
        } catch (error) {
          return {
            error: {
              message: error instanceof Error ? error.message : 'Unable to send Room support.',
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
  useGetDiscoverPersonalizedQuery,
  useGetDashboardPlaylistQuery,
  useGetDiscoverTracksQuery,
  useGetFeaturedTracksQuery,
  useGetForYouQuery,
  useGetMyPlaylistsQuery,
  useGetPlaylistPageQuery,
  useGetPopularArtistsQuery,
  useGetPopularTracksQuery,
  useGetPublicSubscriptionPlansQuery,
  useGetPublicRoomsQuery,
  useGetRecentlyPlayedQuery,
  useGetTrackPageQuery,
  useGetTrendingArtistsQuery,
  useSearchCatalogQuery,
  useEnterRoomMutation,
  useGetRoomActivityQuery,
  useGetRoomClockQuery,
  useGetRoomPollsQuery,
  useGetRoomQuestionsQuery,
  useGetRoomSupportStatusQuery,
  useGetRoomTimeMachineQuery,
  useReportRoomChatMessageMutation,
  useSendRoomChatMessageMutation,
  useSendRoomReactionMutation,
  useSendRoomSupportMutation,
  useSubmitRoomQuestionMutation,
  useVoteRoomPollMutation,
  useVoteRoomQuestionMutation,
} = micboxxApi;

export const useGetUserPageQuery = useGetArtistPageQuery;
