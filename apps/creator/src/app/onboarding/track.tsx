import { Redirect, router } from "expo-router";
import { useEffect } from "react";
import { Text, StyleSheet } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ScreenShell, Panel, PillButton } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

export default function OnboardingTrackScreen() {
  const bootstrap = useCreatorBootstrap();
  const hasTracks = bootstrap.catalogReadiness.hasTracks;
  const markOnboardingComplete = bootstrap.markOnboardingComplete;

  useEffect(() => {
    if (hasTracks) {
      void markOnboardingComplete();
    }
  }, [hasTracks, markOnboardingComplete]);

  if (hasTracks) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <ScreenShell
      title="Upload first track"
      subtitle="Once your first upload exists, the creator shell unlocks and Dashboard takes over."
    >
      <Panel title="What happens next">
        <Text style={styles.copy}>
          After the first track is uploaded, the creator app stops using forced
          onboarding and shifts to dashboard task cards plus Create routing for
          any follow-up work.
        </Text>
      </Panel>
      <PillButton
        label="Start upload"
        tone="accent"
        onPress={() => router.push("/create")}
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
