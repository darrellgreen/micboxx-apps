import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import type {
  DashboardAlbumSummary,
  DashboardTrackSummary,
} from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreateEntryHref } from "@/features/bootstrap/routes";
import { formatDuration } from "@/lib/formatters";
import { ErrorState, ScreenShell } from "@/shared/ui/layout";
import { tokens } from "@/theme/tokens";

const CREATE_ALBUM_HREF = "/create/album";
const COMPLETE_PROFILE_HREF = "/account/profile";
const ANALYTICS_HREF = "/dashboard/analytics";
const TRACKS_HREF = "/catalog/tracks";

function buildTrackStatusLabel(track: DashboardTrackSummary): string {
  if (track.status.published) {
    return "Published";
  }

  if (track.status.processing === "failed") {
    return "Needs attention";
  }

  if (track.status.ready) {
    return "Ready to publish";
  }

  if (
    track.status.processing === "processing" ||
    track.status.processing === "pending"
  ) {
    return "Processing";
  }

  return "Draft";
}

function buildAlbumStatusLabel(album: DashboardAlbumSummary): string {
  if (album.status.releaseState === "published") {
    return "Published";
  }

  if (album.status.releaseState === "scheduled") {
    return "Scheduled";
  }

  return "Draft";
}

function formatCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function DashboardScreen() {
  const bootstrap = useCreatorBootstrap();
  const profile = bootstrap.profile;
  const tracks = bootstrap.tracksSummary;
  const albums = bootstrap.albumsSummary;
  const permissions = bootstrap.uploadOptions?.currentUser.permissions;
  const canCreateAlbums = Boolean(
    permissions?.canCreateAlbums || permissions?.canAdministerAlbums,
  );
  const hasTracks = (tracks?.meta.total ?? 0) > 0;
  const hasAlbums = (albums?.meta.total ?? 0) > 0;
  const hasAvatar = Boolean(profile?.avatarUrl);
  const hasBio = Boolean(profile?.bio?.trim());
  const isNewCreator = !hasTracks && !hasAlbums;
  const recentTracks = tracks?.tracks.slice(0, 4) ?? [];
  const recentAlbums = albums?.albums.slice(0, 3) ?? [];
  const uploadHref = resolveCreateEntryHref({
    createEntryTarget: bootstrap.createEntryTarget,
    tracksSummary: bootstrap.tracksSummary,
    uploadOptions: bootstrap.uploadOptions,
  });
  const checklistItems = [
    {
      key: "avatar",
      label: "Add a profile image",
      href: COMPLETE_PROFILE_HREF,
      complete: hasAvatar,
      detail: hasAvatar
        ? "Your artist image is live on your profile."
        : "Give fans a recognizable artist image before you publish.",
    },
    {
      key: "bio",
      label: "Write your bio",
      href: COMPLETE_PROFILE_HREF,
      complete: hasBio,
      detail: hasBio
        ? "Your profile already has artist context."
        : "Add a short bio so new listeners know who you are.",
    },
    {
      key: "track",
      label: "Upload your first track",
      href: uploadHref,
      complete: hasTracks,
      detail: hasTracks
        ? `${formatCountLabel(tracks?.meta.total ?? 0, "track")} already in your catalog.`
        : "Start with the release people are most likely to hear first.",
    },
    ...(canCreateAlbums
      ? [
          {
            key: "album",
            label: "Create your first album",
            href: CREATE_ALBUM_HREF,
            complete: hasAlbums,
            detail: hasAlbums
              ? `${formatCountLabel(albums?.meta.total ?? 0, "album")} already created.`
              : "Bundle tracks into a release page your audience can recognize.",
          },
        ]
      : []),
  ];
  const completedChecklistCount = checklistItems.filter((item) => item.complete).length;
  const profileName = profile?.displayName ?? "Creator";

  return (
    <ScreenShell
      title=""
      subtitle=""
      headerTitle="Dashboard"
      headerSubtitle="Creator home"
      contentStyle={styles.screenContent}
    >
      {bootstrap.error ? (
        <ErrorState
          message={bootstrap.error}
          onRetry={() => void bootstrap.refetch()}
        />
      ) : null}

      <View style={styles.hero}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <View style={styles.heroBadges}>
          <View style={styles.heroBadge}>
            <Ionicons name="musical-notes-outline" size={14} color={tokens.colors.accent} />
            <Text style={styles.heroBadgeText}>Creator dashboard</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>
              {completedChecklistCount} of {checklistItems.length} completed
            </Text>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {isNewCreator ? "Start your first release" : `Welcome back, ${profileName}`}
          </Text>
          <Text style={styles.heroText}>
            {isNewCreator
              ? "Upload your first track or create an album to begin building your catalog on MicBoxx. Your dashboard should tell you what to do next immediately."
              : "Keep building your artist presence with visible creation tools, profile progress, and a quick read on what is live in your catalog."}
          </Text>
          <Text style={styles.heroPunchline}>
            Your music will not grow itself. Start with your first release.
          </Text>
        </View>

        <View style={styles.heroActions}>
          <AnimatedPressable
            style={styles.primaryButton}
            onPress={() => router.push(uploadHref as never)}
          >
            <Ionicons name="cloud-upload-outline" size={17} color={tokens.colors.textPrimary} />
            <Text style={styles.primaryButtonLabel}>Upload track</Text>
          </AnimatedPressable>
          {canCreateAlbums ? (
            <AnimatedPressable
              style={styles.secondaryButton}
              onPress={() => router.push(CREATE_ALBUM_HREF)}
            >
              <Ionicons name="disc-outline" size={17} color={tokens.colors.textPrimary} />
              <Text style={styles.secondaryButtonLabel}>Create album</Text>
            </AnimatedPressable>
          ) : null}
          <AnimatedPressable
            style={styles.secondaryButton}
            onPress={() => router.push(COMPLETE_PROFILE_HREF)}
          >
            <Ionicons name="person-outline" size={17} color={tokens.colors.textPrimary} />
            <Text style={styles.secondaryButtonLabel}>Complete profile</Text>
          </AnimatedPressable>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard
          label="Tracks"
          value={String(tracks?.meta.total ?? 0)}
          detail={
            (tracks?.meta.total ?? 0) > 0
              ? `${tracks?.meta.summary.published ?? 0} published and ${
                  (tracks?.meta.total ?? 0) - (tracks?.meta.summary.published ?? 0)
                } still in progress.`
              : "No tracks yet. Upload one to begin building your catalog."
          }
        />
        <SummaryCard
          label="Albums"
          value={String(albums?.meta.total ?? 0)}
          detail={
            (albums?.meta.total ?? 0) > 0
              ? `${albums?.meta.summary.published ?? 0} published ${
                  (albums?.meta.summary.published ?? 0) === 1 ? "album" : "albums"
                } ready for listeners.`
              : "No albums yet. Create one when you are ready to group tracks."
          }
        />
        <SummaryCard
          label="Profile readiness"
          value={`${[hasAvatar, hasBio].filter(Boolean).length}/2`}
          detail={
            hasAvatar && hasBio
              ? "Your artist profile has the basics covered."
              : "Finish your image and bio so your public artist page feels complete."
          }
        />
      </View>

      <View style={styles.twoColumnSection}>
        <View style={styles.panel}>
          <SectionHeader
            eyebrow="Getting started"
            title="What to do next"
            description="Critical creator actions stay visible above the fold so your first release never depends on opening navigation."
          />
          <View style={styles.checklistStack}>
            {checklistItems.map((item) => (
              <ChecklistItem
                key={item.key}
                label={item.label}
                detail={item.detail}
                complete={item.complete}
                onPress={() => router.push(item.href as never)}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.nextEyebrow}>Next move</Text>
          <Text style={styles.nextTitle}>
            {isNewCreator ? "Get your first release live" : "Keep the work moving"}
          </Text>
          <Text style={styles.nextText}>
            {isNewCreator
              ? "New creator accounts convert best when the first meaningful action is obvious. Start with upload, then tighten the profile and album setup."
              : "You already have catalog activity. Use the creator home to keep releases moving and jump into analytics when you need a deeper read."}
          </Text>
          <View style={styles.nextLinks}>
            <QuickLink
              icon="cloud-upload-outline"
              label="Upload another track"
              onPress={() => router.push(uploadHref as never)}
            />
            {canCreateAlbums ? (
              <QuickLink
                icon="disc-outline"
                label="Create album"
                onPress={() => router.push(CREATE_ALBUM_HREF)}
              />
            ) : null}
            <QuickLink
              icon="bar-chart-outline"
              label="Review analytics"
              onPress={() => router.push(ANALYTICS_HREF)}
            />
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <SectionHeader
          eyebrow="Catalog"
          title="Recent tracks"
          description={
            hasTracks
              ? "Your newest uploads and release-ready tracks."
              : "Once you upload music, your latest tracks will surface here for quick review."
          }
          actionLabel="Open tracks"
          onAction={() => router.push(TRACKS_HREF)}
        />
        {recentTracks.length > 0 ? (
          <View style={styles.mediaList}>
            {recentTracks.map((track) => (
              <TrackRow key={track.id} track={track} />
            ))}
          </View>
        ) : (
          <EmptyPanelText>
            Upload your first track to start building a creator catalog that can
            be reviewed, published, and promoted.
          </EmptyPanelText>
        )}
      </View>

      <View style={styles.panel}>
        <SectionHeader
          eyebrow="Releases"
          title="Albums and profile"
          description={
            recentAlbums.length > 0
              ? "Your latest album work plus the profile surface fans will discover."
              : "Use albums to package tracks into fuller releases once your first upload is in motion."
          }
          actionLabel="Edit profile"
          onAction={() => router.push(COMPLETE_PROFILE_HREF)}
        />
        <View style={styles.mediaList}>
          <ProfileRow profile={profile} hasAvatar={hasAvatar} hasBio={hasBio} />
          {recentAlbums.length > 0 ? (
            recentAlbums.map((album) => (
              <AlbumRow key={album.id} album={album} />
            ))
          ) : canCreateAlbums ? (
            <EmptyPanelText>
              No albums yet. When you are ready to turn tracks into a fuller
              release, start your first album here.
            </EmptyPanelText>
          ) : null}
        </View>
      </View>
    </ScreenShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
      {actionLabel && onAction ? (
        <AnimatedPressable style={styles.sectionAction} onPress={onAction}>
          <Text style={styles.sectionActionLabel}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDetail}>{detail}</Text>
    </View>
  );
}

function ChecklistItem({
  label,
  detail,
  complete,
  onPress,
}: {
  label: string;
  detail: string;
  complete: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={styles.checklistItem} onPress={onPress}>
      <Ionicons
        name={complete ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={tokens.colors.accent}
      />
      <View style={styles.checklistCopy}>
        <Text style={styles.checklistTitle}>{label}</Text>
        <Text style={styles.checklistDetail}>{detail}</Text>
      </View>
    </AnimatedPressable>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable style={styles.quickLink} onPress={onPress}>
      <View style={styles.quickLinkLeft}>
        <Ionicons name={icon} size={17} color={tokens.colors.textPrimary} />
        <Text style={styles.quickLinkLabel}>{label}</Text>
      </View>
      <Ionicons
        name="arrow-up-outline"
        size={15}
        color={tokens.colors.textSecondary}
        style={styles.quickLinkArrow}
      />
    </AnimatedPressable>
  );
}

function TrackRow({ track }: { track: DashboardTrackSummary }) {
  return (
    <AnimatedPressable
      style={styles.mediaRow}
      onPress={() => router.push(`/catalog/tracks/${track.id}` as never)}
    >
      <ArtworkImage
        uri={track.artworkUrl}
        fallbackIcon="musical-note-outline"
        size={48}
      />
      <View style={styles.mediaCopy}>
        <Text style={styles.mediaTitle} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.mediaMeta} numberOfLines={1}>
          {track.album?.title ?? track.genre?.name ?? "Track draft"} ·{" "}
          {formatDuration(track.duration)}
        </Text>
      </View>
      <StatusPill label={buildTrackStatusLabel(track)} />
    </AnimatedPressable>
  );
}

function AlbumRow({ album }: { album: DashboardAlbumSummary }) {
  return (
    <AnimatedPressable
      style={styles.mediaRow}
      onPress={() => router.push(`/catalog/albums/${album.id}` as never)}
    >
      <ArtworkImage uri={album.artworkUrl} fallbackIcon="disc-outline" size={48} />
      <View style={styles.mediaCopy}>
        <Text style={styles.mediaTitle} numberOfLines={1}>{album.title}</Text>
        <Text style={styles.mediaMeta} numberOfLines={1}>
          {formatCountLabel(album.counts.tracks, "track")} ·{" "}
          {formatDuration(album.counts.duration)}
        </Text>
      </View>
      <StatusPill label={buildAlbumStatusLabel(album)} />
    </AnimatedPressable>
  );
}

function ProfileRow({
  profile,
  hasAvatar,
  hasBio,
}: {
  profile: ReturnType<typeof useCreatorBootstrap>["profile"];
  hasAvatar: boolean;
  hasBio: boolean;
}) {
  return (
    <AnimatedPressable
      style={styles.mediaRow}
      onPress={() => router.push(COMPLETE_PROFILE_HREF)}
    >
      <ArtworkImage
        uri={profile?.avatarUrl ?? null}
        fallbackIcon="person-outline"
        rounded
        size={48}
      />
      <View style={styles.mediaCopy}>
        <Text style={styles.mediaTitle}>Artist profile</Text>
        <Text style={styles.mediaMeta} numberOfLines={2}>
          {hasAvatar && hasBio
            ? "Profile image and bio are both in place."
            : "Finish your image and bio so your public page feels complete."}
        </Text>
      </View>
      <StatusPill label={`${[hasAvatar, hasBio].filter(Boolean).length}/2`} />
    </AnimatedPressable>
  );
}

function ArtworkImage({
  uri,
  fallbackIcon,
  rounded = false,
  size,
}: {
  uri: string | null;
  fallbackIcon: keyof typeof Ionicons.glyphMap;
  rounded?: boolean;
  size: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.artworkImage,
          {
            width: size,
            height: size,
            borderRadius: rounded ? size / 2 : 8,
          },
        ]}
        contentFit="cover"
        transition={180}
      />
    );
  }

  return (
    <View
      style={[
        styles.artworkFallback,
        {
          width: size,
          height: size,
          borderRadius: rounded ? size / 2 : 8,
        },
      ]}
    >
      <Ionicons name={fallbackIcon} size={Math.max(18, size * 0.38)} color={tokens.colors.textSecondary} />
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

function EmptyPanelText({ children }: { children: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyPanelText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: 16,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfacePrimary,
    padding: 18,
    gap: 18,
  },
  heroGlowOne: {
    position: "absolute",
    right: -48,
    top: -12,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(0,179,166,0.14)",
  },
  heroGlowTwo: {
    position: "absolute",
    left: -50,
    bottom: -52,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(121,201,107,0.10)",
  },
  heroBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    borderRadius: tokens.radii.pill,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.overlayLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: "rgba(247,250,252,0.66)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  heroCopy: {
    gap: 10,
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: -1.4,
  },
  heroText: {
    color: "rgba(247,250,252,0.68)",
    fontSize: 15,
    lineHeight: 23,
  },
  heroPunchline: {
    color: "rgba(247,250,252,0.82)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...tokens.shadows.accent,
  },
  primaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.overlayLight,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryGrid: {
    gap: 10,
  },
  summaryCard: {
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.surfaceSection,
    padding: 16,
  },
  summaryLabel: {
    color: "rgba(247,250,252,0.46)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: tokens.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
  },
  summaryDetail: {
    color: "rgba(247,250,252,0.56)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  twoColumnSection: {
    gap: 16,
  },
  panel: {
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceSection,
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    gap: 10,
  },
  sectionHeaderCopy: {
    gap: 7,
  },
  sectionEyebrow: {
    color: "rgba(247,250,252,0.48)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  sectionDescription: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 14,
    lineHeight: 22,
  },
  sectionAction: {
    alignSelf: "flex-start",
  },
  sectionActionLabel: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  checklistStack: {
    gap: 10,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  checklistCopy: {
    flex: 1,
    gap: 5,
  },
  checklistTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  checklistDetail: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  nextEyebrow: {
    color: "rgba(247,250,252,0.48)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  nextTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  nextText: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 14,
    lineHeight: 22,
  },
  nextLinks: {
    gap: 10,
  },
  quickLink: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 14,
  },
  quickLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quickLinkLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  quickLinkArrow: {
    transform: [{ rotate: "45deg" }],
  },
  mediaList: {
    gap: 10,
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mediaCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  mediaTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  mediaMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  artworkImage: {
    backgroundColor: tokens.colors.bgApp,
    borderColor: tokens.colors.borderStrong,
  },
  artworkFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgApp,
    borderColor: tokens.colors.borderStrong,
  },
  statusPill: {
    maxWidth: 104,
    borderRadius: tokens.radii.pill,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.overlayLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillText: {
    color: "rgba(247,250,252,0.62)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  emptyPanel: {
    borderRadius: tokens.radiusSystem.section,
    borderStyle: "dashed",
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyPanelText: {
    color: "rgba(247,250,252,0.58)",
    fontSize: 14,
    lineHeight: 22,
  },
});
