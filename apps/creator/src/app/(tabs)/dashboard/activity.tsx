import { router } from "expo-router";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function DashboardActivityScreen() {
  const bootstrap = useCreatorBootstrap();

  return (
    <ScreenShell
      title="Activity detail"
      subtitle="Unread creator messages and notifications that need attention."
    >
      {bootstrap.dashboardBuckets.activity.map((card) => (
        <Panel key={card.key} title={card.title} description={card.description}>
          <PillButton label="Open" tone="accent" onPress={() => router.push(card.href as never)} />
        </Panel>
      ))}
    </ScreenShell>
  );
}
