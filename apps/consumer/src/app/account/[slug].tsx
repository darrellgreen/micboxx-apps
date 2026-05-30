import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  useMemo,
  useState,
  type ComponentProps,
  type Key,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TrackRow } from "@/components/discover";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { ShimmerPlaceholder } from "@/components/ui/shimmer-placeholder";
import { getFirebaseClientDb } from "@/config/firebase";
import type { PublicTrackSummary } from "@micboxx/contracts";
import type { SocialNotification } from "@micboxx/contracts";
import {
  ACCOUNT_DESTINATIONS,
  getUserRoleLabel,
  isCreatorUser,
  type AccountDestinationSlug,
} from "@/features/account/destinations";
import { useAccountPreferences } from "@/features/account/provider";
import { useAuth } from "@/features/auth/provider";
import { UnreadBadge } from "@/features/social/components/UnreadBadge";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import { useUnreadNotificationCount } from "@/features/social/hooks/useUnreadNotificationCount";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import {
  useGetDiscoverTracksQuery,
  useGetPopularTracksQuery,
  useGetRecentlyPlayedQuery,
} from "@/store/micboxx-api";
import { tokens } from "@/theme/tokens";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type PlayerSurface = ReturnType<typeof useDiscoverPlayer>;

interface ActionItem {
  key: string;
  label: string;
  subtitle: string;
  icon: IoniconName;
  onPress: () => void;
  tone?: "default" | "accent" | "danger";
}

interface SummaryItem {
  key: string;
  label: string;
  subtitle: string;
  icon: IoniconName;
  tone?: "default" | "accent" | "warning";
}

const PROFILE_ROWS = [
  "Public identity",
  "Listener profile",
  "Account details",
  "Membership status",
] as const;

const PURCHASE_ITEMS: SummaryItem[] = [
  {
    key: "purchase-actions",
    label: "Purchase actions",
    subtitle:
      "Use this destination for checkout entry points and commerce-related listening routes.",
    icon: "bag-check-outline",
    tone: "accent",
  },
  {
    key: "catalog",
    label: "Purchasable catalog",
    subtitle:
      "Browse tracks that can be purchased from the preview rows and actions below.",
    icon: "albums-outline",
  },
  {
    key: "membership",
    label: "Subscription stays separate",
    subtitle:
      "Recurring membership access is separated from purchases so the route stays clear.",
    icon: "card-outline",
  },
] as const;



const HELP_ITEMS: SummaryItem[] = [
  {
    key: "account",
    label: "Account recovery starts with sign-in",
    subtitle:
      "If your session looks stale, use sign-in or profile before assuming the app is broken.",
    icon: "log-in-outline",
    tone: "accent",
  },
  {
    key: "messages",
    label: "Support can be reached through other channels",
    subtitle:
      "Check the MicBoxx website for help articles and support contact options.",
    icon: "globe-outline",
  },
  {
    key: "preferences",
    label: "Preference issues belong in Settings",
    subtitle:
      "Notifications, playback, and account preference flows stay grouped there.",
    icon: "options-outline",
  },
] as const;

function isAccountDestinationSlug(
  value: string | undefined,
): value is AccountDestinationSlug {
  return Boolean(value && value in ACCOUNT_DESTINATIONS);
}

function uniqueTracks(...groups: PublicTrackSummary[][]): PublicTrackSummary[] {
  const seen = new Set<number>();
  const result: PublicTrackSummary[] = [];

  for (const group of groups) {
    for (const track of group) {
      if (seen.has(track.id)) {
        continue;
      }

      seen.add(track.id);
      result.push(track);
    }
  }

  return result;
}

function compactActions(
  items: (ActionItem | false | null | undefined)[],
): ActionItem[] {
  return items.filter((item): item is ActionItem => Boolean(item));
}

function formatRelativeDate(value: string | null): string {
  if (!value) {
    return "just now";
  }

  const target = new Date(value);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;
  const formatUnit = (count: number, unit: string) => {
    const absoluteCount = Math.abs(count);
    const pluralizedUnit = absoluteCount === 1 ? unit : `${unit}s`;

    if (count === 0) {
      return "just now";
    }

    return count > 0
      ? `in ${absoluteCount} ${pluralizedUnit}`
      : `${absoluteCount} ${pluralizedUnit} ago`;
  };

  if (Math.abs(diffMs) >= year) {
    return formatUnit(Math.round(diffMs / year), "year");
  }
  if (Math.abs(diffMs) >= month) {
    return formatUnit(Math.round(diffMs / month), "month");
  }
  if (Math.abs(diffMs) >= day) {
    return formatUnit(Math.round(diffMs / day), "day");
  }
  if (Math.abs(diffMs) >= hour) {
    return formatUnit(Math.round(diffMs / hour), "hour");
  }

  return formatUnit(Math.round(diffMs / minute), "minute");
}

