/**
 * Custom bottom tab bar with a raised centre Home button.
 */
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrowserIcon } from "@/components/icons/BrowserIcon";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { tokens } from "@micboxx/theme";

const LABEL_MAP: Record<string, string> = {
  library: "Library",
  search: "Search",
  home: "Home",
  premium: "Premium",
  account: "Account",
};

export function MicboxxTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Only render routes that appear in LABEL_MAP (filters out hidden redirect routes)
  const visibleRoutes = state.routes.filter((r) => r.name in LABEL_MAP);
  const homeRouteIndex = visibleRoutes.findIndex((r) => r.name === "home");
  const centerIndex =
    homeRouteIndex >= 0 ? homeRouteIndex : Math.floor(visibleRoutes.length / 2);
  const centerRoute = visibleRoutes[centerIndex];
  const sideRoutes = visibleRoutes.filter((route) => route.name !== centerRoute?.name);
  const leftRoutes = sideRoutes.slice(0, Math.ceil(sideRoutes.length / 2));
  const rightRoutes = sideRoutes.slice(Math.ceil(sideRoutes.length / 2));

  const renderTab = (route: (typeof visibleRoutes)[number]) => {
    const isFocused = state.routes[state.index]?.name === route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TabButton
        key={route.key}
        routeName={route.name}
        focused={isFocused}
        onPress={onPress}
      />
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <BlurView intensity={70} tint="dark" style={styles.blur}>
        <View style={styles.bar}>
          <View style={styles.sideGroup}>{leftRoutes.map(renderTab)}</View>
          <View style={styles.centerSlot} />
          <View style={styles.sideGroup}>{rightRoutes.map(renderTab)}</View>
        </View>
      </BlurView>
      {centerRoute ? (
        <View pointerEvents="box-none" style={styles.centerOverlay}>
          <CenterTabButton
            focused={state.routes[state.index]?.name === centerRoute.name}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: centerRoute.key,
                canPreventDefault: true,
              });
              if (
                state.routes[state.index]?.name !== centerRoute.name &&
                !event.defaultPrevented
              ) {
                navigation.navigate(centerRoute.name);
              }
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

function TabButton({
  routeName,
  focused,
  onPress,
}: {
  routeName: string;
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
      { translateY: interpolate(focusProgress.value, [0, 1], [0, -1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focusProgress.value,
      [0, 1],
      ["rgba(216, 223, 238, 0.52)", "#F5F8FF"],
    ),
    opacity: interpolate(focusProgress.value, [0, 1], [0.85, 1]),
    transform: [{ translateY: interpolate(focusProgress.value, [0, 1], [0, -1]) }],
  }));

  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={styles.tab}>
      <Animated.View style={iconStyle}>
        <TabIcon routeName={routeName} focused={focused} />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>
        {LABEL_MAP[routeName] ?? routeName}
      </Animated.Text>
    </AnimatedPressable>
  );
}

function CenterTabButton({
  focused,
  onPress,
}: {
  focused: boolean;
  onPress: () => void;
}) {
  const focusProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [tokens.colors.accent, tokens.colors.accentStrong],
    ),
    shadowOpacity: interpolate(focusProgress.value, [0, 1], [0.3, 0.45]),
    shadowRadius: interpolate(focusProgress.value, [0, 1], [18, 24]),
    elevation: interpolate(focusProgress.value, [0, 1], [10, 14]),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(focusProgress.value, [0, 1], [0, -1]) }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.93}
      style={styles.centerButtonPressable}
    >
      <Animated.View style={[styles.centerButton, animatedStyle]}>
        <Animated.View style={iconStyle}>
          <Image
            source={require("../../../assets/images/fav.png")}
            style={styles.homeFav}
          />
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}

function TabIcon({
  routeName,
  focused,
}: {
  routeName: string;
  focused: boolean;
}) {
  const color = focused ? "#F5F8FF" : "rgba(216, 223, 238, 0.52)";

  if (routeName === "library") {
    return <BrowserIcon size={20} color={color} />;
  }
  if (routeName === "search") {
    return <Ionicons name="search-outline" size={20} color={color} />;
  }
  if (routeName === "premium") {
    return <Ionicons name="diamond-outline" size={20} color={color} />;
  }
  if (routeName === "account") {
    return <Ionicons name="person-circle-outline" size={20} color={color} />;
  }

  return <Ionicons name="home-outline" size={20} color={color} />;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  blur: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(136, 152, 193, 0.18)",
    backgroundColor: "rgba(17, 24, 48, 0.72)",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: tokens.tabBar.height + 2,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    color: "rgba(216, 223, 238, 0.52)",
    fontSize: 10,
    fontWeight: "500",
  },
  homeFav: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
    resizeMode: "contain",
  },
  centerSlot: {
    width: tokens.tabBar.centerButtonSize + 28,
    height: "100%",
  },
  centerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    bottom: 24,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
    borderWidth: 5,
    borderColor: tokens.colors.bgSurface,
    marginTop: -26,
    shadowColor: tokens.colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  centerButtonPressable: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
});
