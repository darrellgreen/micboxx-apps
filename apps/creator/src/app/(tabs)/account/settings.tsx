import { useAuth } from "@/features/auth/provider";
import { Panel, PillButton } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";

export default function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <Screen
      header={<AppHeader variant="detail" title="Settings" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      <Panel title="Session">
        <PillButton label="Sign out" tone="accent" onPress={() => void signOut()} />
      </Panel>
    </Screen>
  );
}
