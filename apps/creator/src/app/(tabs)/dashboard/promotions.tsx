import { router } from "expo-router";
import { Text, View } from "react-native";

import { Panel, PillButton, ScreenShell, SectionTitle } from "@/shared/ui/layout";

export default function DashboardPromotionsScreen() {
  return (
    <ScreenShell
      title="Promotions"
      subtitle="Track-centered boost workspace for campaign funding and performance."
      actions={
        <PillButton
          label="Open monetization"
          tone="accent"
          onPress={() => router.push("/dashboard/monetization")}
        />
      }
    >
      <Panel
        title="Promotion workspace"
        description="Promotions parity has been added to mobile navigation and screen structure. Campaign APIs are next."
      >
        <Text style={{ color: "#A9B4C0", fontSize: 12, lineHeight: 17 }}>
          This screen mirrors the web dashboard route so creators have a dedicated
          place for boosts, active runs, and spend controls.
        </Text>
      </Panel>

      <SectionTitle title="Campaign surfaces" subtitle="Planned parity blocks." />

      <View style={{ gap: 8 }}>
        <Panel
          title="Active boosts"
          description="Running campaigns by track with remaining budget and delivery."
        />
        <Panel
          title="Draft campaigns"
          description="Prepared promotions waiting for funding or launch."
        />
        <Panel
          title="Recent results"
          description="Spend, reach, and conversion summary for completed boosts."
        />
      </View>
    </ScreenShell>
  );
}
