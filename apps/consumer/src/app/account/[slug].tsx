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
import {
  getCachedUserProfile,
  setCachedUserProfile,
} from "@/features/account/profile-cache";
import { UserProfileView } from "@/features/account/components/profile/UserProfileView";
import { GuestState } from "@/features/account/components/shared/GuestState";
import { SummaryPanel } from "@/features/account/components/shared/SummaryPanel";
import { ActionPanel, type ActionItem } from "@/features/account/components/shared/ActionPanel";
import { TrackPanel } from "@/features/account/components/shared/TrackPanel";
import { SummaryItem } from "@/features/account/components/shared/InfoRow";
import { PurchasesPanel, type PurchasedView, type PurchasedSort, type PurchasedLayout } from "@/features/account/components/purchases/PurchasesPanel";
import { SubscriptionPanel } from "@/features/account/components/subscription/SubscriptionPanel";
import { SettingsNotificationsPanel } from "@/features/account/components/settings/SettingsNotificationsPanel";
import { SettingsPlaybackPanel } from "@/features/account/components/settings/SettingsPlaybackPanel";

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
  useGetCurrentEntitlementsQuery,
  useGetDiscoverTracksQuery,
  useGetPopularTracksQuery,
  useGetRecentlyPlayedQuery,
} from "@micboxx/api";
import type { EntitlementState } from "@micboxx/contracts";
import { useDiscoverPlayer } from "@/hooks/useDiscoverPlayer";
import { tokens } from "@micboxx/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type PlayerSurface = ReturnType<typeof useDiscoverPlayer>;


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
  const userUuid = session?.user.uuid ?? null;
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<DashboardUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (slug !== "profile" || !session || !userUuid) {
      return;
    }

    const profileCacheKey = userUuid;
    const cachedProfile = getCachedUserProfile(profileCacheKey);
    if (cachedProfile) {
      setProfile(cachedProfile);
    }

    let isCancelled = false;
    async function load() {
      setLoadingProfile(!cachedProfile);
      try {
        const data = await fetchUserProfile(session!.accessToken, session!);
        if (!isCancelled) {
          setCachedUserProfile(profileCacheKey, data);
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
  }, [slug, session, userUuid]);

  const handleUploadAvatar = async (fileUri: string, filename: string) => {
    if (!session?.accessToken) return;
    const updated = await uploadUserAvatar(session.accessToken, fileUri, filename, session);
    setCachedUserProfile(session.user.uuid, updated);
    setProfile(updated);
  };

  const handleUploadCover = async (fileUri: string, filename: string) => {
    if (!session?.accessToken) return;
    const updated = await uploadUserCover(session.accessToken, fileUri, filename, session);
    setCachedUserProfile(session.user.uuid, updated);
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
              userUuid={session.user.uuid}
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
          onPress: () => openRoute("/notifications"),
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
        <PurchasesPanel
          albums={libraryState.ownedAlbums}
          tracks={libraryState.ownedTracks}
          loading={libraryState.isLoading}
          error={libraryState.error}
          totalCount={
            librarySummary.ownedAlbumCount + librarySummary.ownedTrackCount
          }
          view={purchasedView}
          onViewChange={setPurchasedView}
          sortBy={purchasedSort}
          onSortChange={setPurchasedSort}
          layoutMode={purchasedLayout}
          onLayoutModeChange={setPurchasedLayout}
        />
      ) : (
        <GuestState message="Sign in to see tracks and albums you own." />
      );
      break;

    case "subscription":
      content = session ? (
        <SubscriptionPanel
          entitlement={entitlement}
          loading={entitlementLoading}
          error={
            entitlementError &&
            "message" in entitlementError &&
            typeof entitlementError.message === "string"
              ? entitlementError.message
              : null
          }
        />
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
        <SettingsNotificationsPanel
          pushNotifications={preferences.pushNotifications}
          onPushNotificationsChange={(val) =>
            void setPushNotificationsEnabled(val)
          }
          canManagePushNotifications={canManagePushNotifications}
          preferencesHydrating={preferencesHydrating}
          settingsStatus={settingsStatus}
        />
      );
      break;

    case "settings-playback":
      content = (
        <SettingsPlaybackPanel
          autoplayPreview={preferences.autoplayPreview}
          onAutoplayPreviewChange={(val) =>
            void setAutoplayPreviewEnabled(val)
          }
          explicitFilter={preferences.explicitFilter}
          onExplicitFilterChange={(val) =>
            void setExplicitFilterEnabled(val)
          }
          preferencesHydrating={preferencesHydrating}
        />
      );
      break;
  }

  const fallbackRoute = "/settings";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <DetailRouteHeader title={meta.title} fallbackRoute={fallbackRoute} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {slug !== "settings-notifications" && slug !== "settings-playback" && slug !== "subscription" && slug !== "help" && (
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
