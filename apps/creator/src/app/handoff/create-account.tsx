import { useEffect } from "react";
import { Linking, StyleSheet, Text } from "react-native";

import { getCreatorSignupUrl } from "@/shared/api/external-links";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

export default function CreateAccountHandoffScreen() {
  const url = getCreatorSignupUrl();

  useEffect(() => {
    if (url) {
      void Linking.openURL(url);
    }
  }, [url]);

  return (
    <ScreenShell
      title="Create account"
      subtitle="MicBoxx creator registration stays on the web in v1."
    >
      <Panel title="Open web signup">
        <Text style={styles.copy}>
          We opened the creator signup flow in your browser. Return here after
          account creation to sign in with OAuth.
        </Text>
        <Text style={styles.meta}>{url ?? "Creator signup URL is not configured."}</Text>
        {url ? (
          <PillButton
            label="Open again"
            tone="accent"
            onPress={() => void Linking.openURL(url)}
          />
        ) : null}
      </Panel>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
