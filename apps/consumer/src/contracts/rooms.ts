export interface RoomState {
  id: number;
  uuid: string;
  status: string;
  awakened_at: number | null;
  awakened_by_kind: string | null;
  claim_state: string;
  visibility: string;
  moderation_state: string;
  created: number;
}

export interface RoomRelease {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  public_id: string | null;
  artist: {
    id: number;
    uuid: string;
    username: string;
    display_name: string;
  } | null;
}

export interface RoomClockTrackEntry {
  index: number;
  track_id: number;
  track_ref_id?: number;
  track_uuid: string;
  title: string;
  duration: number;
  duration_seconds?: number;
  starts_at: number;
  starts_at_seconds?: number;
  ends_at: number;
  ends_at_seconds?: number;
}

export interface RoomClockState {
  clock_origin_at: number;
  server_time: number;
  total_duration_seconds: number;
  release_position_seconds: number;
  track_ref_id: number | null;
  track_position_seconds: number;
  track_index: number;
  loop_number: number;
  track_map: RoomClockTrackEntry[];
}

export interface RoomCapabilities {
  can_enter_room: boolean;
  can_play_full_release: boolean;
  can_show_presence: boolean;
  can_show_time_machine: boolean;
  can_request_claim: boolean;
  can_request_artist_keys: boolean;
  can_view_artist_keys_status: boolean;
  can_manage_room: boolean;
  can_activate_support: boolean;
  can_show_support: boolean;
  can_send_support: boolean;
  can_view_support_goal: boolean;
  can_react: boolean;
  can_show_reactions: boolean;
  can_comment: boolean;
  can_manage_qna_moment?: boolean;
  can_submit_qna_question?: boolean;
  can_view_qna?: boolean;
  can_accept_support: boolean;
  can_artist_drop_in: boolean;
  can_pin_message: boolean;
  can_moderate_chat: boolean;
  can_view_artist_presence: boolean;
}

export interface RoomArtistKeysStatus {
  claim_state: string;
  payout_authorization_state: string;
  request: {
    id: number;
    uuid: string;
    requested_role: string;
    status: string;
    created: number;
    changed: number;
  } | null;
}

export interface RoomEntryResponse {
  room: RoomState;
  release: RoomRelease;
  clock: RoomClockState | null;
  capabilities: RoomCapabilities;
  artist_keys_status: RoomArtistKeysStatus | null;
}

export type PublicRoomDiscoveryFilter =
  | "all"
  | "latest_activity"
  | "artist_in_room"
  | "artist_was_here"
  | "with_history"
  | "support_active"
  | "recently_awakened";

export interface PublicRoomSummary {
  room_id: number;
  room_route: string;
  release_ref_type: string;
  release_ref_id: number;
  release_identifier: string;
  release_title: string;
  artist_name: string;
  artist_username: string | null;
  artwork_url: string | null;
  room_status: string;
  claim_state: string;
  visibility: string;
  moderation_state: string;
  has_room?: boolean;
  has_visits?: boolean;
  visit_count?: number | null;
  awakened_at: number | null;
  last_visited_at?: number | null;
  last_activity_at: number | null;
  last_meaningful_event_type: string | null;
  active_presence_count: number | null;
  artist_presence_state: string | null;
  has_artist_entered: boolean;
  has_artist_pin: boolean;
  support_enabled: boolean;
  support_goal_cents: number | null;
  support_total_cents: number;
  support_goal_reached: boolean;
  primary_room_badge: string;
  secondary_room_badge: string | null;
  state_line: string;
  room_summary_text?: string;
  entry_cta_label: string;
  capabilities: {
    can_enter_room: boolean;
    can_show_support?: boolean;
    can_view_support_goal?: boolean;
  };
}

export interface PublicRoomList {
  rooms: PublicRoomSummary[];
  meta: {
    filter?: string;
    artist?: string;
    total: number;
    hasMore: boolean;
  };
}

export interface RoomClockResponse {
  clock: RoomClockState;
}

export type RoomPresencePrivacy = "visible" | "anonymous" | "hidden";

export interface RoomPresenceSummaryEntry {
  sessionKey: string;
  uid: string;
  actorUid: string | null;
  actorType: "user" | "anonymous";
  displayName: string | null;
  avatarUrl: string | null;
  visibility: string;
}

