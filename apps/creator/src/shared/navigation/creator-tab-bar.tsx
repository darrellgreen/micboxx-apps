import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddSquareTabIcon } from "@/components/icons/AddSquareTabIcon";
import { HomeTabIcon } from "@/components/icons/HomeTabIcon";
import { LibraryTabIcon } from "@/components/icons/LibraryTabIcon";
import { PieChartTabIcon } from "@/components/icons/PieChartTabIcon";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
    CREATOR_TAB_META,
    CREATOR_TAB_ORDER,
    CREATOR_TAB_ROUTE_NAMES,
    type CreatorTabKey,
} from "@/shared/navigation/creator-tabs";
import { tokens } from "@micboxx/theme";

const SHOW_CREATOR_TAB_LABELS = false;

function isCreatorTab(routeName: string): routeName is CreatorTabKey {
  return CREATOR_TAB_ORDER.includes(routeName as CreatorTabKey);
}

function normalizeRouteName(routeName: string): string {
  return routeName
    .replace(/^\(tabs\)\//, "")
    .replace(/\/index$/, "");
}

function resolveCreatorTabKey(routeName: string): CreatorTabKey | null {
  const normalized = normalizeRouteName(routeName);

  for (const key of CREATOR_TAB_ORDER) {
    const tabRouteName = CREATOR_TAB_ROUTE_NAMES[key];
    if (
      routeName === tabRouteName ||
      normalized === normalizeRouteName(tabRouteName)
    ) {
      return key;
    }
  }

  if (isCreatorTab(normalized)) {
    return normalized;
  }

  const parts = normalized.split("/");
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    if (isCreatorTab(part)) {
      return part;
    }
  }

  return null;
}

export function CreatorTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const keyedRoutes = new Map<CreatorTabKey, (typeof state.routes)[number]>();
  for (const route of state.routes) {
    const key = resolveCreatorTabKey(route.name);
    if (key && !keyedRoutes.has(key)) {
      keyedRoutes.set(key, route);
    }
  }

  const visibleRoutes = CREATOR_TAB_ORDER.map((key) => keyedRoutes.get(key)).filter(
    (route): route is (typeof state.routes)[number] => Boolean(route),
  );

  const fallbackRoutes =
    visibleRoutes.length > 0
      ? visibleRoutes
      : state.routes.filter((route) => normalizeRouteName(route.name) !== "index");

  const focusedKey = resolveCreatorTabKey(state.routes[state.index]?.name ?? "");

  const renderTab = (route: (typeof fallbackRoutes)[number]) => {
    const routeKey = resolveCreatorTabKey(route.name);
    const isFocused = routeKey != null && focusedKey === routeKey;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <SideTabButton
        key={route.key}
        routeName={route.name}
        tabKey={routeKey}
        focused={isFocused}
        onPress={onPress}
      />
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>{fallbackRoutes.map(renderTab)}</View>
    </View>
  );
}

function SideTabButton({
  routeName,
  tabKey,
  focused,
  onPress,
}: {
  routeName: string;
  tabKey: CreatorTabKey | null;
  focused: boolean;
  onPress: () => void;
}) {
  const focusProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, focused]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [0.66, 1]),
    transform: [
      { translateY: interpolate(focusProgress.value, [0, 1], [0, -0.5]) },
    ],
  }));

  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={styles.tab}>
      <Animated.View style={iconStyle}>
        <TabIcon tabKey={tabKey} focused={focused} />
      </Animated.View>
      {SHOW_CREATOR_TAB_LABELS ? (
        <Animated.Text style={styles.label}>
          {tabKey ? CREATOR_TAB_META[tabKey].title : normalizeRouteName(routeName)}
        </Animated.Text>
      ) : null}
    </AnimatedPressable>
  );
}

function TabIcon({
  tabKey,
  focused,
}: {
  tabKey: CreatorTabKey | null;
  focused: boolean;
}) {
  const color = focused ? "#F5F8FF" : "rgba(216, 223, 238, 0.52)";
  const iconSize = tokens.iconSizes.large;

  if (tabKey === "dashboard") {
    return <HomeTabIcon size={iconSize} color={color} />;
  }

  if (tabKey === "catalog") {
    return <LibraryTabIcon size={iconSize} color={color} />;
  }

  if (tabKey === "rooms") {
    return (
      <Ionicons
        name="radio-outline"
        size={iconSize}
        color={color}
      />
    );
  }

  if (tabKey === "create") {
    return <AddSquareTabIcon size={iconSize} color={color} />;
  }

  if (tabKey === "analytics") {
    return <PieChartTabIcon size={iconSize} color={color} />;
  }

  return (
    <Ionicons
      name="ellipse-outline"
      size={iconSize}
      color={color}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colors.bgSurface,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    minHeight: 60,
    paddingHorizontal: 10,
    backgroundColor: tokens.colors.bgSurface,
  },
  tab: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    color: "rgba(216, 223, 238, 0.52)",
    fontSize: 10,
    fontWeight: "500",
  },
});
