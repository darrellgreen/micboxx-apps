import { router } from "expo-router";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function DashboardActivityScreen() {
  const bootstrap = useCreatorBootstrap();

  return (
    <Screen
      header={<AppHeader variant="detail" title="Activity" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {bootstrap.dashboardBuckets.activity.map((card) => (
        <Panel key={card.key} title={card.title} description={card.description}>
          <PillButton label="Open" tone="accent" onPress={() => router.push(card.href as never)} />
        </Panel>
      ))}
    </Screen>
  );
}
