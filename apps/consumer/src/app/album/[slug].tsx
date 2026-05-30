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
    DetailRouteHeader,
    DetailStatusPanel,
    RelatedLaneSection,
} from "@/features/catalog/components/detail-shared";
import {
    buildAlbumAccessCtaModel,
    buildAlbumRelatedLane,
} from "@/features/catalog/detail-utils";
import { joinMetaParts } from "@micboxx/utils";
import { useDetailPlayback } from "@/features/catalog/hooks/useDetailPlayback";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { formatDuration } from "@micboxx/api";
import { useGetAlbumPageQuery } from "@/store/micboxx-api";
import { tokens } from "@micboxx/theme";

export default function AlbumDetailScreen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { session } = useAuth();
  const progressValue = useSharedValue(0);

  const { data, isLoading, error, refetch } = useGetAlbumPageQuery(slug ?? "", {
    skip: !slug,
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
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator
          style={styles.loading}
          color={tokens.colors.accent}
        />
      </SafeAreaView>
    );
  }

  if (!album || error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.page}>
          <DetailRouteHeader title="Album" />
          <DetailStatusPanel
            title="Unable to load album"
            body="The requested release could not be loaded right now. Try again from Home or Search."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <DetailRouteHeader title="Album" />

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
                  icon: "radio-outline",
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
            <Text style={styles.sectionTitle}>Track list</Text>
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
