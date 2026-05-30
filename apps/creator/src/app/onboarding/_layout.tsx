import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreatorEntryHref } from "@/features/bootstrap/routes";
import { LoadingScreen } from "@/shared/ui/loading-screen";

export default function OnboardingLayout() {
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
  if (typeof entryHref === "string" && entryHref.startsWith("/onboarding/")) {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0D1117" },
        }}
      >
        <Stack.Screen name="intro" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="album" />
        <Stack.Screen name="track" />
      </Stack>
    );
  }

  return <Redirect href={entryHref} />;
}
