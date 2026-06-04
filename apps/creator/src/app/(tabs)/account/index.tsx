import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Screen, AnimatedPressable, Avatar } from "@micboxx/ui";
import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { tokens } from "@micboxx/theme";

type AccountNavItem = {
  key: string;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  route: string;
};

export default function AccountHomeScreen() {
  const bootstrap = useCreatorBootstrap();

  const navItems: AccountNavItem[] = [
    {
      key: "profile",
      label: "Profile",
      subtitle: "Name, bio, links, and public creator identity",
      icon: "person-circle-outline",
      route: "/account/profile",
    },
    {
      key: "media",
      label: "Media",
      subtitle: "Update the visual identity shown across MicBoxx",
      icon: "image-outline",
      route: "/account/media",
    },
    {
      key: "verification",
      label: "Verification",
      subtitle: "Status, eligibility, and creator badge request",
      icon: "checkmark-circle-outline",
      route: "/account/verification",
    },
    {
      key: "plan",
      label: "Plan",
      subtitle: "Current creator plan and monetization access",
      icon: "diamond-outline",
      route: "/account/plan",
    },
    {
      key: "revenue",
      label: "Revenue snapshot",
      subtitle: "Gross revenue and top earning releases",
      icon: "cash-outline",
      route: "/account/revenue",
    },
    {
      key: "settings",
      label: "Settings",
      subtitle: "Session controls and creator app preferences",
      icon: "settings-outline",
      route: "/account/settings",
    },
    {
      key: "support",
      label: "Support",
      subtitle: "Support handoff and policy links",
      icon: "help-circle-outline",
      route: "/account/support",
    },
  ];

  return (
    <Screen contentContainerStyle={styles.scroll}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          title="Account"
          subtitle="Profile, settings, and creator access"
        />
      </View>
        <AnimatedPressable
          onPress={() => router.push("/account/profile")}
          haptic="selection"
          style={styles.profileCard}
        >
          <Avatar
            uri={bootstrap.profile?.avatarUrl}
            displayName={bootstrap.profile?.displayName ?? "Creator"}
            size={56}
          />
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>
              {bootstrap.profile?.displayName ?? "Creator"}
            </Text>
            <Text style={styles.profileHandle} numberOfLines={1}>
              @{bootstrap.profile?.username ?? "creator"}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Creator</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={tokens.colors.textSecondary}
          />
        </AnimatedPressable>

        <View style={styles.snapshotRow}>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>
              {bootstrap.analytics?.overview.planLabel ?? "Unknown"}
            </Text>
            <Text style={styles.snapshotLabel}>Plan</Text>
          </View>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>
              {bootstrap.profile?.verification.status ?? "Unknown"}
            </Text>
            <Text style={styles.snapshotLabel}>Verification</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          {navItems.map((item) => (
            <AnimatedPressable
              key={item.key}
              onPress={() => router.push(item.route as never)}
              haptic="selection"
              style={styles.navRow}
            >
              <View style={styles.navIconWrap}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={tokens.colors.textPrimary}
                />
              </View>
              <View style={styles.navCopy}>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Text style={styles.navSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={tokens.colors.textSecondary}
              />
            </AnimatedPressable>
          ))}
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 10,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    padding: 12,
  },
  profileCopy: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  profileHandle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radiusSystem.pill,
    backgroundColor: tokens.colors.accentDim,
  },
  roleBadgeText: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  snapshotRow: {
    flexDirection: "row",
    gap: 8,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: tokens.colors.surfacePrimary,
    borderRadius: tokens.radiusSystem.container,
    borderColor: tokens.colors.borderStrong,
    padding: 12,
    gap: 4,
  },
  snapshotValue: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  snapshotLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  navSection: {
    gap: 6,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: tokens.colors.surfaceInline,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    padding: 12,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: tokens.radiusSystem.control,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  navCopy: {
    flex: 1,
    gap: 2,
  },
  navLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  navSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
