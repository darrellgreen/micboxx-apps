import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMediaPicker, type MediaAsset } from "@micboxx/media";

import type { DashboardAlbum, DashboardAlbumOptions } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import {
  createAlbum,
  deleteAlbum,
  getAlbumOptions,
  getAlbumStatus,
  publishAlbum,
  reorderAlbumTracks,
  replaceAlbumArtwork,
  scheduleAlbum,
  updateAlbumMetadata,
} from "@/shared/api/creator-dashboard";
import { DraggableTrackList } from "@/components/DraggableTrackList";
import {
  FORM_SELECTOR_BACKGROUND,
  FORM_SELECTOR_BORDER_COLOR,
  FormSelectorRow,
} from "@/shared/ui/selector-row";
import { AnimatedPressable, AppHeader, BottomActionSheet, BottomSheetSurface, Screen, useToast } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

type ReleaseType = "single" | "ep" | "album";
type WizardStep = 1 | 2 | 3 | 4;
type PickerMode = "date" | "time";

const RELEASE_TYPES: Array<{
  key: ReleaseType;
  title: string;
  helper: string;
}> = [
  { key: "single", title: "Single", helper: "1 track" },
  { key: "ep", title: "EP", helper: "2 - 6 tracks" },
  { key: "album", title: "Album", helper: "7+ tracks" },
];

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: "Details" },
  { step: 2, label: "Tracks" },
  { step: 3, label: "Schedule" },
  { step: 4, label: "Review" },
];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatReleaseDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatReleaseTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReleaseDateTime(date: Date): string {
  return `${formatReleaseDate(date)} at ${formatReleaseTime(date)}`;
}

function getDefaultReleaseDate(): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(9, 0, 0, 0);
  return next;
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds) {
    return "0:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildArtworkFormData(asset: MediaAsset): FormData {
  const formData = new FormData();
  formData.append("artwork", {
    uri: asset.uri,
    name: asset.fileName ?? "release-artwork.jpg",
    type: asset.mimeType ?? "image/jpeg",
  } as any);
  return formData;
}

