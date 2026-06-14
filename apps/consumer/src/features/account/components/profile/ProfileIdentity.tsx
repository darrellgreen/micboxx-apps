import { Ionicons } from "@expo/vector-icons";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { useFollowedUsers } from "@/features/social/hooks/useFollowedUsers";
import type { DashboardUserProfile } from "../../api";

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `${value}`;
}

interface ProfileIdentityProps {
  profile: Pick<DashboardUserProfile, "displayName" | "username" | "bio" | "links">;
}

export function ProfileIdentity({ profile }: ProfileIdentityProps) {
  const { followerCount, followingCount } = useFollowedUsers();
  const { website, instagram, facebook, twitter } = profile.links;
  const hasSocials = website || instagram || facebook || twitter;

  return (
    <View style={s.identity}>
      <Text style={s.displayName}>{profile.displayName}</Text>
      <View style={s.handleRow}>
        <Text style={s.handle}>@{profile.username}</Text>
        <Text style={s.handle}> · {formatCompactCount(followerCount)} followers · {formatCompactCount(followingCount)} following</Text>
      </View>
      {profile.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
      {hasSocials ? (
        <View style={s.socials}>
          {website && (
            <TouchableOpacity onPress={() => void Linking.openURL(website)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={s.socialLinkText} numberOfLines={1}>{website.replace(/^https?:\/\//, "")}</Text>
            </TouchableOpacity>
          )}
          {instagram && (
            <TouchableOpacity onPress={() => void Linking.openURL(instagram)}>
              <Text style={s.socialLinkText} numberOfLines={1}>{instagram.replace(/^https?:\/\//, "")}</Text>
            </TouchableOpacity>
          )}
          {facebook && (
            <TouchableOpacity onPress={() => void Linking.openURL(facebook)}>
              <Text style={s.socialLinkText} numberOfLines={1}>{facebook.replace(/^https?:\/\//, "")}</Text>
            </TouchableOpacity>
          )}
          {twitter && (
            <TouchableOpacity onPress={() => void Linking.openURL(twitter)}>
              <Text style={s.socialLinkText} numberOfLines={1}>{twitter.replace(/^https?:\/\//, "")}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  identity: { gap: 4, paddingBottom: 8 },
  listenerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    marginBottom: 6,
  },
  listenerBadgeText: { color: tokens.colors.accent, fontSize: 12, fontWeight: "800" },
  displayName: { color: tokens.colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 30 },
  handleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 },
  handle: { color: tokens.colors.textSecondary, fontSize: 14 },
  bio: { color: tokens.colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 8 },
  socials: { gap: 4, marginTop: 12 },
  socialLinkText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "500" },
});
