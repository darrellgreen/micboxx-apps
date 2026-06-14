import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MicboxxTabBar } from "@/components/navigation/tab-bar";
import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";
import { tokens } from "@micboxx/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <MicboxxTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.textPrimary,
        tabBarInactiveTintColor: tokens.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: tokens.colors.bgSurface,
          borderTopWidth: 0,
          height: tokens.tabBar.height + insets.bottom,
          paddingBottom: Math.max(8, insets.bottom),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "home") {
            return <Ionicons name="compass-outline" size={size} color={color} />;
          }
          if (route.name === "search") {
            return <Ionicons name="search-outline" size={size} color={color} />;
          }
          if (route.name === "rooms") {
            return <SoundwaveTabIcon size={size} color={color} />;
          }
          if (route.name === "premium") {
            return <Ionicons name="diamond-outline" size={size} color={color} />;
          }
          if (route.name === "library") {
            return <Ionicons name="library-outline" size={size} color={color} />;
          }
          if (route.name === "profile") {
            return <Ionicons name="person-outline" size={size} color={color} />;
          }
          return <Ionicons name="ellipse-outline" size={size} color={color} />;
        },
      })}
    >
      {/* Hidden redirect — sends "/" to home */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {/* Profile — user's own profile, hidden from bottom tabs */}
      <Tabs.Screen name="profile" options={{ title: "Profile", href: null }} />
      {/* Discover — personalised "For You" tab */}
      <Tabs.Screen name="home" options={{ title: "Discover" }} />
      {/* Search — Solr-backed catalog search with autocomplete */}
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      {/* Rooms — public live release rooms */}
      <Tabs.Screen name="rooms" options={{ title: "Rooms" }} />
      {/* Premium — membership hub, plan browsing, tier status */}
      <Tabs.Screen name="premium" options={{ title: "Premium" }} />
      {/* Library — user's music library */}
      <Tabs.Screen name="library" options={{ title: "Library" }} />
    </Tabs>
  );
}
