import { useLocalSearchParams } from "expo-router";
import { Text, StyleSheet } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { EmptyState, Panel, ScreenShell } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

export default function DashboardTaskDetailScreen() {
  const { taskKey } = useLocalSearchParams<{ taskKey?: string }>();
  const bootstrap = useCreatorBootstrap();
  const task = bootstrap.dashboardBuckets.actionNeeded.find(
    (item) => item.key === taskKey,
  );

  return (
    <ScreenShell title="Task detail" subtitle="Operational creator work that MicBoxx surfaced from real state.">
      {task ? (
        <Panel title={task.title}>
          <Text style={styles.copy}>{task.description}</Text>
          <Text style={styles.meta}>Destination: {task.href}</Text>
        </Panel>
      ) : (
        <EmptyState
          title="Task not found"
          description="This task is no longer active or does not exist for the current creator state."
        />
      )}
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
  },
});
