import { Linking, Text } from "react-native";

import { getLegalUrl, getSupportUrl } from "@/shared/api/external-links";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function SupportScreen() {
  const supportUrl = getSupportUrl();
  const legalUrl = getLegalUrl();

  return (
    <ScreenShell title="Support and legal" subtitle="External handoffs for support, policy, and creator agreement surfaces.">
      <Panel title="Support">
        <Text style={{ color: "#A9B4C0" }}>{supportUrl ?? "Support URL is not configured."}</Text>
        {supportUrl ? <PillButton label="Open support" tone="accent" onPress={() => void Linking.openURL(supportUrl)} /> : null}
      </Panel>
      <Panel title="Legal">
        <Text style={{ color: "#A9B4C0" }}>{legalUrl ?? "Legal URL is not configured."}</Text>
        {legalUrl ? <PillButton label="Open legal" onPress={() => void Linking.openURL(legalUrl)} /> : null}
      </Panel>
    </ScreenShell>
  );
}
