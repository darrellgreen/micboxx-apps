import { useState } from "react";
import { Text } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { requestArtistVerification } from "@/shared/api/creator-dashboard";
import { ErrorText } from "@/shared/ui/form";
import { KeyValueRow, Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

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
    <ScreenShell title="Verification" subtitle="Snapshot plus request action for creator verification.">
      <Panel title="Status">
        <KeyValueRow label="Status" value={bootstrap.profile?.verification.status ?? "Unknown"} />
        <KeyValueRow label="Eligible" value={bootstrap.profile?.verification.eligible ? "Yes" : "No"} />
        <KeyValueRow label="Can request" value={bootstrap.profile?.verification.canRequest ? "Yes" : "No"} />
        {bootstrap.profile?.verification.reason ? <Text style={{ color: "#A9B4C0" }}>{bootstrap.profile.verification.reason}</Text> : null}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PillButton label={submitting ? "Submitting…" : "Request verification"} tone="accent" onPress={() => void handleRequest()} />
      </Panel>
    </ScreenShell>
  );
}