export type RoomChatSenderRole = "fan" | "artist" | "moderator" | "admin";
export type RoomChatVisibility = "public" | "deleted" | "hidden";
export type RoomChatModerationState = "visible" | "hidden";

export interface RoomChatMessage {
  id: string;
  schemaVersion: number;
  messageId: string;
  roomId: string;
  senderUserId: number | null;
  senderUid: string;
  senderUuid: string;
  senderUsername: string | null;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  senderRole: RoomChatSenderRole;
  messageText: string;
  createdAt: unknown;
  loopNumber: number | null;
  releasePositionSeconds: number | null;
  trackRefId: string | number | null;
  trackPositionSeconds: number | null;
  visibility: RoomChatVisibility;
  moderationState: RoomChatModerationState;
}

export interface RoomQnaState {
  enabled: boolean;
  activeQuestionId: string | null;
  openCount: number;
  answeredCount: number;
  updatedAt?: unknown;
}

export interface RoomQnaQuestion {
  id: string;
  authorDisplayName: string;
  text: string;
  answerText: string | null;
  votes: number;
  status: "new" | "active" | "answered" | "archived" | "flagged";
  visibility: "public" | "private";
  createdAt: number;
  answeredAt: number | null;
  activeAt: number | null;
}

export interface RoomQuestionPayload {
  id: string;
  author_display_name: string;
  text: string;
  answer_text?: string | null;
  votes: number;
  status: RoomQnaQuestion["status"];
  visibility?: string;
  created_at: number;
  answered_at: number | null;
  active_at: number | null;
}

export interface RoomQuestionsResponse {
  qna?: {
    enabled?: boolean;
    active_question_id?: string | null;
    open_count?: number;
    answered_count?: number;
  };
  questions?: RoomQuestionPayload[];
  question?: RoomQuestionPayload;
}

export interface RoomPollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface RoomActivePollState {
  activePollId: string | null;
  status: "active" | "closed";
  question: string | null;
  options: RoomPollOption[];
  totalVotes: number;
  revealResultsAfterVote: boolean;
  viewerVoteOptionId: string | null;
  updatedAt?: unknown;
}

export interface RoomPollProjection {
  id: string;
  question: string;
  status: "active" | "closed";
  options: RoomPollOption[];
  totalVotes: number;
  revealResultsAfterVote: boolean;
  viewerVoteOptionId: string | null;
  createdAt: number;
  closedAt: number | null;
  updatedAt?: unknown;
}

export interface RoomPollPayloadOption {
  id: string;
  text: string;
  vote_count: number;
}

export interface RoomPollPayload {
  id: string;
  question: string;
  status: "active" | "closed";
  reveal_results_after_vote: boolean;
  total_votes: number;
  viewer_vote_option_id: string | null;
  options: RoomPollPayloadOption[];
  created_at: number;
  closed_at: number | null;
}

export interface RoomPollsResponse {
  active_poll?: RoomPollPayload | null;
  closed_polls?: RoomPollPayload[];
  poll?: RoomPollPayload | null;
}

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

export interface RoomMomentSource {
  kind: RoomMomentSourceKind;
  url?: string;
  providerRoomId?: string;
}

export interface RoomMomentState {
  momentId: string;
  roomId: string;
  type: RoomMomentType;
  presentation: RoomMomentPresentation;
  status: RoomMomentStatus;
  actorUid: string;
  title: string | null;
  description: string | null;
  source: RoomMomentSource;
  metadata: Record<string, unknown> | null;
  startedAt: number;
  endedAt: number | null;
  expiresAt: number | null;
  priority: number;
  audioBehavior: RoomMomentAudioBehavior;
  duckVolume: number | null;
  fadeDurationMs: number | null;
}

export const ROOM_REACTION_TYPES = [
  "fire",
  "felt_this",
  "replay",
  "favorite",
  "this_part",
] as const;

export type RoomReactionType = (typeof ROOM_REACTION_TYPES)[number];

export interface RoomReactionEntry {
  id?: string;
  uid: string;
  reactionType: RoomReactionType;
  visibility: "anonymous" | "visible";
  createdAt: unknown;
  releasePositionSeconds?: number;
  trackRefId?: string | number | null;
  trackPositionSeconds?: number | null;
  loopNumber?: number | null;
  roomId?: string;
}

