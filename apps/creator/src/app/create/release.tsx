import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMediaPicker, type MediaAsset } from "@micboxx/media";

import type { DashboardAlbum, DashboardAlbumOptions } from "@/contracts/creator";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import {
  createAlbum,
  getAlbumOptions,
  replaceAlbumArtwork,
  scheduleAlbum,
  updateAlbumMetadata,
} from "@/shared/api/creator-dashboard";
import { FormSelectorRow } from "@/shared/ui/selector-row";
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
  { step: 3, label: "Review" },
  { step: 4, label: "Schedule" },
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

function toAlbumDescription(input: {
  subtitle: string;
  description: string;
  releaseType: ReleaseType;
  releaseDate: Date;
}): string {
  const lines = [
    input.subtitle.trim() ? input.subtitle.trim() : null,
    input.description.trim() ? input.description.trim() : null,
    "",
    `Release type: ${input.releaseType.toUpperCase()}`,
    `Release date: ${formatReleaseDateTime(input.releaseDate)}`,
  ].filter((line): line is string => line !== null);

  return lines.join("\n").trim();
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
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [artworkDirty, setArtworkDirty] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
  const footerLabel =
    currentStep === 1
      ? "Continue"
      : currentStep === 2
        ? "Review"
        : currentStep === 3
          ? "Continue"
          : "Schedule Release";

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
      const descriptionPayload = toAlbumDescription({
        subtitle,
        description,
        releaseType,
        releaseDate,
      });

      let nextRelease = savedRelease;
      if (nextRelease) {
        nextRelease = await updateAlbumMetadata(nextRelease.id, {
          title: title.trim(),
          description: descriptionPayload,
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
        formData.append("description", descriptionPayload);
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
    if (currentStep === 1) {
      if (!validateDetails(false)) {
        return;
      }
      const draft = savedRelease && !hasUnsavedChanges && !artworkDirty
        ? savedRelease
        : await saveDraft();
      if (!draft) {
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      await scheduleRelease();
    }
  }

  async function scheduleRelease() {
    if (!savedRelease || !canPublish) {
      return;
    }

    const publishAt = Math.floor(releaseDate.getTime() / 1000);
    if (publishAt <= Math.floor(Date.now() / 1000)) {
      const message = "Choose a future release date and time.";
      setValidationError(message);
      showToast({
        tone: "error",
        title: "Release time invalid",
        message,
      });
      return;
    }

    setPublishing(true);
    try {
      const nextRelease = await scheduleAlbum(savedRelease.id, publishAt);
      setSavedRelease(nextRelease);
      setHasUnsavedChanges(false);
      await bootstrap.refetch();
      showToast({
        tone: "success",
        title: "Release scheduled",
        message: `${nextRelease.title} is scheduled for ${formatReleaseDateTime(releaseDate)}.`,
      });
      router.replace(`/catalog/albums/${nextRelease.id}` as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to schedule release.";
      setValidationError(message);
      showToast({
        tone: "error",
        title: "Release not scheduled",
        message,
      });
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

    router.push(`/create/upload-push?albumId=${release.id}` as never);
  }

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
              style={styles.headerSaveButton}
              onPress={() => void saveDraft()}
              disabled={saving}
              haptic="selection"
            >
              <Text style={styles.headerSaveButtonText}>{saving ? "Saving" : "Save Draft"}</Text>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 104 + insets.bottom },
          ]}
        >
          <Text style={styles.subtitle}>Build your release. Add details, tracks, and artwork.</Text>

          <Stepper currentStep={currentStep} />

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

              <SectionCard title="Release Details" helper="Tell us about your release.">
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
                onChangeText={(value) => {
                  setTitle(value.slice(0, 100));
                  markDirty();
                }}
                placeholder="Enter release title"
                countMax={100}
              />
              <LabeledInput
                label="Release Subtitle (Optional)"
                value={subtitle}
                onChangeText={(value) => {
                  setSubtitle(value.slice(0, 100));
                  markDirty();
                }}
                placeholder="e.g. Deluxe Edition, Acoustic, Live"
                countMax={100}
              />

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
                onPress={() => {
                  if (genreId) {
                    setSecondaryGenreSheetVisible(true);
                  }
                }}
                disabled={!genreId}
                placeholder={!selectedSecondaryGenre}
              />
              </SectionCard>

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
                      if (selectedDate) {
                        handleReleaseDateTimeChange(selectedDate);
                      }
                      if (Platform.OS === "android") {
                        setDatePickerVisible(false);
                      }
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

              <ReleaseShapeSection
                releaseType={releaseType}
                release={savedRelease}
                saving={saving}
                onAddTrack={() => void handleAddTrack()}
              />

              <View style={styles.accordion}>
              <AnimatedPressable
                style={styles.accordionHeader}
                onPress={() => setAdditionalOpen((value) => !value)}
                haptic="selection"
              >
                <View>
                  <Text style={styles.cardTitle}>Additional Info <Text style={styles.optionalText}>(Optional)</Text></Text>
                  <Text style={styles.cardHelper}>Add more details about your release.</Text>
                </View>
                <Ionicons name={additionalOpen ? "chevron-up" : "chevron-down"} size={16} color={tokens.colors.textSecondary} />
              </AnimatedPressable>
              {additionalOpen ? (
                <TextInput
                  value={description}
                  onChangeText={(value) => {
                    setDescription(value);
                    markDirty();
                  }}
                  multiline
                  placeholder="Release notes, credits, story, or rollout context."
                  placeholderTextColor={tokens.colors.textMuted}
                  style={styles.textArea}
                />
              ) : null}
              </View>
            </>
          ) : null}

        {currentStep === 2 ? (
          <SectionCard title="Add tracks to this release" helper="Upload or attach tracks before scheduling.">
            <View style={styles.stepShell}>
              <Ionicons name="musical-notes-outline" size={42} color={tokens.colors.accent} />
              <Text style={styles.stepShellTitle}>{savedRelease?.title ?? title.trim()}</Text>
              <Text style={styles.stepShellCopy}>
                Use the existing upload flow to add tracks to this release. Track association is handled by the current album-backed release endpoint.
              </Text>
              <AnimatedPressable style={styles.secondaryCta} onPress={() => void handleAddTrack()} haptic="selection">
                <Ionicons name="add" size={18} color={tokens.colors.accent} />
                <Text style={styles.secondaryCtaText}>Add Track</Text>
              </AnimatedPressable>
            </View>
          </SectionCard>
        ) : null}

        {currentStep === 3 ? (
          <SectionCard title="Review release" helper="Confirm details before publishing.">
            <ReviewRow label="Release" value={savedRelease?.title ?? (title.trim() || "Untitled")} />
            <ReviewRow label="Type" value={releaseType.toUpperCase()} />
            <ReviewRow label="Release Date" value={formatReleaseDateTime(releaseDate)} />
            <ReviewRow label="Genre" value={selectedGenre?.name ?? "Not set"} />
            <ReviewRow label="Secondary Genre" value={selectedSecondaryGenre?.name ?? "None"} />
            <ReviewRow label="Tracks" value={`${savedRelease?.counts.tracks ?? 0}`} />
            <ReviewRow label="Status" value={savedRelease?.status.releaseState ?? "draft"} />
          </SectionCard>
        ) : null}

        {currentStep === 4 ? (
          <SectionCard title="Schedule" helper="Scheduling will be available after tracks are added.">
            <View style={styles.stepShell}>
              <Ionicons
                name={canPublish ? "rocket-outline" : "lock-closed-outline"}
                size={42}
                color={canPublish ? tokens.colors.accent : tokens.colors.textSecondary}
              />
              <Text style={styles.stepShellTitle}>{canPublish ? "Ready to schedule" : "Tracks required"}</Text>
              <Text style={styles.stepShellCopy}>
                {canPublish
                  ? `This release will go live on ${formatReleaseDateTime(releaseDate)}.`
                  : "Add at least one track before scheduling this release."}
              </Text>
            </View>
          </SectionCard>
        ) : null}

          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <AnimatedPressable
            disabled={saving || publishing || (currentStep === 4 && !canPublish)}
            style={[
              styles.primaryCta,
              (saving || publishing || (currentStep === 4 && !canPublish)) && styles.primaryCtaDisabled,
            ]}
            onPress={() => void handleContinue()}
            haptic="selection"
          >
            <Text style={styles.primaryCtaText}>{publishing ? "Scheduling" : footerLabel}</Text>
            <Ionicons name="arrow-forward-outline" size={22} color="#FFFFFF" style={styles.primaryCtaIcon} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Stepper({ currentStep }: { currentStep: WizardStep }) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((item, index) => {
        const active = item.step === currentStep;
        const complete = item.step < currentStep;
        return (
          <View key={item.step} style={styles.stepItem}>
            <View style={[styles.stepCircle, (active || complete) && styles.stepCircleActive]}>
              <Text style={[styles.stepNumber, (active || complete) && styles.stepNumberActive]}>{item.step}</Text>
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{item.label}</Text>
            {index < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
          </View>
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

function ReleaseShapeSection({
  releaseType,
  release,
  saving,
  onAddTrack,
}: {
  releaseType: ReleaseType;
  release: DashboardAlbum | null;
  saving: boolean;
  onAddTrack: () => void;
}) {
  const trackCount = release?.counts.tracks ?? 0;
  const runtimeText = formatDuration(release?.counts.duration ?? 0);
  const tracks = release?.tracks ?? [];

  if (releaseType === "single") {
    const track = tracks[0] ?? null;
    return (
      <SectionCard title="Track" helper="A single release carries one primary track.">
        <View style={styles.shapePanel}>
          <View style={styles.shapeRow}>
            <View style={styles.shapeIcon}>
              <Ionicons name="musical-note-outline" size={18} color={tokens.colors.textSecondary} />
            </View>
            <View style={styles.shapeCopy}>
              <Text style={styles.shapeTitle}>{track?.title ?? "Track title and audio file"}</Text>
              <Text style={styles.shapeMeta}>
                {track ? "One-track release" : "Upload the track for this single."}
              </Text>
            </View>
            <AnimatedPressable
              style={styles.shapeAction}
              onPress={onAddTrack}
              disabled={saving}
              haptic="selection"
            >
              <Text style={styles.shapeActionText}>{track ? "Add" : "Upload"}</Text>
            </AnimatedPressable>
          </View>
        </View>
      </SectionCard>
    );
  }

  if (releaseType === "ep") {
    return (
      <SectionCard title="Tracks" helper="EPs usually carry 2-6 tracks.">
        <View style={styles.shapePanel}>
          <View style={styles.shapeMetricRow}>
            <ShapeMetric label="Tracks" value={`${trackCount}/6`} />
            <ShapeMetric label="Recommended" value="2-6" />
          </View>
          <View style={styles.shapeList}>
            {(tracks.length > 0 ? tracks : [null, null]).slice(0, 6).map((track, index) => (
              <TrackSlot
                key={track?.trackId ?? `ep-slot-${index}`}
                index={index}
                title={track?.title ?? (index === 0 ? "First track" : "Add another track")}
              />
            ))}
          </View>
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
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Track Management" helper="Albums unlock sequencing, ordering, and runtime review.">
      <View style={styles.shapePanel}>
        <View style={styles.shapeMetricRow}>
          <ShapeMetric label="Tracks" value={`${trackCount}`} />
          <ShapeMetric label="Runtime" value={runtimeText} />
        </View>
        <View style={styles.shapeList}>
          {(tracks.length > 0 ? tracks : [null, null, null]).map((track, index) => (
            <TrackSlot
              key={track?.trackId ?? `album-slot-${index}`}
              index={index}
              title={track?.title ?? (index === 0 ? "Opening track" : "Sequence track")}
              showHandle
            />
          ))}
        </View>
        <View style={styles.shapeFeatureRow}>
          <Text style={styles.shapeFeatureText}>Ordering</Text>
          <Text style={styles.shapeFeatureMeta}>Prepared</Text>
        </View>
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
    </SectionCard>
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

function TrackSlot({
  index,
  title,
  showHandle = false,
}: {
  index: number;
  title: string;
  showHandle?: boolean;
}) {
  return (
    <View style={styles.trackSlot}>
      <Text style={styles.trackSlotNumber}>{index + 1}</Text>
      <Text style={styles.trackSlotTitle} numberOfLines={1}>{title}</Text>
      {showHandle ? (
        <Ionicons name="reorder-two-outline" size={16} color={tokens.colors.textSecondary} />
      ) : null}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
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
  headerSaveButton: {
    minHeight: 34,
    paddingHorizontal: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveButtonText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
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
  stepLine: {
    position: "absolute",
    top: 16,
    left: "68%",
    right: "-32%",
    height: 1,
    backgroundColor: tokens.colors.borderStrong,
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
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.03)",
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
    borderColor: tokens.colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.03)",
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
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
  },
  trackSlotNumber: {
    width: 20,
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
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
  errorText: {
    color: tokens.colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
});
