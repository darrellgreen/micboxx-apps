import type { RoomLiveVideoTokenResponse, RoomMomentState } from "@micboxx/contracts";

export interface LiveVideoTakeoverSurfaceProps {
  roomId: number | string;
  moment: RoomMomentState;
  artistName: string;
  accessToken?: string | null;
  enabled: boolean;
  onStatusMessage?: (message: string | null) => void;
}

export type LiveVideoTokenState = RoomLiveVideoTokenResponse | null;
