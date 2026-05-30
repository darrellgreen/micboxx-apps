import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Avatar } from "@/components/ui/avatar";
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

export default function AccountScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(tabs)/home");
    } catch {
      // Ignore sign-out errors
    }
  };

  const navItems: AccountNavItem[] = [
    {
      key: "library",
      label: "Library",
      subtitle: "Saved music, purchases, playlists, and recent plays",
      icon: "library-outline",
      action: () => router.push("/(tabs)/library" as never),
      requiresAuth: true,
    },
    {
      key: "messages",
      label: "Messages",
      subtitle: "Direct messages and conversations",
      icon: "mail-outline",
      route: "/messages",
      requiresAuth: true,
    },
    {
      key: "purchases",
      label: "Purchases",
      subtitle: "Owned music and receipts",
      icon: "bag-handle-outline",
      route: "/account/purchases",
      requiresAuth: true,
    },
    {
      key: "notifications",
      label: "Notifications",
      subtitle: "Likes, follows, and activity",
      icon: "notifications-outline",
      route: "/account/notifications",
      requiresAuth: true,
    },
    {
      key: "premium",
      label: "Subscription",
      subtitle: "View plans and manage membership",
      icon: "diamond-outline",
      action: () => router.push("/(tabs)/premium" as never),
    },
    {
      key: "settings",
      label: "Settings",
      subtitle: "Playback, privacy, and preferences",
      icon: "settings-outline",
      route: "/account/settings",
    },
    {
      key: "help",
      label: "Help",
      subtitle: "Support and troubleshooting",
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
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        {session ? (
          <AnimatedPressable
            onPress={() =>
              router.push({
                pathname: "/account/[slug]",
                params: { slug: "profile" },
              })
            }
            haptic="selection"
            style={styles.profileCard}
          >
            <Avatar
              uri={session.user.avatarUrl}
              displayName={session.user.displayName}
              size={56}
            />
            <View style={styles.profileCopy}>
              <Text style={styles.profileName} numberOfLines={1}>
                {session.user.displayName}
              </Text>
              <Text style={styles.profileHandle} numberOfLines={1}>
                @{session.user.username}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Listener</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={tokens.colors.textSecondary}
            />
          </AnimatedPressable>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIconWrap}>
              <Ionicons
                name="person-circle-outline"
                size={48}
                color={tokens.colors.textSecondary}
              />
            </View>
            <Text style={styles.guestTitle}>Welcome to MicBoxx</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to manage your playlists, purchases, and subscription.
            </Text>
            <AnimatedPressable
              onPress={() => router.push("/sign-in")}
              scaleValue={0.95}
              style={styles.signInButton}
            >
              <Text style={styles.signInButtonLabel}>Sign in</Text>
            </AnimatedPressable>
          </View>
        )}

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

        {/* Sign Out */}
        {session && (
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 16,
  },

  // Profile card (signed in)
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 18,
  },
  profileCopy: { flex: 1, gap: 2 },
  profileName: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  profileHandle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
  },
  roleBadgeText: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  // Guest card
  guestCard: {
    alignItems: "center",
    gap: 10,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 28,
  },
  guestIconWrap: { marginBottom: 2 },
  guestTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  guestSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  signInButton: {
    marginTop: 6,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
  },
  signInButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Navigation
  navSection: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    overflow: "hidden",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
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
