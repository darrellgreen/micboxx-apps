import { Redirect } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreatorEntryHref } from "@/features/bootstrap/routes";
import {
  getCreatorUpgradeUrl,
  getSupportUrl,
} from "@/shared/api/external-links";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

export default function CreatorAccessScreen() {
  const { session, signOut } = useAuth();
  const bootstrap = useCreatorBootstrap();
  const entryHref = resolveCreatorEntryHref({
    hasSession: Boolean(session),
    accessState: bootstrap.accessState,
    onboardingState: bootstrap.onboardingState,
    createEntryTarget: bootstrap.createEntryTarget,
  });

  if (entryHref !== "/creator-access") {
    return <Redirect href={entryHref} />;
  }

  const upgradeUrl = getCreatorUpgradeUrl();
  const supportUrl = getSupportUrl();

  return (
    <ScreenShell
      title="Creator access required"
      subtitle="This mobile app is reserved for creator-capable MicBoxx accounts."
    >
      <Panel title="Why you are blocked">
        <Text style={styles.copy}>
          Your current account authenticated successfully, but it does not have
          creator-capable access on the MicBoxx dashboard surface yet.
        </Text>
        <Text style={styles.meta}>
          Upgrade URL: {upgradeUrl ?? "Not configured"}
        </Text>
        <Text style={styles.meta}>
          Support URL: {supportUrl ?? "Not configured"}
        </Text>
      </Panel>
      <View style={styles.actions}>
        <PillButton
          label="Upgrade on web"
          tone="accent"
          onPress={() => {
            if (upgradeUrl) {
              void Linking.openURL(upgradeUrl);
            }
          }}
        />
        <PillButton
          label="Contact support"
          onPress={() => {
            if (supportUrl) {
              void Linking.openURL(supportUrl);
            }
          }}
        />
        <PillButton
          label="Sign out"
          tone="subtle"
          onPress={() => void signOut()}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