function getNotificationIconName(
  type: SocialNotification["type"],
): IoniconName {
  if (type === "direct_message") {
    return "mail-outline";
  }

  if (type === "follow") {
    return "person-add-outline";
  }

  if (type === "track_comment") {
    return "chatbubble-ellipses-outline";
  }

  return "heart-outline";
}

function describeNotification(notification: SocialNotification): string {
  const actor =
    notification.actorDisplayName ?? notification.actorUsername ?? "Someone";

  if (notification.type === "follow") {
    return `${actor} followed you`;
  }

  if (notification.type === "direct_message") {
    return `${actor} sent you a message`;
  }

  if (notification.type === "track_comment") {
    if (notification.trackTitle) {
      return `${actor} commented on your track ${notification.trackTitle}`;
    }

    return `${actor} commented on your track`;
  }

  if (notification.trackTitle) {
    return `${actor} liked your track ${notification.trackTitle}`;
  }

  return `${actor} liked your track`;
}

function getNotificationPreview(
  notification: SocialNotification,
): string | null {
  return notification.messagePreview ?? notification.commentPreview ?? null;
}

function normalizeNotificationPath(href: string | null): string | null {
  if (!href) {
    return null;
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const parsed = new URL(href);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return null;
    }
  }

  return href.startsWith("/") ? href : `/${href.replace(/^\/+/, "")}`;
}

