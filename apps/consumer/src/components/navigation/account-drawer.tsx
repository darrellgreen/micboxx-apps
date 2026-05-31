import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { AnimatedPressable } from "@micboxx/ui";
import { Avatar } from "@micboxx/ui";
import { Pill } from "@micboxx/ui";
import type { AccountDestinationSlug } from "@/features/account/destinations";
import { useAuth } from "@/features/auth/provider";
import { hapticLight } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

const DRAWER_WIDTH = Math.min(Dimensions.get("window").width * 0.84, 360);

interface AccountDrawerContextValue {
  openDrawer: () => void;
  closeDrawer: () => void;
}

interface DrawerItem {
  key: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  badgeCount?: number;
  requiresAuth?: boolean;
  destructive?: boolean;
}

const AccountDrawerContext = createContext<AccountDrawerContextValue | null>(
  null,
);

export function AccountDrawerProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    hapticLight();
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }

    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) {
        setIsMounted(false);
      }
    });
  }, [isOpen, progress]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const openAccountDestination = useCallback(
    (slug: AccountDestinationSlug, requiresAuth = true) => {
      closeDrawer();
      if (requiresAuth && !session) {
        router.push("/sign-in");
        return;
      }

      router.push({ pathname: "/account/[slug]", params: { slug } });
    },
    [closeDrawer, session],
  );

  const openRoute = useCallback(
    (href: string, requiresAuth = true) => {
      closeDrawer();
      if (requiresAuth && !session) {
        router.push("/sign-in");
        return;
      }

      router.push(href as never);
    },
    [closeDrawer, session],
  );

  const handleAuthAction = useCallback(async () => {
    closeDrawer();
    if (!session) {
      router.push("/sign-in");
      return;
    }

    try {
      await signOut();
      if (pathname.startsWith("/account")) {
        router.replace("/(tabs)/home");
      }
    } catch {
      router.push("/sign-in");
    }
  }, [closeDrawer, pathname, session, signOut]);

  const mainItems = useMemo<DrawerItem[]>(
    () => [
      {
        key: "messages",
        label: "Messages",
        icon: "mail-outline",
        onPress: () => openRoute("/messages"),
        requiresAuth: true,
      },
    ],
    [openRoute],
  );

  const accountItems = useMemo<DrawerItem[]>(() => {
    const items: DrawerItem[] = [];

    items.push({
      key: "subscription",
      label: "Subscriptions",
      icon: "card-outline",
      onPress: () => openAccountDestination("subscription"),
      requiresAuth: true,
    });

    return items;
  }, [openAccountDestination]);

  const supportItems = useMemo<DrawerItem[]>(() => {
    const items: DrawerItem[] = [
      {
        key: "settings",
        label: "Settings",
        subtitle: "Playback, privacy, and preferences",
        icon: "settings-outline",
        onPress: () => openAccountDestination("settings", false),
      },
      {
        key: "help",
        label: "Help",
        subtitle: "Support and troubleshooting",
        icon: "help-circle-outline",
        onPress: () => openAccountDestination("help", false),
      },
    ];

    if (session) {
      items.push({
        key: "logout",
        label: "Logout",
        icon: "log-out-outline",
        onPress: () => void handleAuthAction(),
        destructive: true,
      });
    }

    return items;
  }, [handleAuthAction, openAccountDestination, session]);

  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const panelTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH - 24, 0],
  });
  const contentOpacity = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, 1],
  });
  const contentTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  const contextValue = useMemo(
    () => ({ openDrawer, closeDrawer }),
    [closeDrawer, openDrawer],
  );

  return (
    <AccountDrawerContext.Provider value={contextValue}>
      {children}

      {isMounted ? (
        <View style={styles.overlayRoot} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
            <Animated.View
              style={[styles.scrim, { opacity: overlayOpacity }]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.panelWrap,
              { transform: [{ translateX: panelTranslateX }] },
            ]}
          >
            <SafeAreaView style={styles.panel} edges={["bottom"]}>
              <View
                style={[styles.panelContent, { paddingTop: Math.max(insets.top, 12) + 28 }]}
              >
                <Animated.View
                  style={{
                    flex: 1,
                    opacity: contentOpacity,
                    transform: [{ translateY: contentTranslateY }],
                  }}
                >
                <View style={styles.heroSection}>
                  <AnimatedPressable
                    onPress={() => openAccountDestination("profile", false)}
                    accessibilityRole="button"
                    accessibilityLabel="Open profile"
                    haptic="selection"
                    style={styles.heroIdentityButton}
                  >
                    <View style={styles.heroIdentityRow}>
                      {session ? (
                        <Avatar
                          uri={session.user.avatarUrl}
                          displayName={session.user.displayName}
                          size={60}
                        />
                      ) : (
                        <View style={styles.guestAvatar}>
                          <Svg
                            width={30}
                            height={30}
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <Circle
                              cx={12}
                              cy={6}
                              r={4}
                              stroke={tokens.colors.textSecondary}
                              strokeWidth={1.5}
                            />
                            <Path
                              d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z"
                              stroke={tokens.colors.textSecondary}
                              strokeWidth={1.5}
                            />
                          </Svg>
                        </View>
                      )}

                      <View style={styles.heroCopy}>
                        <Text style={styles.displayName} numberOfLines={1}>
                          {session?.user.displayName ?? "Welcome Guest"}
                        </Text>
                        <Text style={styles.handle} numberOfLines={1}>
                          {session
                            ? `@${session.user.username}`
                            : "Not Signed In"}
                        </Text>

                        <Pill
                          label="Listener"
                          active
                          variant="accent"
                          style={styles.rolePill}
                        />
                      </View>

                      <View style={styles.heroIdentityChevron}>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={tokens.colors.textSecondary}
                        />
                      </View>
                    </View>
                  </AnimatedPressable>
                </View>

                <ScrollView
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <DrawerSection title="Primary" variant="prominent">
                    {mainItems.map((item) => (
                      <DrawerItemRow
                        key={item.key}
                        item={item}
                        locked={Boolean(!session && item.requiresAuth)}
                        variant="prominent"
                      />
                    ))}
                  </DrawerSection>

                  <DrawerSection
                    title="Account"
                    variant="plain"
                  >
                    {accountItems.map((item) => (
                      <DrawerItemRow
                        key={item.key}
                        item={item}
                        locked={Boolean(!session && item.requiresAuth)}
                        variant="plain"
                      />
                    ))}
                  </DrawerSection>

                  <DrawerSection title="Support & Account" variant="plain">
                    {supportItems.map((item) => (
                      <DrawerItemRow
                        key={item.key}
                        item={item}
                        locked={Boolean(!session && item.requiresAuth)}
                        variant="plain"
                      />
                    ))}
                  </DrawerSection>
                </ScrollView>
                </Animated.View>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      ) : null}
    </AccountDrawerContext.Provider>
  );
}

