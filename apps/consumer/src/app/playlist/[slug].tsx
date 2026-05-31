import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { TrackRow } from "@/components/discover";
import type { DashboardPlaylistTrack } from "@micboxx/contracts";
import type { PublicTrackSummary } from "@micboxx/contracts";
import { useAuth } from "@/features/auth/provider";
import {
    DetailActionBar,
    DetailHeroCard,
    DetailRouteHeader,
    DetailStatusPanel,
    RelatedLaneSection,
} from "@/features/catalog/components/detail-shared";
import { buildPlaylistRelatedLane } from "@/features/catalog/detail-utils";
import { joinMetaParts, resolveTrackRoute } from "@micboxx/utils";
import { useDetailPlayback } from "@/features/catalog/hooks/useDetailPlayback";
import { env } from "@/config/env";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { formatDuration } from "@micboxx/api";
import {
    useGetDashboardPlaylistQuery,
    useGetPlaylistPageQuery,
} from "@micboxx/api";
import { tokens } from "@micboxx/theme";

function normalizeParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function mapDashboardTrackToSummary(
  track: DashboardPlaylistTrack,
): PublicTrackSummary {
  return {
    id: track.trackId,
    uuid: `dashboard-track-${track.trackId}`,
    title: track.title,
    slug: track.slug,
    duration: track.duration,
    description: null,
    artist: track.artist
      ? {
          id: track.artist.id,
          uuid: `dashboard-artist-${track.artist.id}`,
          username: "",
          displayName: track.artist.displayName,
          href: null,
        }
      : null,
    genre: track.genre
      ? {
          id: track.genre.id,
          name: track.genre.name,
          slug: "",
          href: "",
        }
      : null,
    album: track.album
      ? {
          id: track.album.id,
          title: track.album.title,
          slug: "",
          href: "",
        }
      : null,
    artworkUrl: track.artworkUrl,
    audioUrl: null,
    demoAudioUrl: null,
    locked: !track.isPublicReady,
    isSubscriberOnly: false,
    href: track.publicHref ?? resolveTrackRoute(track),
    timestamps: {
      createdAt: "",
      updatedAt: "",
    },
  };
}

function hasPlayableAudio(track: PublicTrackSummary): boolean {
  return Boolean(track.audioUrl || track.demoAudioUrl);
}

