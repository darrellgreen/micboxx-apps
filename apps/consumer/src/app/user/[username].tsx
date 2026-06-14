import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { TrackRow } from "@/components/discover";
import {
  BottomActionSheet,
  type BottomActionSheetItem,
  Skeleton,
} from "@micboxx/ui";
import {
  DetailHeroCard,
  DetailStatusPanel,
  RelatedLaneSection,
} from "@/features/catalog/components/detail-shared";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { ArtistHero } from "@/features/catalog/components/ArtistHero";
import {
    buildAlbumRelatedLane,
    buildPlaylistRelatedLane,
} from "@/features/catalog/detail-utils";
import { joinMetaParts } from "@micboxx/utils";
import { useDetailPlayback } from "@/features/catalog/hooks/useDetailPlayback";
import { env } from "@/config/env";
import { formatCompactNumber } from "@micboxx/api";
import { useGetUserPageQuery } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import { useNowPlaying } from "@/features/player/hooks/useNowPlaying";
import { useUserFollowState } from "@/features/social/hooks/useUserFollowState";

export default function UserDetailScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;
  const insets = useSafeAreaInsets();
  const progressValue = useSharedValue(0);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  const { data, isLoading, error } = useGetUserPageQuery(username ?? "", {
    skip: !username,
  });

  const user = data?.artist;
  const {
    followerCount,
    following,
    followPending,
    authPending: followAuthPending,
    isOwnProfile,
    interactionError: followError,
    clearInteractionError,
    toggleFollow,
  } = useUserFollowState({
    profileUid: user?.uuid ?? null,
    profileUsername: user?.username ?? null,
    initialFollowerCount: user?.counts.followers ?? 0,
    initialFollowingCount: user?.counts.following ?? 0,
  });
  const { activeTrackId, isPlaying, playAll, playFromTrack } =
    useDetailPlayback(data?.tracks ?? [], {
      type: "artist",
      slug: user?.username ?? username ?? null,
      title: user?.displayName ?? null,
    });
  const { progressPercent } = useNowPlaying();

  const topTrackGenre =
    data?.tracks.find((track) => track.genre?.name)?.genre?.name ?? null;

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

  useEffect(() => {
    if (!followError) {
      return;
    }

    Alert.alert("Follow unavailable", followError, [
      {
        text: "OK",
        onPress: clearInteractionError,
      },
    ]);
  }, [clearInteractionError, followError]);

  async function handleShareArtist() {
    if (!user) {
      return;
    }

    const artistPath = user.href ?? `/user/${encodeURIComponent(user.username)}`;
    const shareUrl = env.micboxxWebBaseUrl
      ? `${env.micboxxWebBaseUrl.replace(/\/$/, "")}${artistPath}`
      : null;
    const shareMessage = shareUrl
      ? `Check out ${user.displayName} on MicBoxx\n${shareUrl}`
      : `${user.displayName} on MicBoxx`;

    try {
      await Share.share({
        title: user.displayName,
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

  const actionSheetItems: BottomActionSheetItem[] = [
    {
      key: "share",
      label: "Share profile",
      icon: "share-social-outline",
      onPress: () => {
        void handleShareArtist();
      },
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
          <Skeleton width="100%" height={220} borderRadius={0} />
          <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}>
            <Skeleton width={72} height={72} borderRadius={36} style={{ marginTop: -36 }} />
            <Skeleton width="40%" height={20} borderRadius={8} />
            <Skeleton width="25%" height={14} borderRadius={6} />
            <View style={{ flexDirection: "row", gap: 20, marginTop: 4 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ gap: 4 }}>
                  <Skeleton width={28} height={16} borderRadius={6} />
                  <Skeleton width={44} height={11} borderRadius={6} />
                </View>
              ))}
            </View>
            <View style={{ gap: 10, marginTop: 12 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Skeleton width={44} height={44} borderRadius={6} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width="50%" height={13} borderRadius={6} />
                    <Skeleton width="30%" height={11} borderRadius={6} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!user || error) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerStyle={styles.errorPage}>
          <DetailStatusPanel
            title="Unable to load profile"
            body="The requested profile could not be loaded right now. Try again from Home or Search."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerOverlay, { top: insets.top + 8 }]}>
        <DetailRouteHeader title="Profile" fallbackRoute="/(tabs)/search" />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <ArtistHero
          name={user.displayName}
          username={user.username}
          avatarUrl={user.avatarUrl}
          coverUrl={user.coverUrl}
          descriptor={topTrackGenre ?? `@${user.username}`}
          followersLabel={`${formatCompactNumber(followerCount)} followers`}
          isVerified={false}
          isFollowing={following}
          isPlaying={isPlaying && activeTrackId != null}
          showFollow={!isOwnProfile}
          followDisabled={followPending || followAuthPending}
          followPending={followPending}
          stats={[
            {
              key: "followers",
              label: `${formatCompactNumber(followerCount)} followers`,
              onPress: () =>
                Alert.alert(
                  "Followers",
                  "Follower totals update here, but follower lists are not available on this screen.",
                ),
            },
            {
              key: "tracks",
              label: `${formatCompactNumber(user.counts.tracks)} tracks`,
              onPress: () =>
                Alert.alert(
                  "Top tracks",
                  "The top tracks list is shown below this hero.",
                ),
            },
            {
              key: "albums",
              label: `${formatCompactNumber(user.counts.albums)} albums`,
              onPress: () =>
                Alert.alert(
                  "Albums",
                  "Albums for this profile are shown below when they are available.",
                ),
            },
          ]}
          onPlay={() => void playAll()}
          onFollow={() => void toggleFollow()}
          onMorePress={() => setIsActionSheetOpen(true)}
        />

        <View style={styles.pageContent}>
          <View style={styles.trackSection}>
            <Text style={styles.sectionTitle}>Top tracks</Text>
            <View style={styles.trackList}>
              {data.tracks.slice(0, 4).map((track, index) => {
                const active = track.id === activeTrackId;

                return (
                  <TrackRow
                    key={track.id}
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

          <RelatedLaneSection lane={buildAlbumRelatedLane(data.albums)} />
          <RelatedLaneSection lane={buildPlaylistRelatedLane(data.playlists)} />
        </View>
      </ScrollView>

      <BottomActionSheet
        visible={isActionSheetOpen}
        title="Profile actions"
        items={actionSheetItems}
        onClose={() => setIsActionSheetOpen(false)}
      />
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
    paddingBottom: 160,
    gap: 18,
  },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  pageContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  errorPage: {
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
