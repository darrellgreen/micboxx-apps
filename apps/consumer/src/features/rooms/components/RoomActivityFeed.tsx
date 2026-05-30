import { StyleSheet, Text, View } from "react-native";

import type { RoomActivityResponse, RoomTimeMachineResponse } from "@/contracts/rooms";
import { tokens } from "@/theme/tokens";

export function RoomActivityFeed({
  activity,
  timeMachine,
  canShowTimeMachine,
}: {
  activity: RoomActivityResponse | null;
  timeMachine: RoomTimeMachineResponse | null;
  canShowTimeMachine: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Activity</Text>
      {(activity?.items ?? []).slice(0, 5).map((item) => (
        <Text key={item.event_uuid} style={styles.item}>{item.copy}</Text>
      ))}
      {activity && activity.items.length === 0 ? <Text style={styles.empty}>No support activity yet.</Text> : null}
      {canShowTimeMachine ? (
        <View style={styles.memory}>
          <Text style={styles.memoryTitle}>Time Machine</Text>
          <Text style={styles.memoryText}>
            {timeMachine
              ? `${timeMachine.summary.total_entries} memories · ${timeMachine.summary.total_reactions} reactions`
              : "Room history will appear when available."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, padding: 16, borderRadius: 8, backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle, gap: 8 },
  title: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  item: { color: tokens.colors.textPrimary, fontSize: 13, lineHeight: 18 },
  empty: { color: tokens.colors.textSecondary, fontSize: 13 },
  memory: { marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.borderSubtle },
  memoryTitle: { color: tokens.colors.accent, fontSize: 12, fontWeight: "800" },
  memoryText: { color: tokens.colors.textSecondary, fontSize: 13, marginTop: 3 },
});
