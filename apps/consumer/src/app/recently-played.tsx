import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "@micboxx/ui";
import { getRecentlyPlayedTracks } from "@micboxx/api";
import type { PublicTrackSummary } from "@micboxx/contracts";

import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { LibraryRow, EmptyLine } from "@/features/library/components/library-shared";
import { useAuth } from "@/features/auth/provider";

export default function RecentlyPlayedScreen() {
  const { session } = useAuth();
  const [tracks, setTracks] = useState<PublicTrackSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRecentlyPlayedTracks(50, session?.accessToken)
      .then((result) => {
        if (!cancelled) setTracks(result.tracks);
      })
      .catch(() => {
        // leave tracks empty on error
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  return (
    <Screen
      header={
        <DetailRouteHeader
          title="Recently Played"
          fallbackRoute="/(tabs)/home"
        />
      }
    >
      <View style={s.list}>
        {loading ? null : tracks.length === 0 ? (
          <EmptyLine text="Nothing played yet." />
        ) : (
          tracks.map((track, index) => (
            <LibraryRow
              key={track.uuid}
              title={track.title}
              subtitle={track.artist?.displayName ?? "Unknown Artist"}
              meta={track.genre?.name ?? ""}
              artwork={track.artworkUrl}
              isLast={index === tracks.length - 1}
              onPress={() =>
                router.push(`/now-playing?slug=${encodeURIComponent(track.slug)}`)
              }
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: {
    flex: 1,
  },
});
