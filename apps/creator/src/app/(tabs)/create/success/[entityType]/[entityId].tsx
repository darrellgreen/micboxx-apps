import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

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
    <Screen
      header={<AppHeader variant="detail" title="Upload Complete" fallbackRoute="/(tabs)/create" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel
        title={`${entityType === "track" ? "Track" : "Release"} ready`}
        description={`MicBoxx created ${entityType} #${entityId}.`}
      >
        <PillButton label="Go to Dashboard" tone="accent" onPress={() => router.replace("/dashboard")} />
        <PillButton label="Open Catalog" onPress={() => router.replace("/catalog")} />
      </Panel>
    </Screen>
  );
}
