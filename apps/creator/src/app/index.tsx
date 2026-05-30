import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreatorEntryHref } from "@/features/bootstrap/routes";
import { LoadingScreen } from "@/shared/ui/loading-screen";

export default function IndexScreen() {
  const { session, isHydrating } = useAuth();
  const bootstrap = useCreatorBootstrap();

  if (isHydrating || bootstrap.loading) {
    return <LoadingScreen />;
  }

  return (
    <Redirect
      href={resolveCreatorEntryHref({
        hasSession: Boolean(session),
        accessState: bootstrap.accessState,
        onboardingState: bootstrap.onboardingState,
        createEntryTarget: bootstrap.createEntryTarget,
      })}
    />
  );
}
