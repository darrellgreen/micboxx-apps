import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function CreateSuccessScreen() {
  const { entityType, entityId } = useLocalSearchParams<{
    entityType?: string;
    entityId?: string;
  }>();
  const bootstrap = useCreatorBootstrap();

  useEffect(() => {
    if (entityType === "track") {
      void bootstrap.markOnboardingComplete();
      void bootstrap.refetch();
    }
  }, [bootstrap, entityType]);

  if (!entityType || !entityId) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <ScreenShell title="Success" subtitle="The creator flow completed and the next actions are ready.">
      <Panel
        title={`${entityType === "track" ? "Track" : "Release"} ready`}
        description={`MicBoxx created ${entityType} #${entityId}.`}
      >
        <PillButton label="Go to Dashboard" tone="accent" onPress={() => router.replace("/dashboard")} />
        <PillButton label="Open Catalog" onPress={() => router.replace("/catalog")} />
      </Panel>
    </ScreenShell>
  );
}
