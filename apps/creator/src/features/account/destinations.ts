import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import type { MicboxxSessionUser } from "@micboxx/contracts";

export type AccountDestinationSlug =
  | "profile"
  | "notifications"
  | "library"
  | "purchases"
  | "subscription"
  | "help"
  | "settings";

type DrawerIconName = ComponentProps<typeof Ionicons>["name"];

export interface AccountDestinationMeta {
  title: string;
  subtitle: string;
  icon: DrawerIconName;
  signedInDescription: string;
  guestDescription: string;
}

export const ACCOUNT_DESTINATIONS: Record<
  AccountDestinationSlug,
  AccountDestinationMeta
> = {
  profile: {
    title: "Profile",
    subtitle: "Identity, public presence, and account details",
    icon: "person-circle-outline",
    signedInDescription:
      "This is the right place for your public MicBoxx identity, creator badge, and account details.",
    guestDescription:
      "Sign in to see your profile, account identity, and public presence on MicBoxx.",
  },
  notifications: {
    title: "Notifications",
    subtitle: "Replies, releases, follows, and account activity",
    icon: "notifications-outline",
    signedInDescription:
      "Use notifications as your account activity hub for replies, follows, release updates, and quick routing back into the right surface.",
    guestDescription:
      "Sign in to tie account activity and notification controls to your MicBoxx identity.",
  },
  library: {
    title: "Library",
    subtitle: "Saved music, playlists, and listening history",
    icon: "library-outline",
    signedInDescription:
      "Use library as the account-level home for recent listening, saved music, and the routes you return to most.",
    guestDescription:
      "Sign in to keep a persistent library across MicBoxx sessions while still browsing discovery as a guest.",
  },
  purchases: {
    title: "Purchases",
    subtitle: "Owned music, receipts, and purchase history",
    icon: "bag-handle-outline",
    signedInDescription:
      "Use purchases as your commerce hub for owned music, receipts, and routes into purchasable catalog surfaces.",
    guestDescription:
      "Sign in to connect owned purchases and paid catalog access to your MicBoxx account.",
  },
  subscription: {
    title: "Subscription",
    subtitle: "Membership, plan status, and billing",
    icon: "card-outline",
    signedInDescription:
      "Use subscription to manage premium listening access and the routes connected to your membership state.",
    guestDescription:
      "Sign in to connect premium listening and subscription controls to your account.",
  },
  help: {
    title: "Help",
    subtitle: "Support, reporting issues, and platform guidance",
    icon: "help-circle-outline",
    signedInDescription:
      "Use help for support guidance, troubleshooting routes, and quick links into the surface that matches the problem.",
    guestDescription:
      "Help and support live here, whether you are signed in or browsing as a guest.",
  },
  settings: {
    title: "Settings",
    subtitle: "Playback, privacy, appearance, and account preferences",
    icon: "settings-outline",
    signedInDescription:
      "Use settings for active preferences, account controls, and quick links into related account routes.",
    guestDescription:
      "Settings remains the right place for app preferences even when you are browsing as a guest.",
  },
};

/**
 * In the listener-only app, all users are listeners.
 * Creator detection is reserved for the future MicBoxx Artist app.
 */
export function isCreatorUser(
  _user: MicboxxSessionUser | null | undefined,
): boolean {
  return false;
}

export function getUserRoleLabel(
  user: MicboxxSessionUser | null | undefined,
): string {
  if (!user) {
    return "Guest";
  }

  return "Listener";
}
