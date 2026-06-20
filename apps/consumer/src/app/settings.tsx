import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable, Screen } from "@micboxx/ui";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { useAuth } from "@/features/auth/provider";
import { tokens } from "@micboxx/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Navigation item type ───────────────────────────────────────────────────

interface AccountNavItem {
  key: string;
  label: string;
  subtitle: string;
  icon: IoniconName;
  route?: string;
  action?: () => void;
  requiresAuth?: boolean;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  const handleSignOut = () => {
    void signOut();
  };

  const navItems: AccountNavItem[] = [
    {
      key: "account",
      label: "Account & Security",
      subtitle: "Email, sign-in, and account management",
      icon: "person-circle-outline",
      route: "/account",
      requiresAuth: true,
    },
    {
      key: "settings-notifications",
      label: "Notification Settings",
      subtitle: "Control push notification delivery preferences",
      icon: "notifications-outline",
      route: "/account/settings-notifications",
      requiresAuth: true,
    },
    {
      key: "settings-playback",
      label: "Playback & Content Settings",
      subtitle: "Autoplay previews and explicit content filtering",
      icon: "musical-notes-outline",
      route: "/account/settings-playback",
    },
    {
      key: "subscription",
      label: "Subscriptions",
      subtitle: "Membership, plan status, and premium listening access",
      icon: "diamond-outline",
      route: "/account/subscription",
      requiresAuth: true,
    },
    {
      key: "help",
      label: "Help & Support",
      subtitle: "Support, troubleshooting, and platform guidance",
      icon: "help-circle-outline",
      route: "/account/help",
    },
  ];

  const handleNavPress = (item: AccountNavItem) => {
    if (item.action) {
      item.action();
      return;
    }

    if (item.requiresAuth && !session) {
      router.push("/sign-in");
      return;
    }

    if (item.route) {
      router.push(item.route as never);
    }
  };

  return (
    <Screen
      header={
        <DetailRouteHeader
          title="Settings"
          fallbackRoute="/(tabs)/profile"
        />
      }
      contentContainerStyle={styles.scroll}
    >


        {/* Navigation Items */}
        <View style={styles.navSection}>
          {navItems.map((item) => (
            <AnimatedPressable
              key={item.key}
              onPress={() => handleNavPress(item)}
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

        {/* Auth Actions */}
        {session ? (
          <AnimatedPressable
            onPress={() => void handleSignOut()}
            haptic="selection"
            style={styles.signOutRow}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={tokens.colors.danger}
            />
            <Text style={styles.signOutLabel}>Sign out</Text>
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            onPress={() => router.push("/sign-in")}
            haptic="selection"
            style={styles.signOutRow}
          >
            <Ionicons
              name="log-in-outline"
              size={22}
              color={tokens.colors.accent}
            />
            <Text style={[styles.signOutLabel, { color: tokens.colors.accent }]}>Sign in</Text>
          </AnimatedPressable>
        )}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 16,
  },

  // Navigation
  navSection: {
    // borderless & transparent container
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  navIconWrap: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  navCopy: { flex: 1, gap: 2 },
  navLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  navSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },

  // Sign out
  signOutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  signOutLabel: {
    color: tokens.colors.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
