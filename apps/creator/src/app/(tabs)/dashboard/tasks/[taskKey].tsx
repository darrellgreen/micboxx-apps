import { useLocalSearchParams } from "expo-router";
import { Text, StyleSheet } from "react-native";

import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { EmptyState, Panel } from "@/shared/ui/layout";
import { AppHeader, Screen } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export default function DashboardTaskDetailScreen() {
  const { taskKey } = useLocalSearchParams<{ taskKey?: string }>();
  const bootstrap = useCreatorBootstrap();
  const task = bootstrap.dashboardBuckets.actionNeeded.find(
    (item) => item.key === taskKey,
  );

  return (
    <Screen
      header={<AppHeader variant="detail" title="Task" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={styles.screenContent}
    >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
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