export default function PlaylistDetailScreen() {
  const params = useLocalSearchParams<{
    slug?: string | string[];
    playlistId?: string | string[];
  }>();
  const slug = normalizeParam(params.slug);
  const playlistId = normalizeParam(params.playlistId);
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? null;
  const progressValue = useSharedValue(0);

  const {
    data: publicData,
    isLoading: isPublicLoading,
    error: publicError,
  } = useGetPlaylistPageQuery(slug ?? "", {
    skip: !slug,
  });
  const {
    data: dashboardPlaylist,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useGetDashboardPlaylistQuery(
    {
      playlistId: playlistId ?? "",
      accessToken,
    },
    {
      skip: !playlistId || !accessToken,
    },
  );

  const playlist = dashboardPlaylist ?? publicData?.playlist ?? null;
  const trackList = publicData?.tracks?.length
    ? publicData.tracks
    : (dashboardPlaylist?.tracks ?? []).map(mapDashboardTrackToSummary);
  const relatedPlaylists = publicData?.relatedPlaylists ?? [];
  const usingDashboardPlaylist = Boolean(dashboardPlaylist);
  const hasPlayableTracks = trackList.some(hasPlayableAudio);

  const {
    activeTrackId,
    isPlaying,
    playAll,
    shuffleAll,
    playFromTrack,
    enqueueAll,
  } = useDetailPlayback(trackList, {
    type: "playlist",
    slug: playlist?.slug ?? slug ?? null,
    title: playlist?.title ?? null,
  });
  const { progressPercent } = useNowPlaying();

  useEffect(() => {
    if (activeTrackId !== null) {
      progressValue.value = withTiming(progressPercent, {
        duration: 240,
        easing: Easing.linear,
      });
      return;
    }

    progressValue.value = withTiming(0, {
      duration: 180,
      easing: Easing.linear,
    });
  }, [activeTrackId, progressPercent, progressValue]);

  if (!playlist && (isPublicLoading || isDashboardLoading)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator
          style={styles.loading}
          color={tokens.colors.accent}
        />
      </SafeAreaView>
    );
  }

  if (!playlist || (publicError && dashboardError)) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.page}>
          <DetailRouteHeader title="Playlist" />
          <DetailStatusPanel
            title="Unable to load playlist"
            body="We could not load this playlist from your library or the public catalog right now."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isPrivateLibraryPlaylist =
    usingDashboardPlaylist && !dashboardPlaylist?.status.published;
  const hasBlockedTracks =
    usingDashboardPlaylist &&
    (dashboardPlaylist?.counts.blockedTracks ?? 0) > 0;
  const sharePath =
    usingDashboardPlaylist && dashboardPlaylist?.publicHref
      ? dashboardPlaylist.publicHref
      : playlist.href;

  async function handleSharePlaylist() {
    if (!playlist || isPrivateLibraryPlaylist || !sharePath) {
      return;
    }

    const ownerName = playlist.owner?.displayName ?? "MicBoxx";
    const shareUrl = env.micboxxWebBaseUrl
      ? `${env.micboxxWebBaseUrl.replace(/\/$/, "")}${sharePath}`
      : null;
    const shareMessage = shareUrl
      ? `Listen to ${playlist.title} by ${ownerName} on MicBoxx\n${shareUrl}`
      : `${playlist.title} by ${ownerName} on MicBoxx`;

    try {
      await Share.share({
        title: playlist.title,
        message: shareMessage,
        ...(shareUrl ? { url: shareUrl } : {}),
      });
    } catch {
      if (shareUrl) {
        await WebBrowser.openBrowserAsync(shareUrl, {
          controlsColor: tokens.colors.accent,
        });
        return;
      }

      Alert.alert(
        "Unable to share",
        "Sharing is not available on this device right now.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <DetailRouteHeader title="Playlist" />

        <DetailHeroCard
          title={playlist.title}
          subtitle={playlist.owner?.displayName ?? "Unknown creator"}
          description={playlist.description}
          artworkUrl={playlist.artworkUrl}
          badgeLabel={
            isPrivateLibraryPlaylist ? "Private playlist" : "Playlist"
          }
          meta={joinMetaParts([
            `${playlist.counts.tracks} songs`,
            formatDuration(playlist.counts.duration),
            isPrivateLibraryPlaylist ? "Only visible in your library" : null,
          ])}
        >
          <DetailActionBar
            primary={{
              key: "play",
              label:
                hasPlayableTracks && isPlaying && activeTrackId != null
                  ? "Pause"
                  : "Play playlist",
              icon:
                hasPlayableTracks && isPlaying && activeTrackId != null
                  ? "pause"
                  : "play",
              disabled: !hasPlayableTracks,
              onPress: () => {
                if (hasPlayableTracks) {
                  void playAll();
                }
              },
            }}
            secondary={{
              key: "shuffle",
              label: "Shuffle",
              icon: "shuffle-outline",
              disabled: !hasPlayableTracks,
              onPress: () => {
                if (hasPlayableTracks) {
                  void shuffleAll();
                }
              },
            }}
            supporting={[
              {
                key: "queue",
                label: "Add queue",
                icon: "add-circle-outline",
                disabled: !hasPlayableTracks,
                onPress: () => {
                  if (hasPlayableTracks) {
                    void enqueueAll();
                  }
                },
              },
              !isPrivateLibraryPlaylist
                ? {
                    key: "share",
                    label: "Share",
                    icon: "share-social-outline",
                    onPress: () => void handleSharePlaylist(),
                  }
                : undefined,
            ].filter(Boolean) as any}
          />
        </DetailHeroCard>

        {isPrivateLibraryPlaylist ? (
          <DetailStatusPanel
            title="This playlist is in your library"
            body="It is not published to the public catalog yet, so mobile is loading it from your signed-in playlist dashboard instead."
          />
        ) : null}

        {hasBlockedTracks ? (
          <DetailStatusPanel
            title="Some tracks are not public-ready yet"
            body="Only published and ready tracks will behave like the public website experience. Private or processing tracks remain visible here in your library view."
          />
        ) : null}

        <View style={styles.trackSection}>
          <Text style={styles.sectionTitle}>
            Tracks · {playlist.counts.tracks}
          </Text>
          {trackList.length ? (
            <View style={styles.trackList}>
              {trackList.map((track, index) => {
                const active = track.id === activeTrackId;

                return (
                  <TrackRow
                    key={`${track.id}-${index}`}
                    track={track}
                    laneTracks={trackList}
                    active={active}
                    playing={active && isPlaying}
                    progressValue={progressValue}
                    rank={index + 1}
                    onAction={(selectedTrack) => {
                      if (hasPlayableAudio(selectedTrack)) {
                        void playFromTrack(selectedTrack);
                        return;
                      }

                      Alert.alert(
                        "Track unavailable",
                        "This playlist item is in your library, but it is not ready for public playback yet.",
                      );
                    }}
                  />
                );
              })}
            </View>
          ) : (
            <DetailStatusPanel
              title="No tracks in this playlist yet"
              body="Add a few songs to this playlist on MicBoxx and they will show up here."
            />
          )}
        </View>

        <RelatedLaneSection lane={buildPlaylistRelatedLane(relatedPlaylists)} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  scroll: {
    flex: 1,
  },
  page: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 18,
  },
  loading: {
    flex: 1,
  },
  trackSection: {
    gap: 8,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  trackList: {
    gap: 8,
  },
});
