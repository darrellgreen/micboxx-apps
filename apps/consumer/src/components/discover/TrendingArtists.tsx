import { AnimatedPressable } from "@micboxx/ui";
import { hapticSelection, hapticSuccess } from "@micboxx/ui";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import type { PublicArtistSummary } from "@micboxx/contracts";
import { resolveUserRoute } from "@/features/catalog/detail-utils";
import { tokens } from "@micboxx/theme";

function resolveArtistImageUri(artist: PublicArtistSummary): string | null {
  const avatarUrl =
    typeof artist.avatarUrl === "string" ? artist.avatarUrl.trim() : "";
  if (avatarUrl) {
    return avatarUrl;
  }

  const coverUrl =
    typeof artist.coverUrl === "string" ? artist.coverUrl.trim() : "";
  if (coverUrl) {
    return coverUrl;
  }

  return null;
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }

  return `${value}`;
}

function resolveArtistMeta(artist: PublicArtistSummary): string | null {
  const description =
    typeof artist.description === "string" ? artist.description.trim() : "";
  if (description) {
    return description;
  }

  const followers = artist.counts?.followers;
  if (typeof followers === "number" && followers > 0) {
    return `${formatCompactCount(followers)} followers`;
  }

  return null;
}

export function TrendingArtists({
  artists,
  followed,
  onToggleFollow,
}: {
  artists: PublicArtistSummary[];
  followed: Set<number>;
  onToggleFollow: (id: number) => void;
}) {
  const router = useRouter();

  if (!artists.length) return null;

  return (
    <>
      <View style={s.artistsRow}>
        {artists.map((a) => {
          const imageUri = resolveArtistImageUri(a);
          const metaLabel = resolveArtistMeta(a);

          return (
            <AnimatedPressable
              key={a.id}
              style={s.artistCard}
              onPress={() => router.push(resolveUserRoute(a) as never)}
            >
              <View style={s.artistImgWrap}>
                <Image
                  source={
                    imageUri
                      ? { uri: imageUri }
                      : require("../../../assets/images/icon.png")
                  }
                  style={s.artistImg}
                  contentFit="cover"
                  transition={180}
                />
              </View>
              <Text numberOfLines={1} style={s.artistName}>
                {a.displayName}
              </Text>
              {metaLabel ? (
                <Text numberOfLines={1} style={s.artistFollowers}>
                  {metaLabel}
                </Text>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={s.followRow}>
        {artists.map((a) => {
          const isFollowed = followed.has(a.id);
          return (
            <AnimatedPressable
              key={a.id}
              onPress={() => {
                if (isFollowed) hapticSelection();
                else hapticSuccess();
                onToggleFollow(a.id);
              }}
              style={[
                s.followPill,
                isFollowed ? s.followPillActive : s.followPillIdle,
              ]}
            >
              {isFollowed ? (
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={tokens.colors.accent}
                />
              ) : null}
              <Text style={[s.followLabel, isFollowed && s.followLabelActive]}>
                {isFollowed ? "Following" : "Follow"}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  artistsRow: { flexDirection: "row", gap: 12 },
  artistCard: { flex: 1, alignItems: "center" },
  artistImgWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  artistImg: { width: "100%", height: "100%" },
  artistName: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  artistFollowers: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  followRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  followPill: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  followPillIdle: { backgroundColor: tokens.colors.bgElevated },
  followPillActive: {
    backgroundColor: "rgba(0,179,166,0.10)",
    borderWidth: 1.5,
    borderColor: tokens.colors.accent,
  },
  followLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  followLabelActive: { color: tokens.colors.accent },
});
