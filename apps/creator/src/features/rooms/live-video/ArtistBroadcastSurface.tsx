import type { RoomMomentState } from "@/features/rooms/types";
import { Panel } from "@/shared/ui/layout";

export function ArtistBroadcastSurface({
  enabled,
}: {
  roomId: number | string;
  moment: RoomMomentState | null;
  enabled: boolean;
  onEnded?: () => void;
}) {
  if (!enabled) {
    return null;
  }

  return (
    <Panel
      title="Live broadcast requires a native build"
      description="Camera and microphone publishing is available in the iOS or Android development build."
    />
  );
}