export interface RoomSupportStats {
  totalAmountCents: number;
  backerCount: number;
  goalCents: number | null;
  updatedAt?: unknown;
}

export interface RoomActivityItem {
  event_id: number;
  event_uuid: string;
  event_type: "support_sent" | "support_goal_reached";
  occurred_at: number;
  copy: string;
  privacy: {
    public_name: boolean;
    show_amount: boolean;
  };
}

export interface RoomActivityResponse {
  room_id: number;
  items: RoomActivityItem[];
  meta: {
    latest_event_id: number;
    count: number;
  };
}

export interface RoomSupportStatus {
  room_id: number;
  total_support_amount_cents: number;
  backer_count: number;
  support_goal_cents: number | null;
}

export interface RoomSupportBalance {
  available_amount_cents: number;
  reserved_amount_cents: number;
  spent_amount_cents: number;
  currency: string;
}

export interface RoomSupportStatusResult {
  support_status: RoomSupportStatus;
  support_balance: RoomSupportBalance | null;
}

export type RoomSupportPaymentMethod = "direct_stripe" | "user_support_balance";

export interface RoomSupportSendResponse {
  support: {
    uuid: string;
    room_id: number;
    support_amount_cents: number;
    currency: string;
    payment_method?: RoomSupportPaymentMethod;
    payment_reference?: string | null;
    status: string;
    public_name: boolean;
    show_amount: boolean;
  };
  session?: {
    id: string;
    url: string;
    status: string;
    paymentStatus: string;
    mode: string;
  };
  support_status?: RoomSupportStatus;
  support_balance?: RoomSupportBalance | null;
  reused: boolean;
}

export interface RoomArtistPresenceState {
  roomId: string;
  actorUid: number | null;
  sessionId: string | null;
  isActive: boolean;
  enteredAt: number | null;
  lastSeenAt: number | null;
  expiresAt: number | null;
  leftAt: number | null;
}

export interface RoomPinnedNoteState {
  isPinned: boolean;
  messageText: string | null;
  pinnedAt: number | null;
  pinnedByUid: number | null;
}

export interface RoomPinnedMessageState {
  isPinned: boolean;
  chatMessageId: string | null;
  messageText: string | null;
  pinnedAt: number | null;
  pinnedBy: {
    uid: string | null;
    displayName: string | null;
    role: string | null;
  } | null;
  author: {
    uid: string | null;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string | null;
  } | null;
}

export interface RoomModerationProjection {
  roomId: string;
  targetUid: string;
  isMuted: boolean;
  isBlocked: boolean;
  mutedUntil: number | null;
  moderationId: string;
  source: "drupal";
  reason: string | null;
  actorUid: string;
  updatedAt: number;
  version: number;
}

export interface RoomTimeMachineSummary {
  total_entries: number;
  total_reactions: number;
  awakened_at: number | null;
  is_claimed: boolean;
}

export interface RoomTimeMachineHighlight {
  type: string;
  template: string;
  occurred_at: number;
  metadata: {
    track_ref_id?: number;
    reaction_count?: number;
    count?: number;
    loop_number?: number;
  };
}

export interface RoomTimeMachineResponse {
  room_id: number;
  summary: RoomTimeMachineSummary;
  highlights: RoomTimeMachineHighlight[];
}

export interface RoomLiveVideoTokenResponse {
  provider: "livekit";
  url: string;
  token: string;
  roomName: string;
  participantIdentity: string;
  role: "audience";
  canPublishAudio: false;
  canPublishVideo: false;
  canPublishData: false;
  expiresAt: number;
}

export interface MobileRoomStateSnapshot {
  presence: RoomPresenceSummaryEntry[];
  chat: RoomChatMessage[];
  reactions: RoomReactionEntry[];
  qna: RoomQnaState | null;
  questions: RoomQnaQuestion[];
  activePoll: RoomActivePollState | null;
  polls: RoomPollProjection[];
  supportStats: RoomSupportStats | null;
  artistPresence: RoomArtistPresenceState | null;
  activeMoment: RoomMomentState | null;
  pinnedNote: RoomPinnedNoteState | null;
  pinnedMessage: RoomPinnedMessageState | null;
  moderation: RoomModerationProjection | null;
}
