import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { TrackRow } from "@/components/discover";
import { useAuth } from "@/features/auth/provider";
import {
    DetailActionBar,
    DetailHeroCard,
    RelatedLaneSection,
} from "@/features/catalog/components/detail-shared";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { Screen, ErrorState, Skeleton, Heading } from "@micboxx/ui";
import {
    buildAlbumAccessCtaModel,
    buildAlbumRelatedLane,
} from "@/features/catalog/detail-utils";
import { joinMetaParts } from "@micboxx/utils";
import { useDetailPlayback } from "@/features/catalog/hooks/useDetailPlayback";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { formatDuration } from "@micboxx/api";
import { useGetAlbumPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

export default function AlbumDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { session } = useAuth();
  const progressValue = useSharedValue(0);

  const { data, isLoading, isFetching, error, refetch } = useGetAlbumPageQuery(slug ?? "", {
    skip: !slug,
    refetchOnMountOrArgChange: 300,
  });

  const album = data?.album;
  const {
    activeTrackId,
    isPlaying,
    playAll,
    shuffleAll,
    playFromTrack,
    enqueueAll,
  } = useDetailPlayback(data?.tracks ?? [], {
    type: "album",
    slug: album?.slug ?? slug ?? null,
    title: album?.title ?? null,
  });
  const { progressPercent } = useNowPlaying();

  const accessCta = album
    ? buildAlbumAccessCtaModel(album, Boolean(session))
    : null;

  async function handleAlbumCheckout() {
    if (accessCta?.actionType !== "open_checkout") {
      return;
    }

    if (accessCta.handoffUrl) {
      await WebBrowser.openBrowserAsync(accessCta.handoffUrl, {
        controlsColor: tokens.colors.accent,
      });

      if (accessCta.refreshPolicy === "after_web_return") {
        void refetch();
      }

      return;
    }

    Alert.alert(
      "Checkout unavailable",
      "Album checkout is not configured for this build.",
    );
  }

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

  if (isLoading) {
    return (
      <Screen scroll={false} header={<Stack.Screen options={{ headerShown: false }} />}>
        <DetailRouteHeader title="Album" />
        <View style={[styles.page, { paddingHorizontal: 16, paddingTop: 16, gap: 24 }]}>
          <Skeleton width="100%" height={300} borderRadius={24} />
          <View style={{ gap: 12 }}>
            <Skeleton width="60%" height={28} borderRadius={8} />
            <Skeleton width="40%" height={16} borderRadius={6} />
            <Skeleton width="30%" height={16} borderRadius={6} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!album || error) {
    return (
      <Screen scroll={false} header={<Stack.Screen options={{ headerShown: false }} />}>
        <DetailRouteHeader title="Album" fallbackRoute="/(tabs)/home" />
        <View style={styles.page}>
          <ErrorState
            title="Unable to load album"
            message="The requested release could not be loaded right now. Try again from Home or Search."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={true} noPaddingBottom noPaddingHorizontal header={<Stack.Screen options={{ headerShown: false }} />}>
      <DetailRouteHeader
        title="Album"
        fallbackRoute="/(tabs)/home"
        rightContent={
          isFetching && !isLoading ? (
            <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
          ) : undefined
        }
      />
      <View style={styles.page}>

        <DetailHeroCard
          title={album.title}
          subtitle={album.artist?.displayName ?? "Unknown artist"}
          description={album.description}
          artworkUrl={album.artworkUrl}
          badgeLabel="Album"
          meta={joinMetaParts([
            `${album.counts.tracks} songs`,
            formatDuration(album.counts.duration),
          ])}
        >
          <DetailActionBar
            primary={{
              key: "play",
              label:
                isPlaying && activeTrackId != null ? "Pause" : "Play album",
              icon: isPlaying && activeTrackId != null ? "pause" : "play",
              onPress: () => void playAll(),
            }}
            secondary={{
              key: "shuffle",
              label: "Shuffle",
              icon: "shuffle-outline",
              onPress: () => void shuffleAll(),
            }}
            supporting={
              [
                {
                  key: "queue",
                  label: "Add queue",
                  icon: "add-circle-outline",
                  onPress: () => void enqueueAll(),
                },
                {
                  key: "room",
                  label: "Room",
                  customIcon: "soundwave",
                  onPress: () => router.push(`/album/${encodeURIComponent(album.slug)}/room` as never),
                },
                accessCta && accessCta.actionType === "open_checkout"
                  ? {
                      key: "buy",
                      label: accessCta.ctaLabel,
                      icon: "bag-handle-outline",
                      onPress: () => void handleAlbumCheckout(),
                    }
                  : undefined,
              ].filter(Boolean) as any
            }
          />
        </DetailHeroCard>

        <View style={styles.trackSection}>
          <View>
            <Heading level="h4">Track list</Heading>
          </View>
          <View style={styles.trackList}>
            {data.tracks.map((track, index) => {
              const active = track.id === activeTrackId;

              return (
                <TrackRow
                  key={`${track.id}-${index}`}
                  track={track}
                  laneTracks={data.tracks}
                  active={active}
                  playing={active && isPlaying}
                  progressValue={progressValue}
                  rank={index + 1}
                  onAction={(selectedTrack) => void playFromTrack(selectedTrack)}
                />
              );
            })}
          </View>
        </View>

        <RelatedLaneSection lane={buildAlbumRelatedLane(data.relatedAlbums)} />
      </View>
    </Screen>
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
