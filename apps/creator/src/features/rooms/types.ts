import type { DashboardAlbum, DashboardRoomSummary } from "@/contracts/creator";

export type RoomMomentType =
  | "artist_video_drop_in"
  | "artist_audio_drop_in"
  | "pinned_message"
  | "qa_opened"
  | "poll_opened"
  | "support_goal_reached"
  | "release_announcement";

export type RoomMomentPresentation = "overlay" | "stage_takeover" | "banner";
export type RoomMomentStatus = "active" | "ended" | "expired" | "cancelled";
export type RoomMomentSourceKind = "mock_video" | "livekit_room" | "vod" | "image" | "none";
export type RoomMomentAudioBehavior = "continue" | "duck" | "pause";

export interface RoomMomentState {
  momentId: string;
  roomId: string;
  type: RoomMomentType;
  presentation: RoomMomentPresentation;
  status: RoomMomentStatus;
  actorUid: string;
  title: string | null;
  description: string | null;
  source: {
    kind: RoomMomentSourceKind;
    url?: string;
    providerRoomId?: string;
  };
  metadata: Record<string, unknown> | null;
  startedAt: number;
  endedAt: number | null;
  expiresAt: number | null;
  priority: number;
  audioBehavior: RoomMomentAudioBehavior;
  duckVolume: number | null;
  fadeDurationMs: number | null;
}

export interface RoomLiveVideoTokenResponse {
  provider: "livekit";
  url: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  role: "host" | "audience" | "guest";
  canPublishAudio: boolean;
  canPublishVideo: boolean;
  canPublishData: boolean;
  expiresAt: number;
}

export interface RoomQnaSnapshot {
  enabled: boolean;
  activeQuestionId: string | null;
  openCount: number;
  answeredCount: number;
  questionCount: number;
  questions: RoomQuestionSnapshotItem[];
}

export interface RoomQuestionSnapshotItem {
  id: string;
  authorDisplayName: string;
  text: string;
  votes: number;
  status: string;
  createdAt: number;
  answeredAt: number | null;
  answerText: string | null;
  visibility: string;
}

export interface RoomPollSnapshotOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface RoomPollSnapshot {
  activePollId: string | null;
  question: string | null;
  status: "active" | "closed" | "none";
  totalVotes: number;
  options: RoomPollSnapshotOption[];
  closedPollCount: number;
}

export interface RoomSupportSnapshot {
  enabled: boolean | null;
  totalAmountCents: number;
  backerCount: number;
  goalCents: number | null;
}

export interface RoomPresenceSummaryEntry {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeenAt: number | null;
}

export interface RoomPresenceSummary {
  activeCount: number;
  topAvatars: RoomPresenceSummaryEntry[];
  updatedAt: number | null;
}

export interface ArtistPresenceState {
  roomId: string;
  actorUid: number | null;
  sessionId: string | null;
  isActive: boolean;
  enteredAt: number | null;
  lastSeenAt: number | null;
  expiresAt: number | null;
  leftAt: number | null;
}

export interface CreatorRoomEntry {
  room: {
    id: number | string;
    awakened_at?: number | null;
  };
  capabilities?: {
    can_manage_room?: boolean;
    can_artist_drop_in?: boolean;
    can_manage_moments?: boolean;
    can_manage_qna_moment?: boolean;
    can_manage_poll_moment?: boolean;
    can_activate_support?: boolean;
    can_show_support?: boolean;
    can_send_support?: boolean;
    can_view_support_goal?: boolean;
    can_start_drop_in?: boolean;
    can_end_drop_in?: boolean;
    can_start_live_video?: boolean;
  };
  release?: {
    title?: string | null;
    slug?: string | null;
    public_id?: string | null;
  };
}

export type CreatorRoomListItem = DashboardRoomSummary;

export interface CreatorRoomDetail {
  album: DashboardAlbum;
  releaseIdentifier: string;
}
