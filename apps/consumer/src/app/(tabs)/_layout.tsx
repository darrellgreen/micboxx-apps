import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={() => null}
      screenOptions={{ headerShown: false }}
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
