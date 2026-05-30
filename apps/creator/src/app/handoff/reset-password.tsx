import { useEffect } from "react";
import { Linking, StyleSheet, Text } from "react-native";

import { getPasswordResetUrl } from "@/shared/api/external-links";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

export default function ResetPasswordHandoffScreen() {
  const url = getPasswordResetUrl();

  useEffect(() => {
    if (url) {
      void Linking.openURL(url);
    }
  }, [url]);

  return (
    <ScreenShell
      title="Reset password"
      subtitle="Password recovery stays on the MicBoxx web flow in v1."
    >
      <Panel title="Open password reset">
        <Text style={styles.copy}>
          We opened the MicBoxx login and password reset surface in your
          browser. After resetting your password, return to sign in here.
        </Text>
        <Text style={styles.meta}>{url ?? "Password reset URL is not configured."}</Text>
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