export default function CreateReleaseScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const bootstrap = useCreatorBootstrap();
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);

  const params = useLocalSearchParams<{
    draftAlbumId?: string;
    highlightTrackId?: string;
    refreshKey?: string;
    uploadingTrackTitle?: string;
    uploadError?: string;
    step?: string;
  }>();

  const scrollRef = useRef<RNScrollView>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [releaseType, setReleaseType] = useState<ReleaseType>("single");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [releaseDate, setReleaseDate] = useState(getDefaultReleaseDate);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("date");
  const [albumOptions, setAlbumOptions] = useState<DashboardAlbumOptions | null>(null);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [secondaryGenreId, setSecondaryGenreId] = useState<number | null>(null);
  const [primaryGenreSheetVisible, setPrimaryGenreSheetVisible] = useState(false);
  const [secondaryGenreSheetVisible, setSecondaryGenreSheetVisible] = useState(false);
  const [description, setDescription] = useState("");
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savedRelease, setSavedRelease] = useState<DashboardAlbum | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!params.draftAlbumId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [artworkDirty, setArtworkDirty] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [overflowSheetVisible, setOverflowSheetVisible] = useState(false);

  const loadDraft = useCallback(async (albumId: string) => {
    setLoadingDraft(true);
    try {
      const album = await getAlbumStatus(albumId);
      setSavedRelease(album);
      setTitle(album.title);
      setGenreId(album.genre?.id ?? null);
      setSecondaryGenreId(album.secondaryGenre?.id ?? null);
      setSubtitle(album.subtitle ?? "");
      setDescription(album.description ?? "");
      if (album.releaseType === "ep" || album.releaseType === "album" || album.releaseType === "single") {
        setReleaseType(album.releaseType);
      }
      if (album.status.publishAt) {
        const parsed = new Date(album.status.publishAt);
        if (!isNaN(parsed.getTime())) {
          setReleaseDate(parsed);
        }
      }

      if ((album.subtitle ?? "").trim() || (album.description ?? "").trim()) {
        setAdditionalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load draft album:", err);
      showToast({
        tone: "error",
        title: "Load Failed",
        message: "Unable to load draft release.",
      });
    } finally {
      setLoadingDraft(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (params.draftAlbumId) {
      void loadDraft(params.draftAlbumId);
    }
  }, [params.draftAlbumId, loadDraft]);

  useEffect(() => {
    if (params.step) {
      const stepNum = parseInt(params.step, 10);
      if (stepNum >= 1 && stepNum <= 4) {
        setCurrentStep(stepNum as WizardStep);
      }
    }
  }, [params.step]);

  const availableGenres = albumOptions?.genres ?? bootstrap.uploadOptions?.genres ?? [];
  const selectedGenre = availableGenres.find((genre) => genre.id === genreId);
  const selectedSecondaryGenre = availableGenres.find((genre) => genre.id === secondaryGenreId);
  const primaryGenreSheetItems = availableGenres.map((genre) => ({
    key: String(genre.id),
    label: genre.name,
    icon: "musical-notes-outline" as const,
    onPress: () => {
      setGenreId(genre.id);
      if (secondaryGenreId === genre.id) {
        setSecondaryGenreId(null);
      }
      markDirty();
    },
  }));
  const secondaryGenreSheetItems = [
    {
      key: "none",
      label: "None",
      icon: "close-circle-outline" as const,
      onPress: () => {
        setSecondaryGenreId(null);
        markDirty();
      },
    },
    ...availableGenres
      .filter((genre) => genre.id !== genreId)
      .map((genre) => ({
        key: String(genre.id),
        label: genre.name,
        icon: "musical-notes-outline" as const,
        onPress: () => {
          setSecondaryGenreId(genre.id);
          markDirty();
        },
      })),
  ];

  const canPublish = Boolean(
    savedRelease &&
      savedRelease.counts.tracks > 0 &&
      savedRelease.status.canPublish &&
      savedRelease.permissions.canPublish,
  );
  const isScheduledRelease = releaseDate.getTime() > Date.now() + 60_000;
  const footerLabel =
    currentStep === 4
      ? isScheduledRelease ? "Schedule Release" : "Publish Now"
      : "Continue";

  useEffect(() => {
    let active = true;

    async function loadAlbumOptions() {
      try {
        const options = await getAlbumOptions();
        if (active) {
          setAlbumOptions(options);
        }
      } catch {
        if (active) {
          setAlbumOptions(null);
        }
      }
    }

    void loadAlbumOptions();
    return () => {
      active = false;
    };
  }, []);

  function markDirty() {
    setHasUnsavedChanges(true);
  }

  function handleReleaseTypeChange(nextType: ReleaseType) {
    if (nextType === releaseType) {
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReleaseType(nextType);
    markDirty();
  }

  function closeReleaseFlow() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.dismissTo("/(tabs)/dashboard");
    }
  }

  function handleBack() {
    if (!hasUnsavedChanges || savedRelease) {
      closeReleaseFlow();
      return;
    }

    Alert.alert(
      "Discard release?",
      "You have unsaved release details. Leave without saving this draft?",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: closeReleaseFlow },
      ],
    );
  }

  function openDatePicker(mode: PickerMode) {
    setPickerMode(mode);
    setDatePickerVisible(true);
  }

  function handleReleaseDateTimeChange(selectedDate: Date) {
    setReleaseDate((current) => {
      const next = new Date(current);

      if (pickerMode === "date") {
        next.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );
      } else {
        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      }

      return next;
    });
    markDirty();
  }

  async function pickArtwork() {
    const picked = await artworkPicker.pickImage({ allowsEditing: true, quality: 0.92 });
    if (picked) {
      setArtworkDirty(true);
      markDirty();
    }
  }

  function validateDetails(requireArtwork: boolean): boolean {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError("Release title is required.");
      return false;
    }
    if (trimmedTitle.length > 100) {
      setValidationError("Release title must be 100 characters or fewer.");
      return false;
    }
    if (subtitle.trim().length > 100) {
      setValidationError("Release subtitle must be 100 characters or fewer.");
      return false;
    }
    if (requireArtwork && !artworkPicker.asset && !savedRelease?.artworkUrl) {
      setValidationError("Artwork is required to save a release draft.");
      return false;
    }

    setValidationError(null);
    return true;
  }

  async function saveDraft(): Promise<DashboardAlbum | null> {
    if (!validateDetails(true)) {
      return null;
    }

    setSaving(true);
    try {
      let nextRelease = savedRelease;
      if (nextRelease) {
        nextRelease = await updateAlbumMetadata(nextRelease.id, {
          title: title.trim(),
          subtitle: subtitle.trim(),
          description: description.trim(),
          releaseType,
          genreId: genreId ?? null,
          secondaryGenreId: secondaryGenreId ?? null,
        });
        if (artworkPicker.asset && artworkDirty) {
          nextRelease = await replaceAlbumArtwork(
            nextRelease.id,
            buildArtworkFormData(artworkPicker.asset),
          );
          setArtworkDirty(false);
        }
      } else {
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("subtitle", subtitle.trim());
        formData.append("description", description.trim());
        formData.append("releaseType", releaseType);
        if (genreId !== null) {
          formData.append("genreId", String(genreId));
        }
        if (secondaryGenreId !== null) {
          formData.append("secondaryGenreId", String(secondaryGenreId));
        }
        formData.append("artwork", {
          uri: artworkPicker.asset!.uri,
          name: artworkPicker.asset!.fileName ?? "release-artwork.jpg",
          type: artworkPicker.asset!.mimeType ?? "image/jpeg",
        } as any);
        nextRelease = await createAlbum(formData);
        setArtworkDirty(false);
      }

      setSavedRelease(nextRelease);
      setGenreId(nextRelease.genre?.id ?? genreId);
      setSecondaryGenreId(nextRelease.secondaryGenre?.id ?? secondaryGenreId);
      setHasUnsavedChanges(false);
      await bootstrap.refetch();
      showToast({
        tone: "success",
        title: "Draft saved",
        message: "Your release draft is ready for tracks.",
      });
      return nextRelease;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save release draft.";
      setValidationError(message);
      showToast({
        tone: "error",
        title: "Draft not saved",
        message,
      });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    setValidationError(null);

    if (currentStep < 4) {
      // Auto-save if the user has made changes before advancing
      if (hasUnsavedChanges || artworkDirty) {
        // Non-blocking: attempt save but don't prevent navigation
        void saveDraft();
      }

      // Refresh canPublish when entering Review so the checklist is current
      if (currentStep === 3 && savedRelease) {
        try {
          const fresh = await getAlbumStatus(savedRelease.id);
          setSavedRelease(fresh);
        } catch {
          // non-fatal
        }
      }

      setCurrentStep((s) => Math.min(s + 1, 4) as WizardStep);
      return;
    }

    // Step 4: publish immediately or schedule
    await publishOrSchedule();
  }

  function navigateToStep(step: WizardStep) {
    setValidationError(null);
    setCurrentStep(step);
  }

  async function publishOrSchedule() {
    // Run full validation only at publish time, not on navigation
    if (!savedRelease) {
      setValidationError("Save a draft before publishing.");
      return;
    }
    if (!title.trim()) {
      setValidationError("Release title is required.");
      return;
    }
    if (!artworkPicker.asset?.uri && !savedRelease.artworkUrl) {
      setValidationError("Artwork is required before publishing.");
      return;
    }
    if (genreId === null) {
      setValidationError("A primary genre is required before publishing.");
      return;
    }
    const readyCount = savedRelease.tracks.filter(
      (t) => t.status?.ready || t.status?.publicReady,
    ).length;
    if (releaseType === "single" && readyCount !== 1) {
      setValidationError("A single requires exactly 1 ready track.");
      return;
    }
    if (releaseType === "ep" && readyCount < 2) {
      setValidationError("An EP requires at least 2 ready tracks.");
      return;
    }
    if (releaseType === "album" && readyCount < 1) {
      setValidationError("An album requires at least 1 ready track.");
      return;
    }
    if (!canPublish) {
      setValidationError("This release isn't ready to publish yet.");
      return;
    }

    setPublishing(true);
    try {
      if (isScheduledRelease) {
        const publishAt = Math.floor(releaseDate.getTime() / 1000);
        const nextRelease = await scheduleAlbum(savedRelease.id, publishAt);
        setSavedRelease(nextRelease);
        setHasUnsavedChanges(false);
        await bootstrap.refetch();
        showToast({
          tone: "success",
          title: "Release scheduled",
          message: `${nextRelease.title} is scheduled for ${formatReleaseDateTime(releaseDate)}.`,
        });
        router.dismissAll();
        router.replace("/(tabs)/catalog" as never);
      } else {
        const nextRelease = await publishAlbum(savedRelease.id);
        setSavedRelease(nextRelease);
        setHasUnsavedChanges(false);
        await bootstrap.refetch();
        showToast({
          tone: "success",
          title: "Release published",
          message: `${nextRelease.title} is now live.`,
        });
        router.dismissAll();
        router.replace(`/catalog/albums/${nextRelease.id}` as never);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to publish release.";
      setValidationError(message);
      showToast({ tone: "error", title: "Publish failed", message });
    } finally {
      setPublishing(false);
    }
  }

  async function handleAddTrack() {
    let release = savedRelease;
    if (!release) {
      release = await saveDraft();
    }

    if (!release) {
      return;
    }

    router.push(`/create/upload-push?albumId=${release.id}&origin=create-release` as never);
  }

  function handleDeleteDraft() {
    if (!savedRelease) {
      closeReleaseFlow();
      return;
    }

    const isScheduled = savedRelease.status.releaseState === "scheduled";
    Alert.alert(
      isScheduled ? "Delete Scheduled Release" : "Delete Draft",
      isScheduled
        ? "This will permanently delete this scheduled release and all of its attached tracks. This cannot be undone."
        : "This will permanently delete the draft release and all of its attached tracks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAlbum(savedRelease.id);
              showToast({ tone: "success", title: isScheduled ? "Release deleted" : "Draft deleted", message: "The release has been permanently removed." });
              router.replace("/(tabs)/catalog");
            } catch (err) {
              showToast({
                tone: "error",
                title: "Delete failed",
                message: err instanceof Error ? err.message : "Unable to delete draft.",
              });
            }
          },
        },
      ],
    );
  }

  const savedReleaseIsScheduled = savedRelease?.status.releaseState === "scheduled";

  const overflowSheetItems = [
    {
      key: "save",
      label: savedReleaseIsScheduled ? "Save Changes" : "Save Draft",
      icon: "save-outline" as const,
      onPress: () => {
        setOverflowSheetVisible(false);
        void saveDraft();
      },
    },
    ...(savedReleaseIsScheduled ? [{
      key: "publish-now",
      label: "Publish Now",
      icon: "radio-button-on-outline" as const,
      onPress: async () => {
        setOverflowSheetVisible(false);
        if (!savedRelease) return;
        setPublishing(true);
        try {
          const nextRelease = await publishAlbum(savedRelease.id);
          setSavedRelease(nextRelease);
          setHasUnsavedChanges(false);
          await bootstrap.refetch();
          showToast({
            tone: "success",
            title: "Release published",
            message: `${nextRelease.title} is now live.`,
          });
          router.dismissAll();
          router.replace(`/catalog/albums/${nextRelease.id}` as never);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to publish release.";
          showToast({ tone: "error", title: "Publish failed", message });
        } finally {
          setPublishing(false);
        }
      },
    }] : []),
    ...(savedRelease && ["draft", "scheduled"].includes(savedRelease.status.releaseState ?? "draft") ? [{
      key: "delete",
      label: savedReleaseIsScheduled ? "Delete Scheduled Release" : "Delete Release",
      icon: "trash-outline" as const,
      tone: "destructive" as const,
      onPress: () => {
        setOverflowSheetVisible(false);
        handleDeleteDraft();
      },
    }] : []),
  ];

  return (
    <Screen
      scroll={false}
      noPaddingBottom
      noPaddingHorizontal
      header={
        <AppHeader
          variant="flow"
          title="Create Release"
          fallbackRoute="/(tabs)/dashboard"
          onClose={handleBack}
          flowSideWidth={104}
          rightContent={
            <AnimatedPressable
              style={styles.circularBtn}
              onPress={() => setOverflowSheetVisible(true)}
              haptic="selection"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
            </AnimatedPressable>
          }
        />
      }
      contentContainerStyle={styles.screenFrame}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 104 + insets.bottom },
          ]}
        >
          <Text style={styles.subtitle}>Build your release. Add details, tracks, and artwork.</Text>

          <Stepper currentStep={currentStep} onStepPress={navigateToStep} />

          {/* ── Step 1: Details ─────────────────────────────────────── */}
          {currentStep === 1 ? (
            <>
              <SectionCard title="Release Type" helper="What kind of release are you creating?">
                <View style={styles.releaseTypeGrid}>
                  {RELEASE_TYPES.map((type) => {
                    const selected = releaseType === type.key;
                    return (
                      <AnimatedPressable
                        key={type.key}
                        style={[styles.releaseTypeCard, selected && styles.releaseTypeCardSelected]}
                        onPress={() => handleReleaseTypeChange(type.key)}
                        haptic="selection"
                      >
                        {selected ? (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          </View>
                        ) : null}
                        <Ionicons
                          name="disc-outline"
                          size={30}
                          color={selected ? tokens.colors.accent : tokens.colors.textSecondary}
                        />
                        <Text style={[styles.releaseTypeTitle, selected && styles.accentText]}>{type.title}</Text>
                        <Text style={styles.releaseTypeHelper}>{type.helper}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </SectionCard>

              <SectionCard title="Release Details" helper="The identity of your release.">
                <View style={styles.artworkRow}>
                  <Pressable style={styles.artworkBox} onPress={() => void pickArtwork()}>
                    {artworkPicker.asset?.uri ? (
                      <Image source={{ uri: artworkPicker.asset.uri }} style={styles.artworkImage} contentFit="cover" />
                    ) : savedRelease?.artworkUrl ? (
                      <Image source={{ uri: savedRelease.artworkUrl }} style={styles.artworkImage} contentFit="cover" />
                    ) : (
                      <Ionicons name="images-outline" size={28} color={tokens.colors.textSecondary} />
                    )}
                  </Pressable>
                  <View style={styles.artworkCopy}>
                    <Text style={styles.fieldTitle}>Artwork</Text>
                    <Text style={styles.fieldHelper}>Upload a square image.{"\n"}3000x3000px recommended.</Text>
                    <AnimatedPressable style={styles.uploadButton} onPress={() => void pickArtwork()} haptic="selection">
                      <Ionicons name="push-outline" size={18} color={tokens.colors.accent} />
                      <Text style={styles.uploadButtonText}>Upload Image</Text>
                    </AnimatedPressable>
                  </View>
                </View>

                <LabeledInput
                  label="Release Title"
                  value={title}
                  onChangeText={(value) => { setTitle(value.slice(0, 100)); markDirty(); }}
                  placeholder="Enter release title"
                  countMax={100}
                />
                <LabeledInput
                  label="Release Subtitle (Optional)"
                  value={subtitle}
                  onChangeText={(value) => { setSubtitle(value.slice(0, 100)); markDirty(); }}
                  placeholder="e.g. Deluxe Edition, Acoustic, Live"
                  countMax={100}
                />
                <FormSelectorRow
                  icon="musical-notes-outline"
                  label="Primary Genre"
                  value={selectedGenre?.name ?? "Select a genre"}
                  onPress={() => setPrimaryGenreSheetVisible(true)}
                  placeholder={!selectedGenre}
                />
                <FormSelectorRow
                  icon="musical-notes-outline"
                  label="Secondary Genre (Optional)"
                  value={selectedSecondaryGenre?.name ?? (genreId ? "None" : "Select primary genre first")}
                  onPress={() => { if (genreId) setSecondaryGenreSheetVisible(true); }}
                  disabled={!genreId}
                  placeholder={!selectedSecondaryGenre}
                />
              </SectionCard>

              <View style={styles.accordion}>
                <AnimatedPressable
                  style={styles.accordionHeader}
                  onPress={() => setAdditionalOpen((v) => !v)}
                  haptic="selection"
                >
                  <View>
                    <Text style={styles.cardTitle}>Additional Info <Text style={styles.optionalText}>(Optional)</Text></Text>
                    <Text style={styles.cardHelper}>Notes, credits, or rollout context.</Text>
                  </View>
                  <Ionicons name={additionalOpen ? "chevron-up" : "chevron-down"} size={16} color={tokens.colors.textSecondary} />
                </AnimatedPressable>
                {additionalOpen ? (
                  <TextInput
                    value={description}
                    onChangeText={(value) => { setDescription(value); markDirty(); }}
                    multiline
                    placeholder="Release notes, credits, story, or rollout context."
                    placeholderTextColor={tokens.colors.textMuted}
                    style={styles.textArea}
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {/* ── Step 2: Tracks ──────────────────────────────────────── */}
          {currentStep === 2 ? (
            <ReleaseTrackManagementSection
              releaseType={releaseType}
              release={savedRelease}
              saving={saving}
              outerScrollRef={scrollRef}
              highlightTrackId={params.highlightTrackId}
              pendingTrackTitle={params.uploadingTrackTitle}
              pendingTrackError={params.uploadError}
              onAddTrack={() => void handleAddTrack()}
              onReleaseUpdate={setSavedRelease}
            />
          ) : null}

          {/* ── Step 3: Schedule ────────────────────────────────────── */}
          {currentStep === 3 ? (
            <SectionCard title="Release Timing" helper="Choose when your release goes live.">
              <FormSelectorRow
                icon="calendar-outline"
                label="Release Date"
                value={formatReleaseDate(releaseDate)}
                onPress={() => openDatePicker("date")}
              />
              <FormSelectorRow
                icon="time-outline"
                label="Release Time"
                value={formatReleaseTime(releaseDate)}
                onPress={() => openDatePicker("time")}
              />
              <View style={styles.scheduleSummary}>
                <Ionicons
                  name={isScheduledRelease ? "calendar-outline" : "radio-button-on-outline"}
                  size={16}
                  color={tokens.colors.accent}
                />
                <Text style={styles.scheduleSummaryText}>
                  {isScheduledRelease
                    ? `Will go live on ${formatReleaseDateTime(releaseDate)}`
                    : "Will be published immediately"}
                </Text>
              </View>
            </SectionCard>
          ) : null}

          {/* ── Step 4: Review & Publish ────────────────────────────── */}
          {currentStep === 4 ? (
            <>
              <SectionCard title="Release Summary" helper="Review before publishing.">
                <View style={styles.reviewArtworkRow}>
                  {(artworkPicker.asset?.uri ?? savedRelease?.artworkUrl) ? (
                    <Image
                      source={{ uri: artworkPicker.asset?.uri ?? savedRelease?.artworkUrl ?? "" }}
                      style={styles.reviewArtwork}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewTitle} numberOfLines={2}>{title.trim() || "Untitled"}</Text>
                    <Text style={styles.reviewSubtitle}>{releaseType.toUpperCase()}</Text>
                    {selectedGenre ? <Text style={styles.reviewDetail}>{selectedGenre.name}</Text> : null}
                  </View>
                </View>
                <ReviewRow icon="musical-notes-outline" label="Tracks" value={`${savedRelease?.counts.tracks ?? 0}`} />
                <ReviewRow icon="calendar-outline" label="Goes live" value={isScheduledRelease ? formatReleaseDateTime(releaseDate) : "Immediately"} />
                <ReviewRow icon="radio-button-on-outline" label="Status" value={savedRelease?.status.releaseState ?? "draft"} />
              </SectionCard>

              <SectionCard title="Readiness" helper="Everything required before publishing.">
                <ReadinessRow ok={!!(artworkPicker.asset?.uri ?? savedRelease?.artworkUrl)} label="Artwork" />
                <ReadinessRow ok={!!title.trim()} label="Title" />
                <ReadinessRow ok={genreId !== null} label="Primary genre" />
                <ReadinessRow
                  ok={(savedRelease?.counts.tracks ?? 0) > 0}
                  label={
                    releaseType === "single" ? "1 track required"
                    : releaseType === "ep" ? "At least 2 tracks required"
                    : "At least 1 track required"
                  }
                />
                {savedRelease?.tracks.some(
                  (t) => t.status?.processing === "pending" || t.status?.processing === "processing",
                ) ? (
                  <ReadinessRow ok={false} label="Tracks still processing — wait for ready status" warn />
                ) : null}
              </SectionCard>

              {!canPublish ? (
                <View style={styles.blockingNotice}>
                  <Ionicons name="lock-closed-outline" size={16} color={tokens.colors.textSecondary} />
                  <Text style={styles.blockingNoticeText}>
                    Complete the readiness checklist above before publishing.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {/* ── Always-mounted sheets (avoid dismount mid-interaction) ── */}
          <BottomSheetSurface
            visible={datePickerVisible}
            onDismiss={() => setDatePickerVisible(false)}
            enableDynamicSizing={false}
            enableContentPanningGesture={false}
            snapPoints={[320]}
          >
            <View style={styles.datePickerSheetContent}>
              <Text style={styles.datePickerTitle}>
                {pickerMode === "date" ? "Release Date" : "Release Time"}
              </Text>
              <DateTimePicker
                value={releaseDate}
                mode={pickerMode}
                display="spinner"
                minimumDate={pickerMode === "date" ? new Date() : undefined}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) handleReleaseDateTimeChange(selectedDate);
                  if (Platform.OS === "android") setDatePickerVisible(false);
                }}
                style={styles.datePickerControl}
                themeVariant="dark"
              />
            </View>
          </BottomSheetSurface>

          <BottomActionSheet
            visible={primaryGenreSheetVisible}
            title="Primary Genre"
            items={primaryGenreSheetItems}
            onClose={() => setPrimaryGenreSheetVisible(false)}
          />

          <BottomActionSheet
            visible={secondaryGenreSheetVisible}
            title="Secondary Genre"
            items={secondaryGenreSheetItems}
            onClose={() => setSecondaryGenreSheetVisible(false)}
          />

          <BottomActionSheet
            visible={overflowSheetVisible}
            title="Release Options"
            items={overflowSheetItems}
            onClose={() => setOverflowSheetVisible(false)}
          />

        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          {validationError ? (
            <Text style={styles.validationError}>{validationError}</Text>
          ) : null}
          <AnimatedPressable
            disabled={loadingDraft || saving || publishing}
            style={[
              styles.primaryCta,
              (loadingDraft || saving || publishing) && styles.primaryCtaDisabled,
            ]}
            onPress={() => void handleContinue()}
            haptic="selection"
          >
            <Text style={styles.primaryCtaText}>{publishing ? "Publishing…" : saving ? "Saving…" : loadingDraft ? "Loading…" : footerLabel}</Text>
            {currentStep < 4 ? (
              <Ionicons name="arrow-forward-outline" size={22} color="#FFFFFF" style={styles.primaryCtaIcon} />
            ) : null}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stepper({
  currentStep,
  onStepPress,
}: {
  currentStep: WizardStep;
  onStepPress: (step: WizardStep) => void;
}) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((item, index) => {
        const active = item.step === currentStep;
        const complete = item.step < currentStep;
        return (
          <AnimatedPressable
            key={item.step}
            style={styles.stepItem}
            onPress={() => onStepPress(item.step)}
            haptic="selection"
          >
            <View style={[styles.stepCircle, (active || complete) && styles.stepCircleActive]}>
              {complete ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>{item.step}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive, complete && styles.stepLabelComplete]}>
              {item.label}
            </Text>
            {index < STEPS.length - 1 ? (
              <View style={[styles.stepLine, complete && styles.stepLineComplete]} />
            ) : null}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function SectionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardHelper}>{helper}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  countMax,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  countMax: number;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.countText}>{value.length}/{countMax}</Text>
      </View>
    </View>
  );
}

function resolveTrackStatus(track: any): {
  label: string;
  tone: "ready" | "working" | "failed" | "draft";
} {
  if (track.status?.processing === "failed") {
    return { label: "Failed", tone: "failed" };
  }

  if (track.status?.processing === "pending" || track.status?.processing === "processing") {
    return { label: "Processing audio...", tone: "working" };
  }

  if (track.status?.ready || track.status?.publicReady) {
    return { label: "Ready", tone: "ready" };
  }

  return { label: "Draft", tone: "draft" };
}

function TrackRow({
  track,
  index,
  highlighted,
}: {
  track: any;
  index: number;
  highlighted: boolean;
}) {
  const status = resolveTrackStatus(track);
  
  return (
    <View style={[styles.trackSlot, highlighted && styles.rowHighlighted]}>
      <View style={styles.left}>
        {track.artworkUrl ? (
          <Image source={{ uri: track.artworkUrl }} style={styles.trackSlotArtwork} contentFit="cover" />
        ) : (
          <View style={[styles.trackSlotArtwork, styles.trackSlotArtworkPlaceholder]}>
            <Ionicons name="musical-note-outline" size={14} color={tokens.colors.textSecondary} />
          </View>
        )}
        <View style={styles.shapeCopy}>
          <Text style={styles.trackSlotTitle} numberOfLines={1}>{track.title}</Text>
          <View style={styles.statusLine}>
            <View style={[styles.statusDot, styles[`statusDot_${status.tone}`]]} />
            <Text style={[styles.trackStatus, styles[`trackStatus_${status.tone}`]]}>
              {status.label}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ReleaseTrackManagementSection({
  releaseType,
  release,
  saving,
  highlightTrackId,
  pendingTrackTitle,
  pendingTrackError,
  outerScrollRef,
  onAddTrack,
  onReleaseUpdate,
}: {
  releaseType: ReleaseType;
  release: DashboardAlbum | null;
  saving: boolean;
  outerScrollRef?: React.RefObject<RNScrollView>;
  highlightTrackId?: string;
  pendingTrackTitle?: string;
  pendingTrackError?: string;
  onAddTrack: () => void;
  onReleaseUpdate?: (album: DashboardAlbum) => void;
}) {
  const { showToast } = useToast();
  const [localTracks, setLocalTracks] = useState(release?.tracks ?? []);

  // Keep a stable ref for release so handleReorder always reads the current id
  // without needing to be recreated every time the parent saves.
  const releaseRef = useRef(release);
  releaseRef.current = release;

  // Sync localTracks when the parent replaces the release object (draft load,
  // successful save, etc.) — but only when the track list itself changes, not
  // on every render, to avoid clearing an in-progress drag.
  const prevReleaseIdRef = useRef<number | null>(release?.id ?? null);
  useEffect(() => {
    if (!release) return;
    // Always sync when the album ID changes (new draft loaded).
    // Also sync when the server track list length changes (track added/removed).
    const idChanged = release.id !== prevReleaseIdRef.current;
    prevReleaseIdRef.current = release.id;
    if (idChanged || release.tracks.length !== localTracks.length) {
      setLocalTracks(release.tracks);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release]);

  // Poll for track processing completion — runs only inside this component so
  // the parent screen never re-renders during polling.
  const localTracksRef = useRef(localTracks);
  localTracksRef.current = localTracks;
  const onReleaseUpdateRef = useRef(onReleaseUpdate);
  onReleaseUpdateRef.current = onReleaseUpdate;

  // When highlightTrackId arrives (upload just completed), do an immediate fetch
  // so the new track appears without waiting for the first poll interval.
  useEffect(() => {
    const albumId = release?.id;
    if (!albumId || !highlightTrackId) return;
    void getAlbumStatus(albumId).then((updated) => {
      setLocalTracks(updated.tracks);
      onReleaseUpdateRef.current?.(updated);
    }).catch(() => {});
  }, [highlightTrackId, release?.id]);

  useEffect(() => {
    const albumId = release?.id;
    if (!albumId) return;

    const interval = setInterval(async () => {
      const current = localTracksRef.current;
      const isProcessing = current.some(
        (t) => t.status?.processing === "pending" || t.status?.processing === "processing",
      );
      const isUploading =
        !!pendingTrackTitle && !current.some((t) => t.title === pendingTrackTitle);
      const isHighlightedPending =
        !!highlightTrackId &&
        !current.some(
          (t) =>
            String(t.trackId) === highlightTrackId &&
            t.status?.processing !== "pending" &&
            t.status?.processing !== "processing",
        );

      if (!isProcessing && !isUploading && !isHighlightedPending) return;

      try {
        const updatedAlbum = await getAlbumStatus(albumId);
        const hadProcessing = localTracksRef.current.some(
          (t) => t.status?.processing === "pending" || t.status?.processing === "processing",
        );
        const nowDone = !updatedAlbum.tracks.some(
          (t) => t.status?.processing === "pending" || t.status?.processing === "processing",
        );
        setLocalTracks(updatedAlbum.tracks);
        if (hadProcessing && nowDone) {
          onReleaseUpdateRef.current?.(updatedAlbum);
        }
      } catch {
        // silent — polling is best-effort
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [release?.id, pendingTrackTitle, highlightTrackId]);

  const tracks = localTracks;
  const trackCount = tracks.length;
  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const runtimeText = formatDuration(totalDuration);

  const handleRemoveTrack = useCallback(
    (trackId: number) => {
      const currentRelease = releaseRef.current;
      if (!currentRelease) return;
      Alert.alert(
        "Remove from release",
        "Are you sure you want to remove this track from the release? The track itself will not be deleted.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                const updatedTrackIds = currentRelease.tracks
                  .map((t) => t.trackId)
                  .filter((id) => id !== trackId);
                const updatedAlbum = await updateAlbumMetadata(currentRelease.id, {
                  trackIds: updatedTrackIds,
                });
                onReleaseUpdateRef.current?.(updatedAlbum);
                setLocalTracks(updatedAlbum.tracks);
              } catch (err) {
                showToast({
                  tone: "error",
                  title: "Remove Failed",
                  message: err instanceof Error ? err.message : "Failed to remove track.",
                });
              }
            },
          },
        ],
      );
    },
    [showToast],
  );

  const handleReorder = useCallback(
    async (reorderedTracks: import("@/contracts/creator").DashboardAlbumTrack[]) => {
      const currentRelease = releaseRef.current;
      if (!currentRelease) return;
      const payload = reorderedTracks.map((t, idx) => ({
        trackId: t.trackId,
        position: idx + 1,
      }));
      try {
        const updatedAlbum = await reorderAlbumTracks(currentRelease.id, payload);
        onReleaseUpdateRef.current?.(updatedAlbum);
      } catch (err) {
        showToast({
          tone: "error",
          title: "Reorder Failed",
          message: err instanceof Error ? err.message : "Failed to save track order.",
        });
      }
    },
    [showToast],
  );

  // Single release layout
  if (releaseType === "single") {
    const track = tracks[0] ?? null;
    const isPending = !track && !!pendingTrackTitle;

    return (
      <SectionCard title="Track" helper="A single release carries one primary track.">
        <View style={styles.shapePanel}>
          {isPending ? (
            <View style={[styles.trackSlot, pendingTrackError ? styles.rowFailed : styles.rowPending]}>
              <View style={styles.left}>
                {release?.artworkUrl ? (
                  <Image source={{ uri: release.artworkUrl }} style={styles.trackSlotArtwork} contentFit="cover" />
                ) : (
                  <View style={[styles.trackSlotArtwork, styles.trackSlotArtworkPlaceholder]}>
                    <Ionicons name="musical-note-outline" size={14} color={tokens.colors.textSecondary} />
                  </View>
                )}
                <View style={styles.shapeCopy}>
                  <Text style={styles.shapeTitle}>{pendingTrackTitle}</Text>
                  <View style={styles.statusLine}>
                    <View style={[styles.statusDot, pendingTrackError ? styles.statusDot_failed : styles.statusDot_working]} />
                    <Text style={[styles.trackStatus, pendingTrackError ? styles.trackStatus_failed : styles.trackStatus_working]}>
                      {pendingTrackError ?? "Uploading..."}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : track ? (
            <TrackRow
              track={track}
              index={0}
              highlighted={String(track.trackId) === highlightTrackId}
            />
          ) : (
            <View style={styles.shapeRow}>
              <View style={styles.shapeIcon}>
                <Ionicons name="musical-note-outline" size={18} color={tokens.colors.textSecondary} />
              </View>
              <View style={styles.shapeCopy}>
                <Text style={styles.shapeTitle}>Track title and audio file</Text>
                <Text style={styles.shapeMeta}>Upload the track for this single.</Text>
              </View>
              <AnimatedPressable
                style={styles.shapeAction}
                onPress={onAddTrack}
                disabled={saving}
                haptic="selection"
              >
                <Text style={styles.shapeActionText}>Upload</Text>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </SectionCard>
    );
  }

  // EP release layout
  if (releaseType === "ep") {
    const isLimitReached = trackCount >= 6;
    return (
      <View style={styles.shapePanel}>
        <SectionCard title="Overview" helper="EPs usually carry 2-6 tracks.">
          <View style={styles.shapeMetricRow}>
            <ShapeMetric label="Tracks" value={`${trackCount}/6`} />
            <ShapeMetric label="Recommended" value="2-6" />
          </View>
        </SectionCard>

        <DraggableTrackList
          tracks={tracks}
          reorderEnabled={trackCount > 1}
          outerScrollRef={outerScrollRef}
          onReorder={handleReorder}
          onTrackRemove={handleRemoveTrack}
          highlightTrackId={highlightTrackId}
          pendingTrackTitle={pendingTrackTitle}
          pendingTrackError={pendingTrackError}
        />

        {isLimitReached ? (
          <View style={styles.warningContainer}>
            <Ionicons name="alert-circle-outline" size={16} color={tokens.colors.textSecondary} />
            <Text style={styles.warningText}>EP limit reached.</Text>
          </View>
        ) : (
          <AnimatedPressable
            style={styles.secondaryCta}
            onPress={onAddTrack}
            disabled={saving}
            haptic="selection"
          >
            <Ionicons name="add" size={16} color={tokens.colors.accent} />
            <Text style={styles.secondaryCtaText}>Add Track</Text>
          </AnimatedPressable>
        )}
      </View>
    );
  }

  // Album layout
  return (
    <View style={styles.shapePanel}>
      <SectionCard title="Overview" helper="Albums unlock sequencing, ordering, and runtime review.">
        <View style={styles.shapeMetricRow}>
          <ShapeMetric label="Tracks" value={`${trackCount}`} />
          <ShapeMetric label="Runtime" value={runtimeText} />
        </View>
      </SectionCard>

      <DraggableTrackList
        tracks={tracks}
        reorderEnabled={trackCount > 1}
        outerScrollRef={outerScrollRef}
        onReorder={handleReorder}
        onTrackRemove={handleRemoveTrack}
        highlightTrackId={highlightTrackId}
        pendingTrackTitle={pendingTrackTitle}
        pendingTrackError={pendingTrackError}
      />

        <AnimatedPressable
          style={styles.secondaryCta}
          onPress={onAddTrack}
          disabled={saving}
          haptic="selection"
        >
          <Ionicons name="add" size={16} color={tokens.colors.accent} />
          <Text style={styles.secondaryCtaText}>Add Track</Text>
        </AnimatedPressable>
    </View>
  );
}

function ShapeMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.shapeMetric}>
      <Text style={styles.shapeMetricLabel}>{label}</Text>
      <Text style={styles.shapeMetricValue}>{value}</Text>
    </View>
  );
}

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewRowLeft}>
        <Ionicons name={icon} size={14} color={tokens.colors.textSecondary} />
        <Text style={styles.reviewLabel}>{label}</Text>
      </View>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function ReadinessRow({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  const color = ok ? tokens.colors.success : warn ? tokens.colors.warning ?? tokens.colors.textSecondary : tokens.colors.danger;
  const icon = ok ? "checkmark-circle" : warn ? "warning-outline" : "close-circle";
  return (
    <View style={styles.readinessRow}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.readinessLabel, { color: ok ? tokens.colors.textPrimary : tokens.colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenFrame: {
    flex: 1,
    gap: 0,
  },
  root: {
    flex: 1,
    backgroundColor: "transparent",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
  },
  stepCircleActive: {
    backgroundColor: tokens.colors.accent,
  },
  stepNumber: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  stepNumberActive: {
    color: "#FFFFFF",
  },
  stepLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  stepLabelActive: {
    color: tokens.colors.accent,
  },
  stepLabelComplete: {
    color: tokens.colors.textPrimary,
  },
  stepLine: {
    position: "absolute",
    top: 16,
    left: "68%",
    right: "-32%",
    height: 1,
    backgroundColor: tokens.colors.borderStrong,
  },
  stepLineComplete: {
    backgroundColor: tokens.colors.accent,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: "#131820",
    padding: 16,
  },
  cardTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  cardHelper: {
    marginTop: 4,
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  cardBody: {
    marginTop: 14,
    gap: 16,
  },
  releaseTypeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  releaseTypeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  releaseTypeCardSelected: {
    borderColor: tokens.colors.accent,
    backgroundColor: "rgba(0,179,166,0.09)",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accent,
  },
  releaseTypeTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  accentText: {
    color: tokens.colors.accent,
  },
  releaseTypeHelper: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  artworkRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  artworkBox: {
    width: 92,
    height: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
  },
  artworkCopy: {
    flex: 1,
    gap: 6,
  },
  fieldTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  fieldHelper: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  uploadButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadButtonText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  inputWrap: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  countText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  datePickerSheetContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  datePickerTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  datePickerControl: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
  },
  accordion: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: "#131820",
    padding: 16,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  optionalText: {
    color: tokens.colors.textSecondary,
  },
  textArea: {
    minHeight: 96,
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FORM_SELECTOR_BORDER_COLOR,
    backgroundColor: FORM_SELECTOR_BACKGROUND,
    color: tokens.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  shapePanel: {
    gap: 12,
  },
  shapeRow: {
    minHeight: 58,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  shapeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.045)",
    alignItems: "center",
    justifyContent: "center",
  },
  shapeCopy: {
    flex: 1,
    gap: 2,
  },
  shapeTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  shapeMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  shapeAction: {
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  shapeActionText: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  shapeMetricRow: {
    flexDirection: "row",
    gap: 8,
  },
  shapeMetric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 10,
    gap: 3,
  },
  shapeMetricLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  shapeMetricValue: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  shapeList: {
    gap: 8,
  },
  trackSlot: {
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trackSlotNumber: {
    width: 20,
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  trackSlotArtwork: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  trackSlotArtworkPlaceholder: {
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  trackSlotTitle: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  shapeFeatureRow: {
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: "rgba(0,179,166,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  shapeFeatureText: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  shapeFeatureMeta: {
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  stepShell: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  stepShellTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  stepShellCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  secondaryCta: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryCtaText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  reviewRow: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  reviewRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  reviewLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
  },
  reviewValue: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: "rgba(12,15,20,0.96)",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  validationError: {
    color: tokens.colors.danger,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  primaryCta: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: tokens.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    position: "relative",
  },
  primaryCtaDisabled: {
    opacity: 0.52,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryCtaIcon: {
    position: "absolute",
    right: 18,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDot_ready: {
    backgroundColor: tokens.colors.success,
  },
  statusDot_working: {
    backgroundColor: tokens.colors.accent,
  },
  statusDot_failed: {
    backgroundColor: tokens.colors.danger,
  },
  statusDot_draft: {
    backgroundColor: tokens.colors.textMuted,
  },
  trackStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  trackStatus_ready: {
    color: tokens.colors.success,
  },
  trackStatus_working: {
    color: tokens.colors.accent,
  },
  trackStatus_failed: {
    color: tokens.colors.danger,
  },
  trackStatus_draft: {
    color: tokens.colors.textSecondary,
  },
  rowHighlighted: {
    backgroundColor: "rgba(0, 179, 166, 0.08)",
    borderBottomColor: "rgba(0, 179, 166, 0.18)",
  },
  rowPending: {
    backgroundColor: "rgba(0, 179, 166, 0.06)",
    borderBottomColor: "rgba(0, 179, 166, 0.12)",
  },
  rowFailed: {
    backgroundColor: "rgba(255, 69, 58, 0.06)",
    borderBottomColor: "rgba(255, 69, 58, 0.12)",
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  warningText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  shapeFeatureMetaDisabled: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  scheduleSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  scheduleSummaryText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  reviewArtworkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  reviewArtwork: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  reviewMeta: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  reviewSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  reviewDetail: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  readinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  readinessLabel: {
    fontSize: 13,
    flex: 1,
  },
  blockingNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  blockingNoticeText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
});
