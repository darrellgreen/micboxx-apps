import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { tokens } from "@micboxx/theme";
import { Screen, AnimatedPressable, BottomActionSheet, useToast } from "@micboxx/ui";
import { useMediaPicker } from "@micboxx/media";
import { ExpoMediaPickerAdapter } from "@/features/media/ExpoMediaPickerAdapter";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import type {
  DashboardAlbum,
  DashboardAlbumOptions,
  AlbumMetadataUpdate,
} from "@/contracts/creator";
import {
  getAlbumOptions,
  getAlbumStatus,
  updateAlbumMetadata,
  replaceAlbumArtwork,
  deleteAlbum,
  publishAlbum,
} from "@/shared/api/creator-dashboard";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "May 22, 2025";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "May 22, 2025";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "May 22, 2025";
  }
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cleanDescription(desc: string | null): string {
  if (!desc) return "";
  const lines = desc.split("\n");
  const cleanedLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.startsWith("Release type:") ||
      line.startsWith("Release date:") ||
      line.startsWith("Genre:")
    ) {
      continue;
    }
    cleanedLines.push(lines[i]);
  }
  return cleanedLines.join("\n").trim();
}

export default function EditAlbumScreen() {
  const { albumId } = useLocalSearchParams<{ albumId?: string }>();
  const { showToast } = useToast();
  const bootstrap = useCreatorBootstrap();
  const artworkPicker = useMediaPicker(ExpoMediaPickerAdapter);

  const [album, setAlbum] = useState<DashboardAlbum | null>(null);
  const [options, setOptions] = useState<DashboardAlbumOptions | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trackIds, setTrackIds] = useState<number[]>([]);
  const [genreId, setGenreId] = useState<number | null>(null);
  const [secondaryGenreId, setSecondaryGenreId] = useState<number | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseCurrency, setPurchaseCurrency] = useState("USD");
  const [isPurchasable, setIsPurchasable] = useState(false);

  const [artworkDirty, setArtworkDirty] = useState(false);
  const [monetizationSheetVisible, setMonetizationSheetVisible] = useState(false);
  const [primaryGenreSheetVisible, setPrimaryGenreSheetVisible] = useState(false);
  const [secondaryGenreSheetVisible, setSecondaryGenreSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!albumId) return;
      try {
        const [nextAlbum, nextOptions] = await Promise.all([
          getAlbumStatus(albumId),
          getAlbumOptions(),
        ]);

        if (!active) return;
        setAlbum(nextAlbum);
        setOptions(nextOptions);
        setTitle(nextAlbum.title);
        setDescription(cleanDescription(nextAlbum.description));
        setTrackIds(nextAlbum.tracks.map((track) => track.trackId));
        setGenreId(nextAlbum.genre?.id ?? null);
        setSecondaryGenreId(nextAlbum.secondaryGenre?.id ?? null);
        setPurchasePrice(nextAlbum.commerce.price ?? "");
        setPurchaseCurrency(nextAlbum.commerce.currency ?? "USD");
        setIsPurchasable(nextAlbum.commerce.isPurchasable);
      } catch (nextError) {
        if (!active) return;
        showToast({
          tone: "error",
          title: "Loading Failed",
          message: nextError instanceof Error ? nextError.message : "Unable to load edit form.",
        });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [albumId, showToast]);

  const selectedTracksInfo = useMemo(() => {
    const selected = options?.tracks.filter((t) => trackIds.includes(t.id)) ?? [];
    const count = selected.length;
    const duration = selected.reduce((sum, t) => sum + t.duration, 0);
    return { count, duration };
  }, [options?.tracks, trackIds]);

  const buildArtworkFormData = (asset: any): FormData => {
    const formData = new FormData();
    formData.append("artwork", {
      uri: asset.uri,
      name: asset.fileName ?? "release-artwork.jpg",
      type: asset.mimeType ?? "image/jpeg",
    } as any);
    return formData;
  };

  async function pickArtwork() {
    try {
      const picked = await artworkPicker.pickImage({ allowsEditing: true, quality: 0.92 });
      if (picked) {
        setArtworkDirty(true);
      }
    } catch (err) {
      showToast({
        tone: "error",
        title: "Image Selection Failed",
        message: err instanceof Error ? err.message : "Unable to pick image.",
      });
    }
  }

  async function handleSave() {
    if (!albumId) return;
    setSaving(true);
    try {
      const payload: AlbumMetadataUpdate = {
        title: title.trim(),
        description: description.trim(),
        trackIds,
        genreId: genreId ?? null,
        secondaryGenreId: secondaryGenreId ?? null,
      };

      if (album?.permissions?.canEditCommerce) {
        payload.isPurchasable = isPurchasable;
        payload.purchasePrice = isPurchasable ? purchasePrice.trim() : null;
        payload.purchaseCurrency = isPurchasable ? purchaseCurrency.trim().toUpperCase() : null;
      }

      let nextAlbum = await updateAlbumMetadata(albumId, payload);

      if (artworkPicker.asset && artworkDirty) {
        nextAlbum = await replaceAlbumArtwork(albumId, buildArtworkFormData(artworkPicker.asset));
        setArtworkDirty(false);
      }

      setAlbum(nextAlbum);
      showToast({
        title: releaseState === "draft" ? "Draft saved" : "Album changes saved",
        message: releaseState === "draft" ? "Your album draft is up to date." : "Your album is up to date.",
        tone: "success",
      });

      await bootstrap.refetch();

      router.replace({
        pathname: `/catalog/albums/${albumId}`,
        params: { refreshKey: String(Date.now()) },
      } as any);
    } catch (nextError) {
      showToast({
        tone: "error",
        title: "Save Failed",
        message: nextError instanceof Error ? nextError.message : "Album could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!albumId) return;
    setPublishing(true);
    try {
      const payload: AlbumMetadataUpdate = {
        title: title.trim(),
        description: description.trim(),
        trackIds,
        genreId: genreId ?? null,
        secondaryGenreId: secondaryGenreId ?? null,
      };

      if (album?.permissions?.canEditCommerce) {
        payload.isPurchasable = isPurchasable;
        payload.purchasePrice = isPurchasable ? purchasePrice.trim() : null;
        payload.purchaseCurrency = isPurchasable ? purchaseCurrency.trim().toUpperCase() : null;
      }

      let nextAlbum = await updateAlbumMetadata(albumId, payload);

      if (artworkPicker.asset && artworkDirty) {
        nextAlbum = await replaceAlbumArtwork(albumId, buildArtworkFormData(artworkPicker.asset));
        setArtworkDirty(false);
      }

      nextAlbum = await publishAlbum(albumId);

      setAlbum(nextAlbum);
      showToast({
        title: "Album Published",
        message: `${nextAlbum.title} is now live.`,
        tone: "success",
      });

      await bootstrap.refetch();

      router.replace({
        pathname: `/catalog/albums/${albumId}`,
        params: { refreshKey: String(Date.now()) },
      } as any);
    } catch (nextError) {
      showToast({
        tone: "error",
        title: "Publish Failed",
        message: nextError instanceof Error ? nextError.message : "Album could not be published.",
      });
    } finally {
      setPublishing(false);
    }
  }

  function handleDelete() {
    if (!albumId) return;
    Alert.alert(
      "Delete Album",
      "Are you sure you want to permanently delete this album and clear all track associations?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await deleteAlbum(albumId);
              showToast({
                tone: "success",
                title: "Album Deleted",
                message: "Album was permanently removed.",
              });
              await bootstrap.refetch();
              router.replace("/(tabs)/catalog");
            } catch (err) {
              showToast({
                tone: "error",
                title: "Delete Failed",
                message: err instanceof Error ? err.message : "Unable to delete album.",
              });
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }

  const handleToggleTrack = (trackId: number, isSelected: boolean) => {
    const isPublished = album?.status.published;

    const doToggle = () => {
      setTrackIds((current) =>
        isSelected ? current.filter((id) => id !== trackId) : [...current, trackId]
      );
    };

    if (isSelected) {
      // Removing a track from this album
      if (isPublished) {
        Alert.alert(
          "Remove from published release",
          "This album is currently published. Removing this track will immediately update the live release. The track itself will not be deleted. Are you sure you want to proceed?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: doToggle },
          ]
        );
      } else {
        Alert.alert(
          "Remove from release",
          "Are you sure you want to remove this track from the album? The track itself will not be deleted.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: doToggle },
          ]
        );
      }
    } else {
      // Adding a track to this album
      if (isPublished) {
        Alert.alert(
          "Modify Published Release",
          "This album is currently published. Adding this track will immediately update the live release. Are you sure you want to proceed?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Add", onPress: doToggle },
          ]
        );
      } else {
        doToggle();
      }
    }
  };

  const renderCustomHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <AnimatedPressable
          style={styles.circularBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/catalog/albums/${albumId}`);
            }
          }}
          haptic="selection"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </AnimatedPressable>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Album</Text>
          <Text style={styles.headerSubtitle}>Update your release details</Text>
        </View>

        <View style={styles.headerRight}>
          {releaseState === "draft" ? (
            <AnimatedPressable
              style={styles.headerSaveButton}
              onPress={() => void handleSave()}
              disabled={saving || publishing}
              haptic="selection"
            >
              <Text style={styles.headerSaveButtonText}>{saving ? "Saving" : "Save Draft"}</Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              style={styles.circularBtn}
              onPress={() => router.push("/audience/notifications")}
              haptic="selection"
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </AnimatedPressable>
          )}
        </View>
      </View>
    );
  };

  const monetizationSheetItems = [
    {
      key: "not_for_sale",
      label: "Not for sale",
      icon: "lock-closed-outline" as const,
      onPress: () => setIsPurchasable(false),
    },
    {
      key: "sellable",
      label: "Sell this release",
      icon: "cash-outline" as const,
      onPress: () => setIsPurchasable(true),
    },
  ];

  const availableGenres = options?.genres ?? [];

  const primaryGenreSheetItems = availableGenres.map((g) => ({
    key: String(g.id),
    label: g.name,
    icon: "musical-notes-outline" as const,
    onPress: () => {
      setGenreId(g.id);
      // If secondary matches new primary, auto-clear it
      if (secondaryGenreId === g.id) {
        setSecondaryGenreId(null);
      }
    },
  }));

  const secondaryGenreSheetItems = [
    {
      key: "none",
      label: "None",
      icon: "close-circle-outline" as const,
      onPress: () => setSecondaryGenreId(null),
    },
    ...availableGenres
      .filter((g) => g.id !== genreId)
      .map((g) => ({
        key: String(g.id),
        label: g.name,
        icon: "musical-notes-outline" as const,
        onPress: () => setSecondaryGenreId(g.id),
      })),
  ];

  const selectedGenre = availableGenres.find((g) => g.id === genreId);
  const selectedSecondaryGenre = availableGenres.find((g) => g.id === secondaryGenreId);


  const releaseState = album?.status.releaseState || "draft";
  const displayStatus = capitalize(releaseState);

  return (
    <Screen
      header={renderCustomHeader()}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.artworkWrapper}>
            {artworkPicker.asset?.uri ? (
              <Image
                source={{ uri: artworkPicker.asset.uri }}
                style={styles.heroArtwork}
                contentFit="cover"
              />
            ) : album?.artworkUrl ? (
              <Image
                source={{ uri: album.artworkUrl }}
                style={styles.heroArtwork}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.heroArtwork, styles.artworkPlaceholder]}>
                <Ionicons name="disc-outline" size={32} color={tokens.colors.textSecondary} />
              </View>
            )}
            <AnimatedPressable style={styles.editArtworkOverlay} onPress={() => void pickArtwork()} haptic="selection">
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </AnimatedPressable>
          </View>

          <View style={styles.heroInfo}>
            <View
              style={[
                styles.badge,
                releaseState === "published" && styles.badgePublished,
                releaseState === "scheduled" && styles.badgeScheduled,
                releaseState === "draft" && styles.badgeDraft,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  releaseState === "published" && styles.badgeTextPublished,
                  releaseState === "scheduled" && styles.badgeTextScheduled,
                  releaseState === "draft" && styles.badgeTextDraft,
                ]}
              >
                {displayStatus.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {title || album?.title || "Untitled Album"}
            </Text>
            <Text style={styles.heroSubtitleText} numberOfLines={1}>
              {album?.owner?.displayName || "Artist"}
            </Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="disc-outline" size={12} color={tokens.colors.textSecondary} />
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {selectedTracksInfo.count} {selectedTracksInfo.count === 1 ? "Track" : "Tracks"}  •  {formatDuration(selectedTracksInfo.duration)}  •  {album?.timestamps?.createdAt ? formatDate(album.timestamps.createdAt) : "May 22, 2025"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>ALBUM DETAILS</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="Album Title"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.charCount}>{`${title.length}/100`}</Text>
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={[styles.inputContainer, styles.multilineContainer]}>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            maxLength={1000}
            multiline
            placeholder="Album Description"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
          />
          <Text style={styles.multilineCharCount}>{`${description.length}/1000`}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>GENRE</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Primary Genre</Text>
        <AnimatedPressable
          style={styles.selectorCard}
          onPress={() => setPrimaryGenreSheetVisible(true)}
          haptic="selection"
        >
          <View style={styles.selectorLeft}>
            <Ionicons name="musical-notes-outline" size={16} color={selectedGenre ? "#12D6C5" : tokens.colors.textSecondary} />
            <Text style={[styles.selectorValue, !selectedGenre && styles.selectorPlaceholder]}>
              {selectedGenre?.name ?? "Select a genre"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Secondary Genre <Text style={styles.optionalLabel}>(optional)</Text></Text>
        <AnimatedPressable
          style={[styles.selectorCard, !genreId && styles.selectorCardDisabled]}
          onPress={() => genreId ? setSecondaryGenreSheetVisible(true) : undefined}
          haptic={genreId ? "selection" : undefined}
        >
          <View style={styles.selectorLeft}>
            <Ionicons name="musical-notes-outline" size={16} color={selectedSecondaryGenre ? "#a78bfa" : tokens.colors.textSecondary} />
            <Text style={[styles.selectorValue, !selectedSecondaryGenre && styles.selectorPlaceholder]}>
              {selectedSecondaryGenre?.name ?? (genreId ? "None" : "Select primary genre first")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <Text style={styles.sectionLabel}>TRACKS ON THIS RELEASE</Text>

      <View style={styles.trackListContainer}>
        {options?.tracks && options.tracks.length > 0 ? (
          options.tracks.map((trackOption) => {
            const isSelected = trackIds.includes(trackOption.id);
            return (
              <AnimatedPressable
                key={trackOption.id}
                style={[styles.trackRow, isSelected && styles.trackRowSelected]}
                onPress={() => handleToggleTrack(trackOption.id, isSelected)}
                haptic="selection"
              >
                <View style={styles.trackRowLeft}>
                  {trackOption.artworkUrl ? (
                    <Image
                      source={{ uri: trackOption.artworkUrl }}
                      style={styles.trackThumb}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.trackThumb, styles.trackThumbPlaceholder]}>
                      <Ionicons name="musical-note-outline" size={14} color={tokens.colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackRowTitle} numberOfLines={1}>
                      {trackOption.title}
                    </Text>
                    <Text style={styles.trackDuration}>
                      {formatDuration(trackOption.duration)}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={isSelected ? "#12D6C5" : "rgba(255, 255, 255, 0.3)"}
                />
              </AnimatedPressable>
            );
          })
        ) : (
          <Text style={styles.noTracksText}>No tracks available to add.</Text>
        )}
      </View>

      {album?.permissions?.canEditCommerce && (
        <>
          <Text style={styles.sectionLabel}>MONETIZATION</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Settings</Text>
            <AnimatedPressable
              style={styles.selectorCard}
              onPress={() => setMonetizationSheetVisible(true)}
              haptic="selection"
            >
              <View style={styles.selectorLeft}>
                <View style={styles.greenDot} />
                <Text style={styles.selectorValue}>
                  {isPurchasable ? "Sell this release" : "Not for sale"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
            </AnimatedPressable>
          </View>

          {isPurchasable && (
            <View style={styles.commerceFields}>
              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Price</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>
              </View>

              <View style={[styles.fieldContainer, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Currency</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    value={purchaseCurrency}
                    onChangeText={setPurchaseCurrency}
                    maxLength={3}
                    placeholder="USD"
                    autoCapitalize="characters"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  />
                </View>
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.buttonContainer}>
        <AnimatedPressable
          style={[
            styles.saveChangesBtn,
            (saving || publishing || !album) && styles.saveChangesBtnDisabled,
          ]}
          onPress={() => {
            if (releaseState === "draft") {
              void handlePublish();
            } else {
              void handleSave();
            }
          }}
          disabled={saving || publishing || !album}
          haptic="selection"
        >
          <Text style={styles.saveChangesBtnText}>
            {releaseState === "draft"
              ? publishing
                ? "Publishing Album..."
                : "Publish Album"
              : saving
                ? "Saving Changes..."
                : "Save Changes"}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.deleteBtn,
            (saving || publishing || !album) && styles.deleteBtnDisabled,
          ]}
          onPress={handleDelete}
          disabled={saving || publishing || !album}
          haptic="selection"
        >
          <Text style={styles.deleteBtnText}>Delete Album</Text>
        </AnimatedPressable>
      </View>

      <BottomActionSheet
        visible={monetizationSheetVisible}
        title="Monetization Settings"
        items={monetizationSheetItems}
        onClose={() => setMonetizationSheetVisible(false)}
      />

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


    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 20,
    backgroundColor: "#0C0F14",
  },
  headerContainer: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#0C0F14",
  },
  circularBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#A9B4C0",
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  heroCard: {
    backgroundColor: "#131820",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  heroRow: {
    flexDirection: "row",
    gap: 16,
  },
  artworkWrapper: {
    position: "relative",
    width: 90,
    height: 90,
  },
  heroArtwork: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#1C2431",
  },
  artworkPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  editArtworkOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  heroInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePublished: {
    backgroundColor: "rgba(18, 214, 197, 0.1)",
  },
  badgeScheduled: {
    backgroundColor: "rgba(255, 149, 0, 0.1)",
  },
  badgeDraft: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeTextPublished: {
    color: "#12D6C5",
  },
  badgeTextScheduled: {
    color: "#FF9500",
  },
  badgeTextDraft: {
    color: "#A9B4C0",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  heroSubtitleText: {
    color: "#A9B4C0",
    fontSize: 13,
    fontWeight: "500",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  heroMetaText: {
    color: "#A9B4C0",
    fontSize: 11,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A9B4C0",
    letterSpacing: 1,
    marginTop: 8,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  inputContainer: {
    height: 48,
    backgroundColor: "#131820",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: "none" as any,
      },
    }),
  },
  charCount: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 11,
    fontWeight: "500",
  },
  multilineContainer: {
    height: 120,
    flexDirection: "column",
    alignItems: "stretch",
    paddingBottom: 12,
    paddingTop: 12,
  },
  multilineInput: {
    flex: 1,
    textAlignVertical: "top",
  },
  multilineCharCount: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: 11,
    fontWeight: "500",
    alignSelf: "flex-end",
  },
  trackListContainer: {
    gap: 8,
  },
  trackRow: {
    height: 56,
    backgroundColor: "#131820",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  trackRowSelected: {
    borderColor: "rgba(18, 214, 197, 0.3)",
    backgroundColor: "rgba(18, 214, 197, 0.03)",
  },
  trackRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  trackThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#1C2431",
  },
  trackThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  trackRowTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  trackDuration: {
    color: "#A9B4C0",
    fontSize: 10,
    fontWeight: "500",
  },
  noTracksText: {
    color: "#A9B4C0",
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  selectorCard: {
    height: 48,
    backgroundColor: "#131820",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  selectorValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#47C27A",
  },
  commerceFields: {
    flexDirection: "row",
    gap: 12,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 8,
  },
  saveChangesBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#12D6C5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#12D6C5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveChangesBtnDisabled: {
    opacity: 0.5,
  },
  saveChangesBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  selectorCardDisabled: {
    opacity: 0.45,
  },
  selectorPlaceholder: {
    color: "rgba(255, 255, 255, 0.3)",
    fontWeight: "400",
  },
  optionalLabel: {
    color: tokens.colors.textSecondary,
    fontWeight: "400",
    fontSize: 12,
  },
  headerSaveButton: {
    minHeight: 34,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveButtonText: {
    color: tokens.colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  deleteBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: "#FF3B30",
    fontSize: 15,
    fontWeight: "600",
  },
});
