import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type Key,
  type ReactNode,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  fetchUserProfile,
  uploadUserAvatar,
  uploadUserCover,
  type DashboardUserProfile,
} from "@/features/account/api";
import { UserProfileView } from "@/features/account/components/profile/UserProfileView";

import { TrackRow } from "@/components/discover";
import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { Avatar, Button, Pill, ShimmerPlaceholder, Skeleton } from "@micboxx/ui";
import { getFirebaseClientDb } from "@/config/firebase";
import type { PublicTrackSummary } from "@micboxx/contracts";
import {
  ACCOUNT_DESTINATIONS,
  getUserRoleLabel,
  isCreatorUser,
  type AccountDestinationSlug,
} from "@/features/account/destinations";
import { useAccountPreferences } from "@/features/account/provider";
import { useAuth } from "@/features/auth/provider";
import type {
  LibraryOwnedAlbum,
  LibraryOwnedTrack,
} from "@/features/library/libraryTypes";
import { useLibraryDomains } from "@/features/library/useLibraryDomains";
import {
  markRoomNotificationRead,
  useGetCurrentEntitlementsQuery,
  useGetDiscoverTracksQuery,
  useGetPopularTracksQuery,
  useGetRecentlyPlayedQuery,
} from "@micboxx/api";
import type { EntitlementState } from "@micboxx/contracts";
import { useNotifications } from "@/features/social/hooks/useNotifications";
import { NotificationItem } from "@micboxx/notifications";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type PlayerSurface = ReturnType<typeof useDiscoverPlayer>;
type PurchasedView = "tracks" | "albums";
type PurchasedSort = "recent" | "oldest" | "alpha";
type PurchasedLayout = "list" | "grid";

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

type NotificationIconMeta = {
  icon: IoniconName | "soundwave";
  color: string;
  backgroundColor: string;
};

