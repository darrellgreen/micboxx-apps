import { Redirect, router } from "expo-router";
import { Text, StyleSheet } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

export default function OnboardingAlbumScreen() {
  const bootstrap = useCreatorBootstrap();

  if (bootstrap.catalogReadiness.hasAlbums) {
    return <Redirect href="/onboarding/track" />;
  }

  return (
    <ScreenShell
      title="Create your first album"
      subtitle="MicBoxx is album-first today, so album setup comes before track upload."
    >
      <Panel title="Why this step matters">
        <Text style={styles.copy}>
          The current MicBoxx backend requires every uploaded track to belong to
          an album. Once the first album exists, Create can route you directly
          into upload.
        </Text>
      </Panel>
      <PillButton
        label="Create album"
        tone="accent"
        onPress={() => router.push("/create/album")}
      />
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
