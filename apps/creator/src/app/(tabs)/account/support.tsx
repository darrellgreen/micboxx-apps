import { Linking, Text } from "react-native";

import { getLegalUrl, getSupportUrl } from "@/shared/api/external-links";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function SupportScreen() {
  const supportUrl = getSupportUrl();
  const legalUrl = getLegalUrl();

  return (
    <Screen
      header={<AppHeader variant="detail" title="Support" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="Support">
        <Text style={{ color: "#A9B4C0" }}>{supportUrl ?? "Support URL is not configured."}</Text>
        {supportUrl ? <PillButton label="Open support" tone="accent" onPress={() => void Linking.openURL(supportUrl)} /> : null}
      </Panel>
      <Panel title="Legal">
        <Text style={{ color: "#A9B4C0" }}>{legalUrl ?? "Legal URL is not configured."}</Text>
        {legalUrl ? <PillButton label="Open legal" onPress={() => void Linking.openURL(legalUrl)} /> : null}
      </Panel>
    </Screen>
  );
}