export function useAccountDrawer(): AccountDrawerContextValue {
  const context = useContext(AccountDrawerContext);
  if (!context) {
    throw new Error(
      "useAccountDrawer must be used within AccountDrawerProvider.",
    );
  }

  return context;
}

function DrawerSection({
  title,
  variant = "plain",
  children,
}: PropsWithChildren<{ title: string; variant?: "prominent" | "plain" }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View
        style={[
          styles.sectionBody,
          variant === "prominent"
            ? styles.sectionBodyProminent
            : styles.sectionBodyPlain,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function DrawerItemRow({
  item,
  locked,
  variant,
}: {
  item: DrawerItem;
  locked: boolean;
  variant: "prominent" | "plain";
}) {
  return (
    <AnimatedPressable
      onPress={item.onPress}
      haptic="selection"
      style={[
        styles.itemRow,
        variant === "prominent" ? styles.itemRowProminent : styles.itemRowPlain,
      ]}
    >
      <View style={styles.itemIconWrap}>
        <Ionicons
          name={item.icon}
          size={23}
          color={
            item.destructive
              ? tokens.colors.danger
              : item.badgeCount && item.badgeCount > 0
                ? tokens.colors.accent
                : tokens.colors.textPrimary
          }
        />
      </View>

      <View style={styles.itemCopy}>
        <Text
          style={[
            styles.itemLabel,
            variant === "prominent"
              ? styles.itemLabelProminent
              : styles.itemLabelPlain,
            item.destructive && styles.itemLabelDanger,
          ]}
        >
          {item.label}
        </Text>
      </View>

      <View style={styles.itemTrailing}>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={tokens.colors.textSecondary}
        />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  scrim: {
    flex: 1,
    backgroundColor: tokens.colors.scrim,
  },
  panelWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
  },
  panel: {
    flex: 1,
    backgroundColor: tokens.colors.bgElevated,
    borderTopRightRadius: tokens.radii["3xl"],
    borderBottomRightRadius: tokens.radii["3xl"],
    paddingHorizontal: 20,
    ...tokens.shadows.md,
  },
  panelContent: {
    flex: 1,
  },
  heroSection: {
    gap: 10,
    paddingBottom: 22,
  },
  heroIdentityButton: {
    borderRadius: tokens.radii.xl,
    paddingVertical: 4,
    paddingRight: 6,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: tokens.colors.accentStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    gap: 3,
    paddingBottom: 4,
  },
  heroIdentityChevron: {
    width: 18,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  displayName: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "800",
  },
  handle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 27,
  } as ViewStyle,
  scrollContent: {
    paddingTop: 32,
    paddingBottom: 18,
    gap: 20,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    color: tokens.colors.textDisabled,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    paddingHorizontal: 2,
  },
  sectionBody: {
    borderRadius: tokens.radii["2xl"],
    overflow: "hidden",
  },
  sectionBodyProminent: {},
  sectionBodyPlain: {},
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 13,
  },
  itemRowProminent: {
    paddingVertical: 14,
  },
  itemRowPlain: {
    paddingVertical: 13,
  },
  itemIconWrap: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  itemCopy: {
    flex: 1,
    gap: 1,
  },
  itemLabel: {
    color: tokens.colors.textPrimary,
  },
  itemLabelProminent: {
    fontSize: 17,
    fontWeight: "800",
  },
  itemLabelPlain: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 10.5,
    lineHeight: 14,
  },
  itemTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemLabelDanger: {
    color: tokens.colors.danger,
  },
});
