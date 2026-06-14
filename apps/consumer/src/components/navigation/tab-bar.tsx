/**
 * Custom bottom tab bar with a plain five-tab layout.
 */
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
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

import { AnimatedPressable } from "@micboxx/ui";
import { SearchTabIcon } from "@/components/icons/SearchTabIcon";
import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";
import { VideoLibraryIcon } from "@/components/icons/VideoLibraryIcon";
import { tokens } from "@micboxx/theme";

const LABEL_MAP: Record<string, string> = {
  home: "Discover",
  search: "Search",
  rooms: "Rooms",
  premium: "Premium",
  library: "Library",
};
const TAB_ICON_SIZE = 28;
const TAB_BAR_HEIGHT = 60;
const TRACK_LISTING_SURFACE = "rgba(255,255,255,0.035)";

export function MicboxxTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Only render routes that appear in LABEL_MAP (filters out hidden redirect routes)
  const visibleRoutes = state.routes.filter((r) => r.name in LABEL_MAP);

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
    <View style={[styles.wrapper, { paddingBottom: Math.max(4, insets.bottom) }]}>
      <BlurView intensity={70} tint="dark" style={styles.blur}>
        <View style={styles.bar}>
          <View style={styles.tabGroup}>{visibleRoutes.map(renderTab)}</View>
        </View>
      </BlurView>
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
      { translateY: interpolate(focusProgress.value, [0, 1], [0, -0.5]) },
    ],
  }));

  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={styles.tab}>
      <Animated.View style={iconStyle}>
        <TabIcon routeName={routeName} focused={focused} />
      </Animated.View>
      <Animated.Text style={styles.label}>
        {LABEL_MAP[routeName] ?? routeName}
      </Animated.Text>
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

  if (routeName === "search") {
    return <SearchTabIcon size={TAB_ICON_SIZE} color={color} />;
  }
  if (routeName === "rooms") {
    return <SoundwaveTabIcon size={TAB_ICON_SIZE} color={color} />;
  }
  if (routeName === "premium") {
    return <Ionicons name="diamond-outline" size={TAB_ICON_SIZE} color={color} />;
  }
  if (routeName === "library") {
    return <VideoLibraryIcon size={TAB_ICON_SIZE} color={color} />;
  }

  return <Ionicons name="compass-outline" size={TAB_ICON_SIZE} color={color} />;
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
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: TRACK_LISTING_SURFACE,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 10,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    minHeight: TAB_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingBottom: 2,
  },
  label: {
    color: "rgba(216, 223, 238, 0.52)",
    fontSize: 10,
    fontWeight: "500",
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});
