import { useAuth } from "@/features/auth/provider";
import { Panel, PillButton, ScreenShell } from "@/shared/ui/layout";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <ScreenShell title="Settings" subtitle="System configuration and session controls.">
      <Panel title="Session">
        <PillButton label="Sign out" tone="accent" onPress={() => void signOut()} />
      </Panel>
    </ScreenShell>
  );
}
