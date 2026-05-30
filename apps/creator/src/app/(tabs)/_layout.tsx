import { Redirect, Tabs } from "expo-router";

import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreatorEntryHref } from "@/features/bootstrap/routes";
import { CreatorTabBar } from "@/shared/navigation/creator-tab-bar";
import {
  CREATOR_TAB_META,
  CREATOR_TAB_ORDER,
  CREATOR_TAB_ROUTE_NAMES,
} from "@/shared/navigation/creator-tabs";
import { LoadingScreen } from "@/shared/ui/loading-screen";

export default function TabsLayout() {
  const { session, isHydrating } = useAuth();
  const bootstrap = useCreatorBootstrap();

  if (isHydrating || bootstrap.loading) {
    return <LoadingScreen />;
  }

  const entryHref = resolveCreatorEntryHref({
    hasSession: Boolean(session),
    accessState: bootstrap.accessState,
    onboardingState: bootstrap.onboardingState,
    createEntryTarget: bootstrap.createEntryTarget,
  });
  if (entryHref !== "/dashboard") {
    return <Redirect href={entryHref} />;
  }

  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <CreatorTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      {CREATOR_TAB_ORDER.map((key) => (
        <Tabs.Screen
          key={key}
          name={CREATOR_TAB_ROUTE_NAMES[key]}
          options={{ title: CREATOR_TAB_META[key].title }}
        />
      ))}
    </Tabs>
  );
}
