import { router } from "expo-router";
import { Text, View } from "react-native";

import { Panel, PillButton, SectionTitle } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function DashboardPromotionsScreen() {
  return (
    <Screen
      header={<AppHeader variant="detail" title="Promotions" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <View>
        <PillButton
          label="Open monetization"
          tone="accent"
          onPress={() => router.push("/dashboard/monetization")}
        />
      </View>
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
    </Screen>
  );
}
