import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import type { DashboardTrack } from "@/contracts/creator";

interface ReleaseHealthPanelProps {
  track: DashboardTrack;
}

const CARD_BG = "#131820";

export function ReleaseHealthPanel({ track }: ReleaseHealthPanelProps) {
  // Checks
  const hasArtwork = track.assets.artworkUrl !== null;
  const hasAudio = track.assets.sourceAudioUrl !== null || track.assets.processedAudioUrl !== null;
  const hasMetadata = Boolean(track.title && track.genre && track.description);
  
  const processingState = track.status.processing;
  const isProcessingReady = processingState === "ready";
  const isProcessingFailed = processingState === "failed";

  const renderCheckItem = (
    label: string,
    description: string,
    status: "success" | "warning" | "danger",
    valueText: string
  ) => {
    let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";
    let iconColor: string = tokens.colors.success;

    if (status === "warning") {
      iconName = "alert-circle";
      iconColor = tokens.colors.warning;
    } else if (status === "danger") {
      iconName = "close-circle";
      iconColor = tokens.colors.danger;
    }

    return (
      <View style={styles.row}>
        <Ionicons name={iconName} size={22} color={iconColor} style={styles.icon} />
        <View style={styles.info}>
          <Text style={styles.itemTitle}>{label}</Text>
          <Text style={styles.itemDesc}>{description}</Text>
        </View>
        <Text style={[styles.value, { color: iconColor }]}>{valueText}</Text>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Release Health</Text>
      <Text style={styles.sectionSubtitle}>Validation checks for distribution</Text>

      <View style={styles.list}>
        {renderCheckItem(
          "Artwork Asset",
          "High resolution cover art image",
          hasArtwork ? "success" : "warning",
          hasArtwork ? "Ready" : "Missing"
        )}

        {renderCheckItem(
          "Audio Master",
          "Source audio upload and encoding",
          hasAudio ? "success" : "warning",
          hasAudio ? "Ready" : "Missing"
        )}

        {renderCheckItem(
          "Core Metadata",
          "Track title, genre, and description",
          hasMetadata ? "success" : "warning",
          hasMetadata ? "Complete" : "Incomplete"
        )}

        {renderCheckItem(
          "Processing Status",
          "Audio transcoding and waveform pipeline",
          isProcessingReady ? "success" : isProcessingFailed ? "danger" : "warning",
          isProcessingReady ? "Ready" : isProcessingFailed ? "Failed" : "Processing"
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: tokens.radiusSystem.container,
    padding: 16,
    gap: 12,
    marginVertical: 4,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
  },
  sectionSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.xs,
    marginTop: -8,
  },
  list: {
    gap: 16,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.semibold,
  },
  itemDesc: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.xs,
  },
  value: {
    fontSize: tokens.typography.sm,
    fontWeight: tokens.typography.bold,
  },
});
