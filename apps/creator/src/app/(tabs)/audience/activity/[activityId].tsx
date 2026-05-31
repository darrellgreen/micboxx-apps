import { useLocalSearchParams } from "expo-router";

import { useNotifications } from "@/features/social/hooks/useNotifications";
import { EmptyState, KeyValueRow, Panel, ScreenShell } from "@/shared/ui/layout";

export default function AudienceActivityDetailScreen() {
  const { activityId } = useLocalSearchParams<{ activityId?: string }>();
  const notifications = useNotifications(30);
  const item = notifications.items.find((entry) => entry.id === activityId);

  return (
    <ScreenShell title="Activity detail" subtitle="The underlying notification payload for this audience event.">
      {item ? (
        item.source === "social" ? (
          <Panel title={item.type} description={item.raw.messagePreview ?? item.raw.commentPreview ?? item.raw.trackTitle ?? "Creator activity"}>
            <KeyValueRow label="Actor" value={item.raw.actorDisplayName ?? item.raw.actorUsername ?? "Unknown"} />
            <KeyValueRow label="Track" value={item.raw.trackTitle ?? "N/A"} />
            <KeyValueRow label="Read" value={item.isRead ? "Yes" : "No"} />
          </Panel>
        ) : (
          <Panel title={item.type} description={item.label}>
            <KeyValueRow label="Room Type" value={item.roomType} />
            <KeyValueRow label="Read" value={item.isRead ? "Yes" : "No"} />
          </Panel>
        )
      ) : (
        <EmptyState title="Activity not found" description="This activity item is no longer in the current notification window." />
      )}
    </ScreenShell>
  );
}