function getNotificationIconMeta(
  notification: NotificationItem,
): NotificationIconMeta {
  if (
    notification.source === "room" &&
    notification.roomType === "room-reward"
  ) {
    return {
      icon: "ribbon-outline",
      color: "#fde68a",
      backgroundColor: "rgba(252,211,77,0.15)",
    };
  }

  if (notification.type === "room") {
    return {
      icon: "soundwave",
      color: "#6ee7b7",
      backgroundColor: "rgba(52,211,153,0.15)",
    };
  }

  if (notification.type === "direct_message") {
    return {
      icon: "chatbubble-ellipses-outline",
      color: "#f0abfc",
      backgroundColor: "rgba(232,121,249,0.15)",
    };
  }

  if (notification.type === "follow") {
    return {
      icon: "person-add-outline",
      color: "#7dd3fc",
      backgroundColor: "rgba(56,189,248,0.15)",
    };
  }

  if (notification.type === "track_comment") {
    return {
      icon: "chatbubble-ellipses-outline",
      color: "#6ee7b7",
      backgroundColor: "rgba(52,211,153,0.15)",
    };
  }

  return {
    icon: "heart-outline",
    color: tokens.colors.accent,
    backgroundColor: tokens.colors.accentDim,
  };
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
  notification: NotificationItem,
): string | null {
  const path = normalizeNotificationPath(notification.href);

  if (path) {
    if (path.startsWith("/room/")) {
      return path;
    }

    if (path.startsWith("/rooms/")) {
      return path.replace(/^\/rooms\//, "/room/");
    }

    if (path.startsWith("/messages/")) {
      return path;
    }

    if (path.startsWith("/tracks/")) {
      return path.replace(/^\/tracks\//, "/track/");
    }

    if (path.startsWith("/track/")) {
      return path;
    }

    if (path.startsWith("/albums/")) {
      return path.replace(/^\/albums\//, "/album/");
    }

    if (path.startsWith("/album/")) {
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

  if (notification.source === "room") {
    return null;
  }

  const socialNotification = notification.raw;

  if (
    socialNotification.type === "direct_message" &&
    socialNotification.conversationId
  ) {
    return `/messages/${socialNotification.conversationId}`;
  }

  if (
    socialNotification.type === "follow" &&
    socialNotification.actorUsername
  ) {
    return `/user/${encodeURIComponent(socialNotification.actorUsername)}`;
  }

  return null;
}

function formatShortDate(secondsValue: number | null | undefined): string | null {
  if (!secondsValue) {
    return null;
  }

  return new Date(secondsValue * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolveEntitlementStatus(
  entitlement: EntitlementState | null | undefined,
): "active" | "grace" | "lapsed" | "none" {
  if (!entitlement) return "none";
  const status = entitlement.status.toLowerCase();
  if (status === "active") return "active";
  if (status.includes("grace")) return "grace";
  if (
    status.includes("cancel") ||
    status.includes("expired") ||
    status.includes("lapsed")
  ) {
    return "lapsed";
  }

  return "active";
}

function formatSubscriptionStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function sortPurchasedTracks(
  tracks: LibraryOwnedTrack[],
  sortBy: PurchasedSort,
): LibraryOwnedTrack[] {
  const next = [...tracks];

  if (sortBy === "alpha") {
    next.sort((a, b) => a.title.localeCompare(b.title));
    return next;
  }

  next.sort((a, b) =>
    sortBy === "oldest"
      ? a.acquiredAt - b.acquiredAt
      : b.acquiredAt - a.acquiredAt,
  );

  return next;
}

function sortPurchasedAlbums(
  albums: LibraryOwnedAlbum[],
  sortBy: PurchasedSort,
): LibraryOwnedAlbum[] {
  const next = [...albums];

  if (sortBy === "alpha") {
    next.sort((a, b) => a.title.localeCompare(b.title));
    return next;
  }

  next.sort((a, b) =>
    sortBy === "oldest"
      ? a.acquiredAt - b.acquiredAt
      : b.acquiredAt - a.acquiredAt,
  );

  return next;
}

function getPurchasedSortLabel(sortBy: PurchasedSort): string {
  if (sortBy === "oldest") return "Oldest Added";
  if (sortBy === "alpha") return "Title A-Z";
  return "Recently Added";
}

export default function AccountDestinationScreen() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = typeof params.slug === "string" ? params.slug : undefined;
  const isValidDestination = isAccountDestinationSlug(slug);
  const { session, signOut } = useAuth();
  const [purchasedView, setPurchasedView] = useState<PurchasedView>("tracks");
  const [purchasedSort, setPurchasedSort] = useState<PurchasedSort>("recent");
  const [purchasedLayout, setPurchasedLayout] =
    useState<PurchasedLayout>("list");
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
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<DashboardUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (slug !== "profile" || !session) {
      return;
    }

    let isCancelled = false;
    async function load() {
      setLoadingProfile(true);
      try {
        const data = await fetchUserProfile(session.accessToken, session);
        if (!isCancelled) {
          setProfile(data);
        }
      } catch (err) {
        if (!isCancelled) {
          Alert.alert("Error", err instanceof Error ? err.message : "Unable to load profile.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingProfile(false);
        }
      }
    }

    void load();
    return () => {
      isCancelled = true;
    };
  }, [slug, session]);

  const handleUploadAvatar = async (fileUri: string, filename: string) => {
    if (!session?.accessToken) return;
    const updated = await uploadUserAvatar(session.accessToken, fileUri, filename, session);
    setProfile(updated);
  };

  const handleUploadCover = async (fileUri: string, filename: string) => {
    if (!session?.accessToken) return;
    const updated = await uploadUserCover(session.accessToken, fileUri, filename, session);
    setProfile(updated);
  };
  const { state: libraryState, summary: librarySummary } = useLibraryDomains(
    slug === "purchases" ? accessToken : null,
    slug === "purchases" ? (session?.user.uuid ?? null) : null,
  );
  const {
    data: entitlement,
    isLoading: entitlementLoading,
    error: entitlementError,
  } = useGetCurrentEntitlementsQuery(
    { accessToken },
    { skip: !session || slug !== "subscription" },
  );
  const needsRecentTracks =
    isValidDestination && (slug === "profile" || slug === "library");
  const needsCatalogTracks =
    isValidDestination && (slug === "profile" || slug === "library");
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

  // ── Profile: edge-to-edge layout with cover behind header ─────────────────
  if (slug === "profile") {
    return (
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileScroll}>
          {loadingProfile && !profile && (
            <View style={{ gap: 0 }}>
              <Skeleton width="100%" height={200} borderRadius={0} />
              <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
                <Skeleton width={80} height={80} borderRadius={40} style={{ marginTop: -40 }} />
                <Skeleton width="45%" height={20} borderRadius={8} />
                <Skeleton width="30%" height={14} borderRadius={6} />
              </View>
            </View>
          )}
          {profile && session && (
            <UserProfileView
              profile={profile}
              accessToken={session.accessToken}
              session={session}
              coverTopInset={insets.top}
              onUpdateProfile={(updated) => setProfile(updated as DashboardUserProfile)}
              onUploadAvatar={handleUploadAvatar}
              onUploadCover={handleUploadCover}
            />
          )}
        </ScrollView>
        <View style={[styles.profileFloatingHeader, { top: insets.top }]}>
          <DetailRouteHeader title="" fallbackRoute="/(tabs)/home" />
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
      label: "Subscriptions",
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


  let content: ReactNode;

  switch (slug) {
    case "profile":
      if (!session) {
        content = <GuestState />;
      } else if (loadingProfile && !profile) {
        content = (
          <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: 12 }}>
            <Skeleton width={80} height={80} borderRadius={40} />
            <Skeleton width="45%" height={20} borderRadius={8} />
            <Skeleton width="30%" height={14} borderRadius={6} />
          </View>
        );
      } else if (profile) {
        content = (
          <UserProfileView
            profile={profile}
            accessToken={session.accessToken}
            session={session}
            onUpdateProfile={(updated) => setProfile(updated as DashboardUserProfile)}
            onUploadAvatar={handleUploadAvatar}
            onUploadCover={handleUploadCover}
          />
        );
      } else {
        content = (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: tokens.colors.textSecondary }}>
              Unable to load profile. Please try again later.
            </Text>
          </View>
        );
      }
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
      content = session ? (
        renderPurchasesPanel({
          albums: libraryState.ownedAlbums,
          tracks: libraryState.ownedTracks,
          loading: libraryState.isLoading,
          error: libraryState.error,
          totalCount:
            librarySummary.ownedAlbumCount + librarySummary.ownedTrackCount,
          view: purchasedView,
          onViewChange: setPurchasedView,
          sortBy: purchasedSort,
          onSortChange: setPurchasedSort,
          layoutMode: purchasedLayout,
          onLayoutModeChange: setPurchasedLayout,
        })
      ) : (
        <GuestState message="Sign in to see tracks and albums you own." />
      );
      break;

    case "subscription":
      content = session ? (
        renderSubscriptionPanel({
          entitlement,
          loading: entitlementLoading,
          error:
            entitlementError &&
            "message" in entitlementError &&
            typeof entitlementError.message === "string"
              ? entitlementError.message
              : null,
        })
      ) : (
        <GuestState message="Sign in to see your current subscription level." />
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

    case "settings-notifications":
      content = (
        <>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Push notifications</Text>
            <Text style={styles.description}>
              Control how and when you receive push notifications on your MicBoxx account.
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
          </View>
        </>
      );
      break;

    case "settings-playback":
      content = (
        <>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Audio & Content Preferences</Text>
            <Text style={styles.description}>
              Playback preferences and explicit filters are saved locally on this device.
            </Text>

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
        </>
      );
      break;
  }

  const fallbackRoute = slug === "profile" ? "/(tabs)/home" : "/settings";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <DetailRouteHeader title={meta.title} fallbackRoute={fallbackRoute} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          slug === "notifications" && styles.scrollContentFill,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {slug !== "notifications" && slug !== "profile" && slug !== "settings-notifications" && slug !== "settings-playback" && slug !== "subscription" && slug !== "help" && (
          <View style={styles.heroCard}>
            {slug !== "settings" && (
              <View style={styles.heroIconWrap}>
                <Ionicons
                  name={meta.icon}
                  size={26}
                  color={tokens.colors.textPrimary}
                />
              </View>
            )}
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

function renderPurchasesPanel({
  albums,
  tracks,
  loading,
  error,
  totalCount,
  view,
  onViewChange,
  sortBy,
  onSortChange,
  layoutMode,
  onLayoutModeChange,
}: {
  albums: LibraryOwnedAlbum[];
  tracks: LibraryOwnedTrack[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  view: PurchasedView;
  onViewChange: (view: PurchasedView) => void;
  sortBy: PurchasedSort;
  onSortChange: (sortBy: PurchasedSort) => void;
  layoutMode: PurchasedLayout;
  onLayoutModeChange: (layoutMode: PurchasedLayout) => void;
}) {
  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={{ gap: 12, paddingVertical: 8 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={44} height={44} borderRadius={6} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="50%" height={13} borderRadius={6} />
                <Skeleton width="30%" height={11} borderRadius={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Unable to load purchases</Text>
        <Text style={styles.description}>{error}</Text>
      </View>
    );
  }

  const sortedTracks = sortPurchasedTracks(tracks, sortBy);
  const sortedAlbums = sortPurchasedAlbums(albums, sortBy);
  const tabs: { id: PurchasedView; label: string; count: number }[] = [
    { id: "tracks", label: "Tracks", count: tracks.length },
    { id: "albums", label: "Albums", count: albums.length },
  ];
  const activeCount = view === "tracks" ? sortedTracks.length : sortedAlbums.length;
  const isGridLayout = layoutMode === "grid";

  return (
    <View style={styles.purchasedPage}>
      <View style={styles.purchasedTabs}>
        {tabs.map((tab) => {
          const selected = view === tab.id;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onViewChange(tab.id)}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedTab,
                selected && styles.purchasedTabActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.purchasedTabLabel,
                  selected && styles.purchasedTabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.purchasedTabCount,
                  selected && styles.purchasedTabLabelActive,
                ]}
              >
                {tab.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.purchasedToolbar}>
        <View style={styles.purchasedTitleRow}>
          <Text style={styles.purchasedViewTitle}>
            {view === "tracks" ? "Tracks" : "Albums"}
          </Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{activeCount}</Text>
          </View>
        </View>

        <View style={styles.purchasedControlRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.purchasedSortOptions}
          >
            {(["recent", "oldest", "alpha"] as const).map((option) => {
              const selected = sortBy === option;

              return (
                <Pressable
                  key={option}
                  onPress={() => onSortChange(option)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.purchasedSortChip,
                    selected && styles.purchasedSortChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.purchasedSortLabel,
                      selected && styles.purchasedSortLabelActive,
                    ]}
                  >
                    {getPurchasedSortLabel(option)}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color={tokens.colors.accentLight}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.purchasedLayoutToggle}>
            <Pressable
              onPress={() => onLayoutModeChange("list")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedLayoutButton,
                layoutMode === "list" && styles.purchasedLayoutButtonActive,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Show list view"
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={
                  layoutMode === "list"
                    ? tokens.colors.accentLight
                    : tokens.colors.textSecondary
                }
              />
            </Pressable>
            <Pressable
              onPress={() => onLayoutModeChange("grid")}
              style={({ pressed }: { pressed: boolean }) => [
                styles.purchasedLayoutButton,
                layoutMode === "grid" && styles.purchasedLayoutButtonActive,
                pressed && styles.pressed,
              ]}
              accessibilityLabel="Show grid view"
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={
                  layoutMode === "grid"
                    ? tokens.colors.accentLight
                    : tokens.colors.textSecondary
                }
              />
            </Pressable>
          </View>
        </View>
      </View>

      {view === "tracks" ? (
        sortedTracks.length > 0 ? (
          isGridLayout ? (
            <PurchasedGrid>
              {sortedTracks.map((track) => (
                <PurchasedGridCard
                  key={`track-grid-${track.uuid || track.id}`}
                  title={track.title}
                  subtitle={track.artistName}
                  meta={`Acquired ${formatShortDate(track.acquiredAt) ?? ""}`}
                  artwork={track.artwork}
                />
              ))}
            </PurchasedGrid>
          ) : (
            <View style={styles.purchasedList}>
              {sortedTracks.map((track, index) => (
                <PurchasedRow
                  key={`track-${track.uuid || track.id}`}
                  index={index + 1}
                  title={track.title}
                  subtitle={
                    track.albumTitle
                      ? `${track.artistName} · ${track.albumTitle}`
                      : track.artistName
                  }
                  meta={`Purchased · ${formatShortDate(track.acquiredAt) ?? ""}`}
                  artwork={track.artwork}
                />
              ))}
            </View>
          )
        ) : (
          <PurchasedEmptyState title="No purchased tracks yet" />
        )
      ) : sortedAlbums.length > 0 ? (
        isGridLayout ? (
          <PurchasedGrid>
            {sortedAlbums.map((album) => (
              <PurchasedGridCard
                key={`album-grid-${album.uuid || album.id}`}
                title={album.title}
                subtitle={album.artistName}
                meta={`Acquired ${formatShortDate(album.acquiredAt) ?? ""}`}
                artwork={album.artwork}
              />
            ))}
          </PurchasedGrid>
        ) : (
          <View style={styles.purchasedList}>
            {sortedAlbums.map((album, index) => (
              <PurchasedRow
                key={`album-${album.uuid || album.id}`}
                index={index + 1}
                title={album.title}
                subtitle={album.artistName}
                meta={`Purchased · ${formatShortDate(album.acquiredAt) ?? ""}`}
                artwork={album.artwork}
              />
            ))}
          </View>
        )
      ) : (
        <PurchasedEmptyState title="No purchased albums yet" />
      )}
    </View>
  );
}

function PurchasedGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <View style={styles.purchasedGrid}>{children}</View>;
}

function PurchasedRow({
  index,
  title,
  subtitle,
  meta,
  artwork,
}: {
  index: number;
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
}) {
  return (
    <View style={styles.purchasedRow}>
      <Text style={styles.purchasedIndex}>{index}</Text>
      <View style={styles.purchasedArtwork}>
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.purchasedArtworkText}>
            {title.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.purchasedCopy}>
        <Text numberOfLines={1} style={styles.purchasedTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.purchasedSubtitle}>
          {subtitle}
        </Text>
        <Text numberOfLines={1} style={styles.purchasedMeta}>
          {meta.trim()}
        </Text>
      </View>
      <View style={styles.ownedBadge}>
        <Text style={styles.ownedBadgeText}>Owned</Text>
      </View>
    </View>
  );
}

function PurchasedGridCard({
  title,
  subtitle,
  meta,
  artwork,
}: {
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
}) {
  return (
    <View style={styles.purchasedGridCard}>
      <View style={styles.purchasedGridArtwork}>
        {artwork ? (
          <Image
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        ) : (
          <Text style={styles.purchasedArtworkText}>
            {title.slice(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
      <Text numberOfLines={1} style={styles.purchasedGridTitle}>
        {title}
      </Text>
      <Text numberOfLines={1} style={styles.purchasedGridSubtitle}>
        {subtitle}
      </Text>
      <Text numberOfLines={1} style={styles.purchasedGridMeta}>
        {meta.trim()}
      </Text>
    </View>
  );
}

function PurchasedEmptyState({ title }: { title: string }) {
  return (
    <View style={styles.purchasedEmptyState}>
      <View style={styles.purchasedEmptyIconWrap}>
        <Ionicons
          name="musical-notes-outline"
          size={34}
          color={tokens.colors.textSecondary}
        />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.description}>
        {title.includes("tracks")
          ? "Tracks you purchase will appear here."
          : "Albums you purchase will appear here."}
      </Text>
    </View>
  );
}

function renderSubscriptionPanel({
  entitlement,
  loading,
  error,
}: {
  entitlement: EntitlementState | null | undefined;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Skeleton width="50%" height={16} borderRadius={8} />
          <Skeleton width="70%" height={12} borderRadius={6} />
          <Skeleton width="40%" height={12} borderRadius={6} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Unable to load subscription</Text>
        <Text style={styles.description}>{error}</Text>
      </View>
    );
  }

  const entitlementStatus = resolveEntitlementStatus(entitlement);

  if (!entitlement || entitlementStatus === "none") {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>No active subscription</Text>
        <Text style={styles.description}>
          Your account is using the default free listener access.
        </Text>
      </View>
    );
  }

  const renewalDate = formatShortDate(
    entitlement.period.currentPeriodEndsAt ?? entitlement.period.expiresAt,
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Current subscription</Text>
      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionIconWrap}>
          <Ionicons name="diamond-outline" size={24} color={tokens.colors.accent} />
        </View>
        <View style={styles.subscriptionCopy}>
          <Text style={styles.subscriptionLevel}>{entitlement.plan.label}</Text>
          <Text style={styles.subscriptionStatus}>
            {formatSubscriptionStatus(entitlement.status)}
          </Text>
          {renewalDate ? (
            <Text style={styles.subscriptionRenewal}>
              {entitlementStatus === "lapsed" ? "Access ends " : "Renews "}
              {renewalDate}
            </Text>
          ) : null}
        </View>
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
        <View style={{ gap: 10, paddingVertical: 4 }}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={44} height={44} borderRadius={6} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="50%" height={13} borderRadius={6} />
                <Skeleton width="30%" height={11} borderRadius={6} />
              </View>
            </View>
          ))}
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

    if (!isReady && !error) {
      return "Connecting to your activity feed...";
    }

    return null;
  }, [showLoadingSkeleton, showRetryState, isReady, error]);

  const showSimpleEmptyState = useMemo(
    () =>
      !showLoadingSkeleton &&
      !showRetryState &&
      !showInlineRetry &&
      items.length === 0,
    [showLoadingSkeleton, showRetryState, showInlineRetry, items.length],
  );

  const markRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    if (notification.source === "room") {
      await markRoomNotificationRead({
        notificationId: notification.numericId,
      });
      return;
    }

    if (!isReady) {
      return;
    }

    await updateDoc(
      doc(getFirebaseClientDb(), "notifications", notification.id),
      {
        isRead: true,
        readAt: serverTimestamp(),
        seenAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    );
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    const route = resolveNotificationRoute(notification);
    if (!route) {
      return;
    }

    if (!notification.isRead) {
      void markRead(notification);
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
    <View style={styles.notificationFeed}>
      {statusText ? (
        <Text style={styles.preferenceStatus}>{statusText}</Text>
      ) : null}

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
          {items.map((notification: NotificationItem) => {
            const route = resolveNotificationRoute(notification);
            const preview = notification.preview;
            const timestampLabel = formatRelativeDate(notification.createdAt);
            const iconMeta = getNotificationIconMeta(notification);

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
                  <View
                    style={[
                      styles.notificationIconWrap,
                      { backgroundColor: iconMeta.backgroundColor },
                    ]}
                  >
                    {iconMeta.icon === "soundwave" ? (
                      <SoundwaveTabIcon size={18} color={iconMeta.color} />
                    ) : (
                      <Ionicons
                        name={iconMeta.icon}
                        size={18}
                        color={iconMeta.color}
                      />
                    )}
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
                        {notification.label}
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
            <ShimmerPlaceholder width={32} height={32} borderRadius={16} />
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
          <ShimmerPlaceholder width={28} height={10} borderRadius={999} />
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
  profileScroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  profileFloatingHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
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
    backgroundColor: "transparent",
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
    paddingVertical: 20,
    paddingHorizontal: 0,
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
    paddingVertical: 18,
    paddingHorizontal: 0,
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
  purchasedPage: {
    gap: 18,
  },
  purchasedTabs: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.bgElevated,
    padding: 4,
  },
  purchasedTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  purchasedTabActive: {
    backgroundColor: tokens.colors.accentDim,
  },
  purchasedTabLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  purchasedTabLabelActive: {
    color: tokens.colors.accentLight,
  },
  purchasedTabCount: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedToolbar: {
    gap: 12,
  },
  purchasedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purchasedViewTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  countPill: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  countPillText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedControlRow: {
    gap: 10,
  },
  purchasedSortOptions: {
    gap: 8,
    paddingRight: 20,
  },
  purchasedSortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 13,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  purchasedSortChipActive: {
    backgroundColor: tokens.colors.accentDim,
    borderColor: tokens.colors.borderAccent,
  },
  purchasedSortLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  purchasedSortLabelActive: {
    color: tokens.colors.accentLight,
  },
  purchasedLayoutToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 4,
  },
  purchasedLayoutButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  purchasedLayoutButtonActive: {
    backgroundColor: tokens.colors.accentDim,
  },
  purchasedList: {
    borderRadius: 8,
    overflow: "hidden",
  },
  purchasedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  purchasedGridCard: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 6,
  },
  purchasedGridArtwork: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  purchasedGridTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
  },
  purchasedGridSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  purchasedGridMeta: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
  },
  purchasedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  purchasedIndex: {
    width: 18,
    textAlign: "center",
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  purchasedArtwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  purchasedArtworkText: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  purchasedCopy: {
    flex: 1,
    minWidth: 0,
  },
  purchasedTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  purchasedSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  purchasedMeta: {
    color: tokens.colors.textDisabled,
    fontSize: 11,
    marginTop: 4,
  },
  ownedBadge: {
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: tokens.colors.accentDim,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
  },
  ownedBadgeText: {
    color: tokens.colors.accentLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  purchasedEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 260,
    padding: 24,
  },
  purchasedEmptyIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  subscriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  subscriptionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  subscriptionLevel: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  subscriptionStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  subscriptionRenewal: {
    color: tokens.colors.textDisabled,
    fontSize: 12,
  },
  notificationFeed: {
    gap: 14,
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
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  actionRowAccent: {},
  actionRowDanger: {},
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  actionIconWrapAccent: {},
  actionIconWrapDanger: {},
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
    alignSelf: "stretch",
    marginHorizontal: -20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  notificationStateCardError: {},
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
    backgroundColor: "transparent",
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.borderSubtle,
  },
  notificationRowUnread: {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  notificationBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  notificationBodyStatic: {
    opacity: 0.92,
  },
  notificationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
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
    lineHeight: 17,
  },
  notificationErrorText: {
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  trackCard: {
    paddingVertical: 4,
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
