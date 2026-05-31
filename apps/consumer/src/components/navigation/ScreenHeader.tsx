import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { useAccountDrawer } from "@/components/navigation/account-drawer";
import { AnimatedPressable } from "@micboxx/ui";
import { useAuth } from "@/features/auth/provider";
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
  /** Optional supporting line under the title */
  subtitle?: string;
  /** Left drawer button treatment */
  leftIcon?: "account" | "menu";
  /** Render custom content on the right side */
  rightContent?: React.ReactNode;
  /** Optional right icon behavior */
  rightIconName?: ComponentProps<typeof Ionicons>["name"];
  onRightPress?: () => void;
  rightBadgeCount?: number;
}

export function ScreenHeader({
  showLogo = true,
  title,
  subtitle,
  leftIcon = "account",
  rightContent,
  rightIconName = "notifications-outline",
  onRightPress,
  rightBadgeCount,
}: ScreenHeaderProps) {
  const { session } = useAuth();
  const { openDrawer } = useAccountDrawer();
  const unreadNotificationCount = useUnreadNotificationCount();
  const handleRightPress =
    onRightPress ??
    (() =>
      router.push({
        pathname: "/account/[slug]",
        params: { slug: "notifications" },
      }));
  const resolvedRightBadgeCount =
    typeof rightBadgeCount === "number"
      ? rightBadgeCount
      : rightIconName === "notifications-outline"
        ? unreadNotificationCount
        : 0;

  const center = title ? (
    <View style={s.titleBlock}>
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
  ) : null;

  return (
    <View style={s.container}>
      {/* Absolutely centered title block */}
      <View style={s.centerOverlay} pointerEvents="none">
        {center}
      </View>

      {/* Left drawer button */}
      <AnimatedPressable style={s.iconBtn} hitSlop={6} onPress={openDrawer} haptic="selection">
        {leftIcon === "menu" ? (
          <Ionicons
            name="menu-outline"
            size={22}
            color={tokens.colors.textSecondary}
          />
        ) : session ? (
          <Text style={s.avatarInitial}>
            {(
              session.user.displayName?.[0] ?? session.user.username[0]
            ).toUpperCase()}
          </Text>
        ) : (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
        )}
      </AnimatedPressable>

      <View style={s.spacer} />

      {/* Right icon */}
      {rightContent ? (
        rightContent
      ) : (
        <AnimatedPressable style={s.iconBtn} hitSlop={6} onPress={handleRightPress} haptic="selection">
          <Ionicons
            name={rightIconName}
            size={20}
            color={tokens.colors.textSecondary}
          />
          <View style={s.badgeWrap} pointerEvents="none">
            <UnreadBadge count={resolvedRightBadgeCount} />
          </View>
        </AnimatedPressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
  logoIcon: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  titleBlock: {
    maxWidth: "66%",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  badgeWrap: {
    position: "absolute",
    top: -4,
    right: -4,
  },
});
