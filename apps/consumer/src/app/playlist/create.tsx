import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { useAuth } from "@/features/auth/provider";
import {
  createPlaylist,
  getPlaylistOptions,
  formatDuration,
} from "@micboxx/api";
import type {
  DashboardPlaylistTrackOption,
  DashboardPlaylistOptions,
} from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";
import { Button } from "@micboxx/ui";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreatePlaylistScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? null;

  const [options, setOptions] = useState<DashboardPlaylistOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artworkUri, setArtworkUri] = useState<string | null>(null);
  const [artworkFilename, setArtworkFilename] = useState<string>("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    let active = true;
    async function loadOptions() {
      try {
        const data = await getPlaylistOptions(accessToken!);
        if (active) {
          setOptions(data);
        }
      } catch (err) {
        if (active) {
          Alert.alert("Error", err instanceof Error ? err.message : "Unable to load creation options.");
        }
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, [accessToken]);

  const handleSelectImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Denied",
        "We need camera roll permissions to select a playlist cover image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const asset = result.assets[0];
    setArtworkUri(asset.uri);
    setArtworkFilename(asset.fileName || asset.uri.split("/").pop() || "cover.jpg");
  };

  const handleTrackToggle = (trackId: number) => {
    setSelectedTrackIds((current) => {
      if (current.includes(trackId)) {
        return current.filter((id) => id !== trackId);
      } else {
        return [...current, trackId];
      }
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a playlist title.");
      return;
    }

    if (selectedTrackIds.length === 0) {
      Alert.alert("Validation Error", "Please select at least one track for the playlist.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalArtworkUri = artworkUri;
      let finalArtworkFilename = artworkFilename;

      // Cover image fallback: use the first selected track's artwork
      if (!finalArtworkUri) {
        const firstTrackId = selectedTrackIds[0];
        const firstTrack = options?.tracks.find((t: DashboardPlaylistTrackOption) => t.id === firstTrackId);
        const firstTrackArtwork = firstTrack?.artworkUrl;

        if (firstTrackArtwork) {
          const tempFile = `${FileSystem.cacheDirectory}temp_fallback_artwork_${Date.now()}.jpg`;
          try {
            const downloadResult = await FileSystem.downloadAsync(firstTrackArtwork, tempFile);
            finalArtworkUri = downloadResult.uri;
            finalArtworkFilename = "fallback_artwork.jpg";
          } catch (err) {
            console.warn("[CreatePlaylist] Failed to download default track artwork:", err);
          }
        }
      }

      // If still no artwork, use a standard placeholder URL
      if (!finalArtworkUri) {
        const fallbackUrl = "https://i.pravatar.cc/200?u=micboxxplaylist";
        const tempFile = `${FileSystem.cacheDirectory}temp_default_artwork_${Date.now()}.jpg`;
        try {
          const downloadResult = await FileSystem.downloadAsync(fallbackUrl, tempFile);
          finalArtworkUri = downloadResult.uri;
          finalArtworkFilename = "default_artwork.jpg";
        } catch (err) {
          Alert.alert("Error", "Could not prepare default artwork for the playlist.");
          setIsSubmitting(false);
          return;
        }
      }

      // Build FormData
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());

      const extension = finalArtworkFilename.split(".").pop()?.toLowerCase() ?? "jpg";
      const type = extension === "png" ? "image/png" : "image/jpeg";

      // @ts-ignore
      formData.append("artwork", {
        uri: finalArtworkUri,
        name: finalArtworkFilename,
        type,
      });

      selectedTrackIds.forEach((id) => {
        formData.append("trackIds[]", String(id));
      });

      const newPlaylist = await createPlaylist(formData, session?.accessToken);

      Alert.alert("Success", "Playlist created successfully!", [
        {
          text: "OK",
          onPress: () => {
            router.replace({
              pathname: "/playlist/[slug]",
              params: { slug: newPlaylist.slug, playlistId: newPlaylist.id },
            });
          },
        },
      ]);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unable to create playlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTracks = useMemo(() => {
    if (!options) return [];
    return options.tracks.filter((t: DashboardPlaylistTrackOption) => {
      const titleMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      const artistMatch = t.artist?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
      return titleMatch || artistMatch;
    });
  }, [options, searchQuery]);

  if (loadingOptions) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailRouteHeader title="Create Playlist" fallbackRoute="/(tabs)/library" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const saveDisabled = !title.trim() || selectedTrackIds.length === 0 || isSubmitting;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailRouteHeader
        title="Create Playlist"
        fallbackRoute="/(tabs)/library"
        rightContent={
          <Pressable disabled={saveDisabled} onPress={handleSave}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color={tokens.colors.accent} />
            ) : (
              <Text style={[styles.saveButtonText, saveDisabled && styles.saveButtonTextDisabled]}>
                Save
              </Text>
            )}
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 1. Artwork Selector */}
        <View style={styles.artworkSection}>
          <Pressable onPress={handleSelectImage} style={styles.artworkTouch}>
            {artworkUri ? (
              <Image source={{ uri: artworkUri }} style={styles.artworkImage} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[tokens.colors.brandSecondary, tokens.colors.brandPrimary]}
                style={styles.artworkFallback}
              >
                <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.75)" />
                <Text style={styles.artworkText}>Select cover</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {/* 2. Metadata Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="My Playlist"
              placeholderTextColor={tokens.colors.textMuted}
              style={styles.textInput}
              maxLength={64}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Add an optional description..."
              placeholderTextColor={tokens.colors.textMuted}
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={3}
              maxLength={255}
            />
          </View>
        </View>

        {/* 3. Track List Selection */}
        <View style={styles.tracksSection}>
          <Text style={styles.sectionTitle}>Add Tracks *</Text>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color={tokens.colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tracks or artists..."
              placeholderTextColor={tokens.colors.textMuted}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={tokens.colors.textMuted} />
              </Pressable>
            )}
          </View>

          <View style={styles.trackList}>
            {filteredTracks.length === 0 ? (
              <Text style={styles.emptyText}>No tracks found.</Text>
            ) : (
              filteredTracks.map((track: DashboardPlaylistTrackOption) => {
                const selectedIndex = selectedTrackIds.indexOf(track.id);
                const isSelected = selectedIndex !== -1;

                return (
                  <Pressable
                    key={track.id}
                    onPress={() => handleTrackToggle(track.id)}
                    style={({ pressed }) => [styles.trackRow, pressed && { opacity: 0.8 }]}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && (
                        <Text style={styles.checkboxText}>{selectedIndex + 1}</Text>
                      )}
                    </View>

                    <Image source={{ uri: track.artworkUrl ?? "" }} style={styles.trackArt} contentFit="cover" />

                    <View style={styles.trackDetails}>
                      <Text style={styles.trackTitle} numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text style={styles.trackArtist} numberOfLines={1}>
                        {track.artist?.displayName ?? "Unknown"}
                      </Text>
                    </View>

                    <Text style={styles.trackMeta}>
                      {formatDuration(track.duration)}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>

        {/* 4. Large Create Button */}
        <View style={{ marginTop: 8 }}>
          <Button
            label={isSubmitting ? "Creating Playlist..." : "Create Playlist"}
            disabled={saveDisabled}
            onPress={handleSave}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 160,
    gap: 24,
  },
  artworkSection: {
    alignItems: "center",
  },
  artworkTouch: {
    width: 150,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkImage: {
    width: "100%",
    height: "100%",
  },
  artworkFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  artworkText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  tracksSection: {
    gap: 12,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  trackList: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: tokens.colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    borderColor: tokens.colors.accent,
    backgroundColor: tokens.colors.accent,
  },
  checkboxText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  trackArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  trackDetails: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  trackArtist: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  trackMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: tokens.colors.textMuted,
    textAlign: "center",
    paddingVertical: 30,
    fontSize: 13,
  },
  saveButtonText: {
    color: tokens.colors.accent,
    fontSize: 15,
    fontWeight: "700",
  },
  saveButtonTextDisabled: {
    color: tokens.colors.textMuted,
  },
});
