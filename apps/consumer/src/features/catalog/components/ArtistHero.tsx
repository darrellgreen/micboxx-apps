import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@micboxx/ui";
import { VerifiedBadge } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

interface ArtistHeroStat {
  key: string;
  label: string;
  onPress?: () => void;
}

interface ArtistHeroProps {
  name: string;
  username: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  descriptor?: string | null;
  followersLabel?: string | null;
  isVerified?: boolean;
  isFollowing?: boolean;
  isPlaying?: boolean;
  showFollow?: boolean;
  showStatsRow?: boolean;
  followDisabled?: boolean;
  followPending?: boolean;
  stats?: ArtistHeroStat[];
  onBack?: () => void;
  onPlay: () => void;
  onFollow: () => void;
  onMorePress: () => void;
}

const HERO_HEIGHT = 320;
const HERO_HEIGHT_FALLBACK = 280;
const AVATAR_SIZE = 96;
const HEADER_BAND_HEIGHT = 92;

export function ArtistHero({
  name,
  username,
  avatarUrl,
  coverUrl,
  descriptor,
  followersLabel,
  isVerified = false,
  isFollowing = false,
  isPlaying = false,
  showFollow = true,
  showStatsRow = false,
  followDisabled = false,
  followPending = false,
  stats = [],
  onBack,
  onPlay,
  onFollow,
  onMorePress,
}: ArtistHeroProps) {
  const insets = useSafeAreaInsets();
  const avatarSource = avatarUrl ?? coverUrl ?? null;
  const hasHeader = typeof onBack === "function";
  const headerHeight = hasHeader ? HEADER_BAND_HEIGHT + insets.top : 0;
  const detailLine = [descriptor ?? `@${username}`, followersLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <View
        style={[
          styles.container,
          { height: coverUrl ? HERO_HEIGHT : HERO_HEIGHT_FALLBACK },
        ]}
      >
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={styles.coverFallback} />
        )}

        <LinearGradient
          colors={[
            "rgba(0,0,0,0.06)",
            "rgba(0,0,0,0.24)",
            "rgba(0,0,0,0.58)",
            "rgba(0,0,0,0.88)",
          ]}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {hasHeader ? (
          <View
            style={[
              styles.topBar,
              {
                height: headerHeight,
                paddingTop: insets.top + 8,
              },
            ]}
          >
            <Pressable onPress={onBack} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={tokens.colors.textPrimary}
              />
            </Pressable>
          </View>
        ) : null}

        <View
          style={[
            styles.bottomContent,
            hasHeader
              ? {
                  top: headerHeight,
                  bottom: 0,
                }
              : styles.bottomContentDocked,
          ]}
        >
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              {avatarSource ? (
                <Image
                  source={{ uri: avatarSource }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackLabel}>
                    {name.slice(0, 1).toUpperCase() || "M"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <Text numberOfLines={1} style={styles.name}>
                  {name}
                </Text>
                {isVerified ? <VerifiedBadge size={20} /> : null}
              </View>

              {detailLine ? (
                <Text numberOfLines={1} style={styles.detailLine}>
                  {detailLine}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.actionsRow}>
            <AnimatedPressable
              onPress={onPlay}
              style={[styles.actionButton, styles.playButton]}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={16}
                color={tokens.colors.bgApp}
              />
              <Text style={styles.playButtonLabel}>
                {isPlaying ? "Pause" : "Play"}
              </Text>
            </AnimatedPressable>

            {showFollow ? (
              <AnimatedPressable
                disabled={followDisabled || followPending}
                onPress={onFollow}
                style={[
                  styles.actionButton,
                  styles.followButton,
                  (followDisabled || followPending) && styles.actionButtonDisabled,
                ]}
              >
                {followPending ? (
                  <ActivityIndicator
                    size="small"
                    color={tokens.colors.textPrimary}
                  />
                ) : (
                  <Ionicons
                    name={isFollowing ? "checkmark" : "person-add-outline"}
                    size={15}
                    color={tokens.colors.textPrimary}
                  />
                )}
                <Text style={styles.followButtonLabel}>
                  {followPending
                    ? "Updating"
                    : isFollowing
                      ? "Following"
                      : "Follow"}
                </Text>
              </AnimatedPressable>
            ) : null}

            <AnimatedPressable
              onPress={onMorePress}
              style={styles.moreButton}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={tokens.colors.textPrimary}
              />
            </AnimatedPressable>
          </View>

          {showStatsRow && stats.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
            >
              {stats.map((stat) => {
                const content = (
                  <View style={styles.statPill}>
                    <Text numberOfLines={1} style={styles.statLabel}>
                      {stat.label}
                    </Text>
                  </View>
                );

                if (!stat.onPress) {
                  return <View key={stat.key}>{content}</View>;
                }

                return (
                  <Pressable
                    key={stat.key}
                    onPress={stat.onPress}
                    style={({ pressed }) => [pressed && styles.pressed]}
                  >
                    {content}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radii.lg,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgSurface,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.colors.bgElevated,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 2,
    justifyContent: "flex-start",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(21,27,35,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bottomContent: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 16,
  },
  bottomContentDocked: {
    bottom: 0,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: tokens.colors.bgElevated,
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  avatarFallbackLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    fontWeight: "800",
  },
  identityCopy: {
    flex: 1,
    gap: 6,
    paddingBottom: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  detailLine: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  actionButtonDisabled: {
    opacity: 0.52,
  },
  playButton: {
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.cta,
  },
  playButtonLabel: {
    color: tokens.colors.bgApp,
    fontSize: 15,
    fontWeight: "800",
  },
  followButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  followButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  statsRow: {
    gap: 8,
    paddingRight: 10,
  },
  statPill: {
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statLabel: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
  },
});
