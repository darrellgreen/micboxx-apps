import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { resolveOnboardingHref } from "@/features/bootstrap/routes";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

export default function OnboardingIntroScreen() {
  const bootstrap = useCreatorBootstrap();

  async function handleContinue() {
    await bootstrap.markIntroSeen();
    const nextState =
      bootstrap.onboardingState === "needs_intro"
        ? "needs_profile"
        : bootstrap.onboardingState;
    router.replace(resolveOnboardingHref(nextState, bootstrap.createEntryTarget));
  }

  return (
    <ScreenShell
      title="Welcome to MicBoxx Studio"
      subtitle="This app is designed for release management, audience activity, and creator account operations."
    >
      <Panel title="What happens here">
        <Text style={styles.copy}>
          Dashboard prioritizes what needs attention, Catalog manages tracks and
          albums, Create routes you to the right next action, Audience keeps
          inbox and notifications close, and Account holds your creator setup.
        </Text>
      </Panel>
      <PillButton label="Set up creator workspace" tone="accent" onPress={() => void handleContinue()} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
