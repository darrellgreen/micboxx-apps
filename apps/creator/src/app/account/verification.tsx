import { useState } from "react";
import { Text } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { requestArtistVerification } from "@/shared/api/creator-dashboard";
import { ErrorText } from "@/shared/ui/form";
import { KeyValueRow, Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function VerificationScreen() {
  const bootstrap = useCreatorBootstrap();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      await requestArtistVerification();
      await bootstrap.refetch();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Verification request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      header={<AppHeader variant="detail" title="Verification" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="Status">
        <KeyValueRow label="Status" value={bootstrap.profile?.verification.status ?? "Unknown"} />
        <KeyValueRow label="Eligible" value={bootstrap.profile?.verification.eligible ? "Yes" : "No"} />
        <KeyValueRow label="Can request" value={bootstrap.profile?.verification.canRequest ? "Yes" : "No"} />
        {bootstrap.profile?.verification.reason ? <Text style={{ color: "#A9B4C0" }}>{bootstrap.profile.verification.reason}</Text> : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={submitting ? "Submitting…" : "Request verification"} tone="accent" onPress={() => void handleRequest()} />
      </Panel>
    </Screen>
  );
}
