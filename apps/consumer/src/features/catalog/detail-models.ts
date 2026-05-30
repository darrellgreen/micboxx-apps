import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type {
    PublicAlbumPage,
    PublicArtistPage,
    PublicArtistSummary,
    PublicPlaylist,
    PublicPlaylistPage,
    PublicTrackPage,
} from "@micboxx/contracts";

export type PublicUserSummary = PublicArtistSummary;
export type PublicUserPage = PublicArtistPage;

export type TrackDetailPayload = PublicTrackPage;
export type AlbumDetailPayload = PublicAlbumPage;
export type PlaylistDetailPayload = PublicPlaylistPage;
export type UserDetailPayload = PublicUserPage;

export interface TrackDetailRouteParams {
  slug: string;
}

export interface AlbumDetailRouteParams {
  slug: string;
}

export interface PlaylistDetailRouteParams {
  slug: string;
}

export interface UserDetailRouteParams {
  username: string;
}

export type AccessState =
  | "playable"
  | "owned"
  | "subscriber_locked"
  | "purchase_available"
  | "sign_in_required"
  | "unavailable";

export type AccessActionType =
  | "play"
  | "open_checkout"
  | "open_subscription"
  | "sign_in"
  | "none";

export interface AccessCtaModel {
  accessState: AccessState;
  ctaLabel: string;
  actionType: AccessActionType;
  destination: string | null;
  handoffUrl: string | null;
  refreshPolicy: "none" | "on_focus" | "after_web_return";
  helperText?: string | null;
}

export type DetailActionTone = "primary" | "secondary" | "ghost" | "danger";

export interface DetailActionItem {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tone?: DetailActionTone;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}

export interface DetailActionBarProps {
  primary: DetailActionItem;
  secondary?: DetailActionItem;
  supporting?: DetailActionItem[];
}

export type RelatedLaneEntityType = "track" | "album" | "playlist" | "user";

export interface RelatedLaneItem {
  key: string;
  entityType: RelatedLaneEntityType;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  artworkUrl?: string | null;
  href: string;
}

export interface RelatedLaneModel {
  key: string;
  title: string;
  entityType: RelatedLaneEntityType;
  items: RelatedLaneItem[];
  emptyState?: {
    title: string;
    body?: string;
  };
}

export type PlaylistSummaryLike = PublicPlaylist;
