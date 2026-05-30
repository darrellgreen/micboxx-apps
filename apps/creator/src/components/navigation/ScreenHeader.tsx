import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LetterTabIcon } from "@/components/icons/LetterTabIcon";
import { useAccountDrawer } from "@/components/navigation/account-drawer";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";
import { tokens } from "@micboxx/theme";

const LOGO_HEIGHT = 28;
const LOGO_WIDTH = 120;

interface ScreenHeaderProps {
  /** Show the MicBoxx logo + wordmark (default: true) */
  showLogo?: boolean;
  /** Optional title text (replaces logo when provided) */
  title?: string;
  /** Optional smaller context text under the title. */
  subtitle?: string;
  /** Render custom content between the title/logo and right controls. */
  centerContent?: ReactNode;
  /** Render custom content on the right side. */
  rightContent?: ReactNode;
  /** Optional right icon behavior */
  rightIconName?: ComponentProps<typeof Ionicons>["name"];
  onRightPress?: () => void;
  rightBadgeCount?: number;
  onAvatarPress?: () => void;
}

export function ScreenHeader({
  showLogo = true,
  title,
  subtitle,
  centerContent,
  rightContent,
  rightIconName = "notifications-outline",
  onRightPress,
  rightBadgeCount,
  onAvatarPress,
}: ScreenHeaderProps) {
  const { openDrawer } = useAccountDrawer();
  const unreadNotificationCount = useUnreadNotificationCount();
  const handleRightPress =
    onRightPress ??
    (() => router.push("/audience/notifications"));
  const handleInboxPress =
    onAvatarPress ??
    (() => router.push("/audience/inbox"));
  const resolvedRightBadgeCount =
    typeof rightBadgeCount === "number"
      ? rightBadgeCount
      : rightIconName === "notifications-outline"
        ? unreadNotificationCount
        : 0;

  return (
    <View style={s.container}>
      <AnimatedPressable
        style={s.menuButton}
        hitSlop={8}
        onPress={openDrawer}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel="Open creator menu"
      >
        <Ionicons name="menu-outline" size={23} color={tokens.colors.textPrimary} />
      </AnimatedPressable>

      <View style={s.identity}>
        {centerContent ? (
          centerContent
        ) : title ? (
          <View style={s.titleStack}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={s.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : showLogo ? (
          <Image
            source={require("../../../assets/images/micboxx-logo.png")}
            style={s.logoIcon}
            contentFit="contain"
          />
        ) : null}
      </View>

      <View style={s.rightControls}>
        {rightContent ? (
          rightContent
        ) : (
          <AnimatedPressable
            style={s.iconButton}
            hitSlop={8}
            onPress={handleRightPress}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
          >
            <Ionicons
              name={rightIconName}
              size={20}
              color={tokens.colors.textPrimary}
            />
            <View style={s.badgeWrap} pointerEvents="none">
              <UnreadBadge count={resolvedRightBadgeCount} />
            </View>
          </AnimatedPressable>
        )}

        <AnimatedPressable
          style={s.avatarButton}
          hitSlop={8}
          onPress={handleInboxPress}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel="Open inbox"
        >
          <LetterTabIcon size={20} color={tokens.colors.textPrimary} />
        </AnimatedPressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 2,
    paddingVertical: 10,
  },
  logoIcon: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  titleStack: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  rightControls: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
  },
  badgeWrap: {
    position: "absolute",
    top: 2,
    right: 1,
  },
});