function resolveNotificationRoute(
  notification: SocialNotification,
): string | null {
  const path = normalizeNotificationPath(notification.href);

  if (path) {
    if (path.startsWith("/messages/")) {
      return path;
    }

    if (path.startsWith("/tracks/")) {
      return path.replace(/^\/tracks\//, "/track/");
    }

    if (path.startsWith("/track/")) {
      return path;
    }

    if (path.startsWith("/users/")) {
      return path.replace(/^\/users\//, "/user/");
    }

    if (path.startsWith("/artist/")) {
      return path.replace(/^\/artist\//, "/user/");
    }

    if (path.startsWith("/user/")) {
      return path;
    }
  }

  if (notification.type === "direct_message" && notification.conversationId) {
    return `/messages/${notification.conversationId}`;
  }

  if (notification.type === "follow" && notification.actorUsername) {
    return `/user/${encodeURIComponent(notification.actorUsername)}`;
  }

  return null;
}

export default function AccountDestinationScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === "string" ? params.slug : undefined;
  const isValidDestination = isAccountDestinationSlug(slug);
  const { session, signOut } = useAuth();
  const {
    preferences,
    isHydrating: preferencesHydrating,
    isSavingAccountPreferences,
    isSavingLocalPreferences,
    error: preferencesError,
    canManagePushNotifications,
    setPushNotificationsEnabled,
    setAutoplayPreviewEnabled,
    setExplicitFilterEnabled,
  } = useAccountPreferences();
  const player = useDiscoverPlayer();

  const accessToken = session?.accessToken ?? null;
  const needsRecentTracks =
    isValidDestination && (slug === "profile" || slug === "library");
  const needsCatalogTracks =
    isValidDestination &&
    (slug === "profile" ||
      slug === "library" ||
      slug === "purchases" ||
      slug === "subscription");
  const { data: recentData, isLoading: recentLoading } =
    useGetRecentlyPlayedQuery(
      { accessToken },
      { skip: !session || !needsRecentTracks },
    );
  const { data: popularData, isLoading: popularLoading } =
    useGetPopularTracksQuery(undefined, { skip: !needsCatalogTracks });
  const { data: discoverData, isLoading: discoverLoading } =
    useGetDiscoverTracksQuery(undefined, { skip: !needsCatalogTracks });

  if (!isValidDestination) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerWrap}>
          <Text style={styles.title}>Destination not found</Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/home")}
            style={({ pressed }: { pressed: boolean }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const meta = ACCOUNT_DESTINATIONS[slug];
  const recentTracks = recentData?.tracks ?? [];
  const trackPool = uniqueTracks(
    recentTracks,
    popularData?.tracks ?? [],
    discoverData?.tracks ?? [],
  );
  const libraryTracks = recentTracks.length
    ? recentTracks.slice(0, 4)
    : trackPool.slice(0, 4);
  const subscriptionTracks = (
    trackPool.filter((track) => track.isSubscriberOnly).length
      ? trackPool.filter((track) => track.isSubscriberOnly)
      : trackPool
  ).slice(0, 4);
  const purchasableTracks = (
    trackPool.filter(
      (track) =>
        track.commerce?.isPurchasable || Boolean(track.commerce?.price),
    ).length
      ? trackPool.filter(
          (track) =>
            track.commerce?.isPurchasable || Boolean(track.commerce?.price),
        )
      : trackPool
  ).slice(0, 4);
  const publicTrackLoading =
    (popularLoading || discoverLoading) && !trackPool.length;
  const libraryLoading = Boolean(
    session && recentLoading && !libraryTracks.length,
  );

  const openDestination = (nextSlug: AccountDestinationSlug) => {
    router.push({ pathname: "/account/[slug]", params: { slug: nextSlug } });
  };

  const openRoute = (href: string) => {
    router.push(href as never);
  };

  const handleAuthAction = async () => {
    if (!session) {
      router.push("/sign-in");
      return;
    }

    try {
      await signOut();
      router.replace("/(tabs)/home");
    } catch {
      router.push("/sign-in");
    }
  };

  const settingsStatus = preferencesError
    ? preferencesError
    : preferencesHydrating
      ? "Loading your settings..."
      : isSavingAccountPreferences || isSavingLocalPreferences
        ? "Saving your settings..."
        : "Preferences are saved automatically.";

  const profileActions = compactActions([
    session
      ? {
          key: "notifications",
          label: "Notifications",
          subtitle: "Keep activity, follows, and release updates visible.",
          icon: "notifications-outline",
          onPress: () => openDestination("notifications"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle: "Unlock your profile and account space.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
          tone: "accent",
        },
    {
      key: "library",
      label: "Library",
      subtitle: "Return to your recent listening and saved music hub.",
      icon: "library-outline",
      onPress: () => openDestination("library"),
    },
    {
      key: "subscription",
      label: "Subscription",
      subtitle: "See listening access and membership routes.",
      icon: "card-outline",
      onPress: () => openDestination("subscription"),
    },
  ]);

  const libraryActions = compactActions([
    {
      key: "library-tab",
      label: "Open Library",
      subtitle: "Jump into your playlists and the current listening catalog.",
      icon: "library-outline",
      onPress: () => openRoute("/(tabs)/library"),
      tone: "accent",
    },
    {
      key: "search",
      label: "Search",
      subtitle:
        "Use Solr-backed autocomplete to jump straight to tracks, albums, playlists, and users.",
      icon: "search-outline",
      onPress: () => openRoute("/(tabs)/search"),
    },
    session
      ? {
          key: "profile",
          label: "Profile",
          subtitle: "View your account identity and listening history.",
          icon: "person-circle-outline",
          onPress: () => openDestination("profile"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle: "Keep a persistent library across sessions.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
        },
  ]);

  const purchaseActions = compactActions([
    {
      key: "catalog-picks",
      label: "Catalog picks",
      subtitle:
        "Use the Library tab as the active playlist and catalog entry point.",
      icon: "albums-outline",
      onPress: () => openRoute("/(tabs)/library"),
      tone: "accent",
    },
    {
      key: "library",
      label: "Library",
      subtitle: "Move between purchased music and your listening hub.",
      icon: "library-outline",
      onPress: () => openDestination("library"),
    },
    {
      key: "subscription",
      label: "Subscription",
      subtitle: "Membership access stays separate from one-off purchases.",
      icon: "card-outline",
      onPress: () => openDestination("subscription"),
    },
    session
      ? {
          key: "profile",
          label: "Profile",
          subtitle: "Keep account identity and commerce routes connected.",
          icon: "person-circle-outline",
          onPress: () => openDestination("profile"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle:
            "Owned purchases only make sense once the route is tied to your account.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
        },
  ]);

  const subscriptionActions = compactActions([
    {
      key: "premium-library",
      label: "Discover premium tracks",
      subtitle: "Use the Library feed to move through catalog access quickly.",
      icon: "sparkles-outline",
      onPress: () => openRoute("/(tabs)/library"),
      tone: "accent",
    },
    {
      key: "library",
      label: "Library",
      subtitle:
        "Return to the listening surfaces that benefit from premium access.",
      icon: "library-outline",
      onPress: () => openDestination("library"),
    },
    {
      key: "settings",
      label: "Membership settings",
      subtitle:
        "Use settings for preference changes while plan controls expand.",
      icon: "settings-outline",
      onPress: () => openDestination("settings"),
    },
    session
      ? {
          key: "profile",
          label: "Profile",
          subtitle: "Verify the account and role behind your membership state.",
          icon: "person-circle-outline",
          onPress: () => openDestination("profile"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle:
            "Subscription access is tied to a signed-in MicBoxx account.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
        },
  ]);



  const helpActions = compactActions([
    session
      ? {
          key: "profile",
          label: "Profile",
          subtitle: "Check account identity before troubleshooting deeper.",
          icon: "person-circle-outline",
          onPress: () => openDestination("profile"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle: "Restore account context and unlock the full drawer.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
          tone: "accent",
        },
    {
      key: "settings",
      label: "Settings",
      subtitle: "Notification and playback preferences live there.",
      icon: "options-outline",
      onPress: () => openDestination("settings"),
    },
    session
      ? {
          key: "library-help",
          label: "Open Library",
          subtitle:
            "Return to your playlists and listening surfaces if you are simply trying to get unstuck.",
          icon: "library-outline",
          onPress: () => openRoute("/(tabs)/library"),
        }
      : false,
  ]);

  const settingsActions = compactActions([
    {
      key: "notifications",
      label: "Notifications",
      subtitle: "See where account activity now lands.",
      icon: "notifications-outline",
      onPress: () => openDestination("notifications"),
    },
    session
      ? {
          key: "profile",
          label: "Profile",
          subtitle: "Move back to account identity and role details.",
          icon: "person-circle-outline",
          onPress: () => openDestination("profile"),
        }
      : {
          key: "signin",
          label: "Sign in",
          subtitle: "Tie settings to a real account session.",
          icon: "log-in-outline",
          onPress: () => openRoute("/sign-in"),
        },
    {
      key: "help",
      label: "Help",
      subtitle: "Open troubleshooting and support guidance.",
      icon: "help-circle-outline",
      onPress: () => openDestination("help"),
    },
    {
      key: session ? "logout" : "home",
      label: session ? "Logout" : "Back to Home",
      subtitle: session
        ? "End your MicBoxx session from settings."
        : "Return to the main listening surface.",
      icon: session ? "log-out-outline" : "home-outline",
      onPress: session
        ? () => void handleAuthAction()
        : () => openRoute("/(tabs)/home"),
      tone: session ? "danger" : "default",
    },
  ]);

  let content: ReactNode;

  switch (slug) {
    case "profile":
      content = (
        <>
          <View style={styles.panel}>
            {session ? (
              <>
                <View style={styles.profileHeader}>
                  <Avatar
                    uri={session.user.avatarUrl}
                    displayName={session.user.displayName}
                    size={68}
                  />
                  <View style={styles.profileCopy}>
                    <Text style={styles.profileName}>
                      {session.user.displayName}
                    </Text>
                    <Text style={styles.profileHandle}>
                      @{session.user.username}
                    </Text>
                    <Text style={styles.profileEmail}>
                      {session.user.email}
                    </Text>
                  </View>
                </View>

                <View style={styles.badgeRow}>
                  <Pill
                    label={getUserRoleLabel(session.user)}
                    active
                    variant="accent"
                    style={styles.rolePill}
                  />
                  {isCreatorUser(session?.user) ? null : null}
                </View>

                <View style={styles.listWrap}>
                  {PROFILE_ROWS.map((row) => (
                    <InfoRow
                      key={row}
                      item={{
                        key: row,
                        label: row,
                        subtitle: "",
                        icon: "checkmark-circle-outline",
                        tone: "accent",
                      }}
                      compact
                    />
                  ))}
                </View>
              </>
            ) : (
              <GuestState />
            )}
          </View>

          <ActionPanel title="Account routes" items={profileActions} />

          <TrackPanel
            title={session ? "Continue listening" : "Start with discovery"}
            subtitle={
              session
                ? "Your profile can now hand you straight back into listening from the account surface."
                : "Guests can still start from discovery, but the library becomes persistent once you sign in."
            }
            tracks={libraryTracks}
            emptyText="No listening context yet. Use the Library tab to start one."
            loading={session ? libraryLoading : publicTrackLoading}
            player={player}
          />
        </>
      );
      break;

    case "notifications":
      content = session ? (
        <NotificationsFeedPanel onOpenRoute={openRoute} />
      ) : (
        <View style={styles.notifEmptyGate}>
          <View style={styles.notifEmptyIconWrap}>
            <Ionicons
              name="notifications-outline"
              size={44}
              color={tokens.colors.accent}
            />
          </View>
          <Text style={styles.notifEmptyTitle}>Sign in to view notifications</Text>
          <Text style={styles.notifEmptyBody}>
            Sign in to get real-time activity from your MicBoxx profile.
          </Text>
        </View>
      );
      break;

    case "library":
      content = (
        <>
          <TrackPanel
            title={
              session && recentTracks.length
                ? "Recently played"
                : "Library picks"
            }
            subtitle={
              session
                ? recentTracks.length
                  ? "Your recently played history is now wired into the library destination."
                  : "No recent history yet, so the library falls back to live catalog picks."
                : "Guests can browse from here, but persistent library history starts after sign-in."
            }
            tracks={libraryTracks}
            emptyText="No tracks are available yet. Try the Library tab next."
            loading={session ? libraryLoading : publicTrackLoading}
            player={player}
          />
          <ActionPanel title="Keep moving" items={libraryActions} />
          {!session ? <GuestState /> : null}
        </>
      );
      break;

    case "purchases":
      content = (
        <>
          <SummaryPanel
            title="Commerce hub"
            description="Use this route for purchase actions and commerce-ready listening."
            items={PURCHASE_ITEMS}
          />
          <TrackPanel
            title="Previewable catalog picks"
            subtitle="Browse purchasable catalog picks and continue into checkout when a release offers it."
            tracks={purchasableTracks}
            emptyText="No catalog picks are available yet. Open the Library tab to keep exploring."
            loading={publicTrackLoading}
            player={player}
          />
          <ActionPanel title="Commerce routes" items={purchaseActions} />
          {!session ? <GuestState /> : null}
        </>
      );
      break;

    case "subscription":
      content = (
        <>
          <TrackPanel
            title="Premium listening"
            subtitle={
              session
                ? "Subscriber-only or premium-adjacent tracks surface here so subscription is more than a static title."
                : "Sign in to tie premium access to your account, then come back here for membership context."
            }
            tracks={subscriptionTracks}
            emptyText="No premium picks are visible yet. Browse the catalog and revisit this route."
            loading={publicTrackLoading}
            player={player}
          />
          <ActionPanel title="Membership routes" items={subscriptionActions} />
          {!session ? <GuestState /> : null}
        </>
      );
      break;



    case "help":
      content = (
        <>
          <SummaryPanel
            title="Support guidance"
            description="Help now points you to the exact live surface that matches the problem instead of trapping support behind a dead screen."
            items={HELP_ITEMS}
          />
          <ActionPanel title="Useful next steps" items={helpActions} />
        </>
      );
      break;

    case "settings":
      content = (
        <>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Saved preferences</Text>
            <Text style={styles.description}>
              Push notifications are account-scoped. Playback and filtering stay
              local to this device.
            </Text>
            <Text style={styles.preferenceStatus}>{settingsStatus}</Text>

            <PreferenceRow
              label="Push notifications"
              subtitle={
                canManagePushNotifications
                  ? "Control notification delivery for this signed-in account."
                  : "Sign in to manage notification delivery for your account."
              }
              value={preferences.pushNotifications}
              onValueChange={() =>
                void setPushNotificationsEnabled(!preferences.pushNotifications)
              }
              disabled={!canManagePushNotifications || preferencesHydrating}
            />
            <PreferenceRow
              label="Autoplay previews"
              subtitle="Saved on this device for preview and browsing behavior."
              value={preferences.autoplayPreview}
              onValueChange={() =>
                void setAutoplayPreviewEnabled(!preferences.autoplayPreview)
              }
              disabled={preferencesHydrating}
            />
            <PreferenceRow
              label="Filter explicit tracks"
              subtitle="Saved on this device for account browsing and playback surfaces."
              value={preferences.explicitFilter}
              onValueChange={() =>
                void setExplicitFilterEnabled(!preferences.explicitFilter)
              }
              disabled={preferencesHydrating}
            />
          </View>
          <ActionPanel title="Connected routes" items={settingsActions} />
        </>
      );
      break;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={tokens.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>{meta.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          slug === "notifications" && styles.scrollContentFill,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {slug !== "notifications" && (
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Ionicons
                name={meta.icon}
                size={26}
                color={tokens.colors.textPrimary}
              />
            </View>
            <Text style={styles.title}>{meta.title}</Text>
            <Text style={styles.subtitle}>{meta.subtitle}</Text>
            <Text style={styles.description}>
              {session ? meta.signedInDescription : meta.guestDescription}
            </Text>
          </View>
        )}

        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

function GuestState({
  message = "Sign in to unlock this destination with your MicBoxx account.",
}: {
  message?: string;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Account required</Text>
      <View style={styles.guestWrap}>
        <Text style={styles.guestText}>{message}</Text>
        <Pressable
          onPress={() => router.push("/sign-in")}
          style={({ pressed }: { pressed: boolean }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonLabel}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: readonly SummaryItem[];
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.listWrap}>
        {items.map((item) => (
          <InfoRow key={item.key} item={item} />
        ))}
      </View>
    </View>
  );
}

function ActionPanel({ title, items }: { title: string; items: ActionItem[] }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.actionList}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }: { pressed: boolean }) => [
              styles.actionRow,
              item.tone === "accent" && styles.actionRowAccent,
              item.tone === "danger" && styles.actionRowDanger,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.actionIconWrap,
                item.tone === "accent" && styles.actionIconWrapAccent,
                item.tone === "danger" && styles.actionIconWrapDanger,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={
                  item.tone === "danger"
                    ? tokens.colors.danger
                    : tokens.colors.textPrimary
                }
              />
            </View>

            <View style={styles.actionCopy}>
              <Text
                style={[
                  styles.actionLabel,
                  item.tone === "danger" && styles.actionLabelDanger,
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.actionSubtitle}>{item.subtitle}</Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={tokens.colors.textSecondary}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TrackPanel({
  title,
  subtitle,
  tracks,
  emptyText,
  loading,
  player,
}: {
  title: string;
  subtitle: string;
  tracks: PublicTrackSummary[];
  emptyText: string;
  loading: boolean;
  player: PlayerSurface;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>{subtitle}</Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={tokens.colors.accent} />
        </View>
      ) : tracks.length ? (
        <View style={styles.trackCard}>
          {tracks.map((track, index) => {
            const active = track.id === player.activeId;
            const isLast = index === tracks.length - 1;
            const nextActive = tracks[index + 1]?.id === player.activeId;

            return (
              <View key={track.id}>
                <TrackRow
                  track={track}
                  active={active}
                  playing={active && player.playing}
                  onAction={() => player.handleAction(track, tracks)}
                  progressValue={player.progressValue}
                />
                {!isLast && !active && !nextActive ? (
                  <View style={styles.trackDivider} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyInlineText}>{emptyText}</Text>
      )}
    </View>
  );
}

function NotificationsFeedPanel({
  onOpenRoute,
}: {
  onOpenRoute: (href: string) => void;
}) {
  const { items, loading, error, isReady, canRetry, retry } =
    useNotifications(40);
  const unreadCount = useUnreadNotificationCount();
  const [markingId, setMarkingId] = useState<string | null>(null);
  const showLoadingSkeleton = loading && items.length === 0;
  const showRetryState = Boolean(error && items.length === 0);
  const showInlineRetry = Boolean(error && items.length > 0);

  const statusText = useMemo(() => {
    if (showLoadingSkeleton) {
      return "Connecting to your activity feed...";
    }

    if (showRetryState) {
      return "Live updates are paused until the connection recovers.";
    }

    if (unreadCount > 0) {
      return `${unreadCount} unread`;
    }

    if (items.length) {
      return "All caught up";
    }

    if (!isReady && !error) {
      return "Connecting to your activity feed...";
    }

    return "No notifications yet";
  }, [showLoadingSkeleton, showRetryState, unreadCount, items.length, isReady, error]);

  const showSimpleEmptyState = useMemo(
    () =>
      !showLoadingSkeleton &&
      !showRetryState &&
      !showInlineRetry &&
      items.length === 0,
    [showLoadingSkeleton, showRetryState, showInlineRetry, items.length],
  );

  const markRead = async (notificationId: string) => {
    if (!isReady) {
      return;
    }

    setMarkingId(notificationId);

    try {
      await updateDoc(
        doc(getFirebaseClientDb(), "notifications", notificationId),
        {
          isRead: true,
          readAt: serverTimestamp(),
          seenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      );
    } finally {
      setMarkingId((current: string | null) =>
      current === notificationId ? null : current,
    );
    }
  };

  const handleNotificationPress = (notification: SocialNotification) => {
    const route = resolveNotificationRoute(notification);
    if (!route) {
      return;
    }

    if (!notification.isRead) {
      void markRead(notification.id);
    }

    onOpenRoute(route);
  };

  if (showSimpleEmptyState) {
    return (
      <View style={styles.notifEmptyGate}>
        <View style={styles.notifEmptyIconWrap}>
          <Ionicons
            name="notifications-outline"
            size={44}
            color={tokens.colors.accent}
          />
        </View>
        <Text style={styles.notifEmptyTitle}>No notifications yet</Text>
        <Text style={styles.notifEmptyBody}>
          When someone follows you, comments, or sends a message, it will show
          up here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
        <View style={styles.notificationHeaderRow}>
          <View style={styles.notificationHeaderCopy}>
            <Text style={styles.sectionTitle}>Live activity</Text>
            <Text style={styles.description}>
              Likes, follows, comments, and direct messages appear here in real
              time.
            </Text>
          </View>
        <View style={styles.notificationHeaderMeta}>
          <UnreadBadge count={unreadCount} />
        </View>
      </View>

      <Text style={styles.preferenceStatus}>{statusText}</Text>

      {showInlineRetry ? (
        <View style={styles.notificationInlineBanner}>
          <View style={styles.notificationInlineBannerCopy}>
            <Text style={styles.notificationInlineBannerTitle}>
              Live updates paused
            </Text>
            <Text style={styles.notificationInlineBannerText}>{error}</Text>
          </View>
          {canRetry ? (
            <Pressable
              onPress={retry}
              style={({ pressed }: { pressed: boolean }) => [
                styles.notificationInlineBannerButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.notificationInlineBannerButtonLabel}>
                Retry
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showLoadingSkeleton ? (
        <NotificationsFeedSkeleton />
      ) : showRetryState ? (
        <NotificationStateCard
          icon="cloud-offline-outline"
          title="Notifications need another try"
          description={error ?? "Live activity could not be refreshed."}
          actionLabel={canRetry ? "Retry" : undefined}
          onAction={canRetry ? retry : undefined}
          tone="error"
        />
      ) : items.length ? (
        <View style={styles.notificationList}>
          {items.map((notification: SocialNotification) => {
            const route = resolveNotificationRoute(notification);
            const preview = getNotificationPreview(notification);
            const isMarking = markingId === notification.id;
            const timestampLabel = formatRelativeDate(notification.createdAt);
            const iconColor =
              notification.type === "direct_message"
                ? tokens.colors.accentStrong
                : notification.type === "follow"
                  ? tokens.colors.accent
                  : notification.type === "track_comment"
                    ? tokens.colors.warning
                    : tokens.colors.textPrimary;

            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationRow,
                  !notification.isRead && styles.notificationRowUnread,
                ]}
              >
                <Pressable
                  disabled={!route}
                  onPress={() => handleNotificationPress(notification)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.notificationBody,
                    !route && styles.notificationBodyStatic,
                    route && pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.notificationIconWrap}>
                    <Ionicons
                      name={getNotificationIconName(notification.type)}
                      size={18}
                      color={iconColor}
                    />
                  </View>

                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationHeadlineRow}>
                      <Text
                        style={[
                          styles.notificationHeadline,
                          !notification.isRead &&
                            styles.notificationHeadlineUnread,
                        ]}
                      >
                        {describeNotification(notification)}
                      </Text>
                      <View style={styles.notificationHeadlineMeta}>
                        <Text
                          style={[
                            styles.notificationTime,
                            !notification.isRead &&
                              styles.notificationTimeUnread,
                          ]}
                        >
                          {timestampLabel}
                        </Text>
                        {!notification.isRead ? (
                          <View style={styles.notificationUnreadDot} />
                        ) : null}
                      </View>
                    </View>

                    {preview ? (
                      <Text
                        style={styles.notificationPreview}
                        numberOfLines={2}
                      >
                        {preview}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                {!notification.isRead ? (
                  <Pressable
                    onPress={() => {
                      void markRead(notification.id);
                    }}
                    disabled={isMarking || !isReady}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.notificationMarkButton,
                      (isMarking || !isReady) &&
                        styles.notificationMarkButtonDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {isMarking ? (
                      <ActivityIndicator
                        size="small"
                        color={tokens.colors.textPrimary}
                      />
                    ) : (
                      <Text style={styles.notificationMarkButtonLabel}>
                        Mark read
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <NotificationStateCard
          icon="notifications-off-outline"
          title="You're caught up"
          description="New follows, track activity, comments, and direct messages will settle here as they happen."
        />
      )}
    </View>
  );
}

function NotificationsFeedSkeleton() {
  const rows: [number, number][] = [
    [220, 128],
    [196, 148],
    [236, 108],
  ];

  return (
    <View style={styles.notificationList}>
      {rows.map(([headlineWidth, previewWidth], index) => (
        <View
          key={`${headlineWidth}-${previewWidth}-${index}`}
          style={styles.notificationSkeletonRow}
        >
          <View style={styles.notificationSkeletonBody}>
            <ShimmerPlaceholder width={38} height={38} borderRadius={19} />
            <View style={styles.notificationSkeletonCopy}>
              <ShimmerPlaceholder
                width={headlineWidth}
                height={11}
                borderRadius={999}
              />
              <ShimmerPlaceholder
                width={previewWidth}
                height={11}
                borderRadius={999}
                style={{ opacity: 0.62 }}
              />
            </View>
          </View>
          <ShimmerPlaceholder width={78} height={32} borderRadius={999} />
        </View>
      ))}
    </View>
  );
}

function NotificationStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = "default",
}: {
  icon: IoniconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error";
}) {
  const iconColor =
    tone === "error" ? tokens.colors.danger : tokens.colors.textSecondary;

  return (
    <View
      style={[
        styles.notificationStateCard,
        tone === "error" && styles.notificationStateCardError,
      ]}
    >
      <View
        style={[
          styles.notificationStateIconWrap,
          tone === "error" && styles.notificationStateIconWrapError,
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.notificationStateTitle}>{title}</Text>
      <Text style={styles.notificationStateDescription}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }: { pressed: boolean }) => [
            styles.notificationStateAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.notificationStateActionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PreferenceRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      style={[styles.preferenceRow, disabled && styles.preferenceRowDisabled]}
    >
      <View style={styles.preferenceCopy}>
        <Text
          style={[
            styles.preferenceLabel,
            disabled && styles.preferenceLabelDisabled,
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.preferenceSubtitle,
            disabled && styles.preferenceSubtitleDisabled,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: tokens.colors.borderSubtle,
          true: tokens.colors.accentStrong,
        }}
        thumbColor={
          value ? tokens.colors.accentLight : tokens.colors.textSecondary
        }
      />
    </View>
  );
}

function InfoRow({
  item,
  compact = false,
}: {
  key?: Key;
  item: SummaryItem;
  compact?: boolean;
}) {
  const iconColor =
    item.tone === "accent"
      ? tokens.colors.accent
      : item.tone === "warning"
        ? tokens.colors.warning
        : tokens.colors.textSecondary;

  return (
    <View style={styles.listRow}>
      <Ionicons name={item.icon} size={16} color={iconColor} />
      <View style={styles.infoCopy}>
        <Text style={styles.listLabel}>{item.label}</Text>
        {!compact && item.subtitle ? (
          <Text style={styles.listDetail}>{item.subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  headerTitle: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140,
    gap: 18,
  },
  scrollContentFill: {
    flexGrow: 1,
  },
  heroCard: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 20,
    alignItems: "flex-start",
    gap: 10,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  panel: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 18,
    gap: 14,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: tokens.colors.textPrimary,
    fontSize: 19,
    fontWeight: "800",
  },
  profileHandle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  profileEmail: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  inlineActionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  notificationHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  notificationHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  notificationHeaderMeta: {
    minWidth: 24,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  notificationInlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: tokens.radii.xl,
    backgroundColor: "rgba(217,92,92,0.08)",
    borderWidth: 1,
    borderColor: "rgba(217,92,92,0.22)",
  },
  notificationInlineBannerCopy: {
    flex: 1,
    gap: 2,
  },
  notificationInlineBannerTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  notificationInlineBannerText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationInlineBannerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationInlineBannerButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  listWrap: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  listLabel: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listDetail: {
    color: tokens.colors.textDisabled,
    fontSize: 12,
    lineHeight: 18,
  },
  actionList: {
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  actionRowAccent: {
    borderColor: tokens.colors.borderAccent,
    backgroundColor: tokens.colors.accentDim,
  },
  actionRowDanger: {
    borderColor: "rgba(217,92,92,0.28)",
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  actionIconWrapAccent: {
    backgroundColor: "rgba(0,179,166,0.18)",
    borderColor: tokens.colors.borderAccent,
  },
  actionIconWrapDanger: {
    backgroundColor: "rgba(217,92,92,0.14)",
    borderColor: "rgba(217,92,92,0.24)",
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  actionLabelDanger: {
    color: tokens.colors.danger,
  },
  actionSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationList: {
    gap: 10,
  },
  notificationSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationSkeletonBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  notificationSkeletonCopy: {
    flex: 1,
    gap: 8,
  },
  notificationStateCard: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationStateCardError: {
    borderColor: "rgba(217,92,92,0.22)",
  },
  notifEmptyGate: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
  },
  notifEmptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  notifEmptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  notifEmptyBody: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  notificationStateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationStateIconWrapError: {
    backgroundColor: "rgba(217,92,92,0.12)",
    borderColor: "rgba(217,92,92,0.2)",
  },
  notificationStateTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  notificationStateDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  notificationStateAction: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  notificationStateActionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  notificationRow: {
    gap: 12,
    padding: 14,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationRowUnread: {
    borderColor: tokens.colors.borderAccent,
    backgroundColor: tokens.colors.accentDim,
  },
  notificationBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  notificationBodyStatic: {
    opacity: 0.92,
  },
  notificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationHeadlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  notificationHeadlineMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  notificationHeadline: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  notificationHeadlineUnread: {
    fontWeight: "800",
  },
  notificationTime: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
    lineHeight: 16,
  },
  notificationTimeUnread: {
    color: tokens.colors.textSecondary,
    fontWeight: "600",
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.accent,
  },
  notificationPreview: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  notificationMarkButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationMarkButtonDisabled: {
    opacity: 0.72,
  },
  notificationMarkButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  notificationErrorText: {
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  trackCard: {
    borderRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgApp,
    paddingVertical: 4,
    ...tokens.shadows.md,
  },
  trackDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.colors.borderSubtle,
    marginLeft: 78,
    marginRight: 14,
  },
  loadingRow: {
    paddingVertical: 10,
    alignItems: "center",
  },
  emptyInlineText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  preferenceRowDisabled: {
    opacity: 0.7,
  },
  preferenceCopy: {
    flex: 1,
    gap: 3,
  },
  preferenceStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  preferenceLabelDisabled: {
    color: tokens.colors.textSecondary,
  },
  preferenceSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceSubtitleDisabled: {
    color: tokens.colors.textDisabled,
  },
  guestWrap: {
    gap: 12,
    marginTop: 4,
  },
  guestText: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.accent,
  },
  primaryButtonLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  pressed: {
    opacity: 0.82,
  },
});
