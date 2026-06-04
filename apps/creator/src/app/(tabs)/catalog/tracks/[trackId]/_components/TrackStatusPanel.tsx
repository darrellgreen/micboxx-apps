import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { Button } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";

interface TrackStatusPanelProps {
  track: DashboardTrack;
  onAction: (action: "publish" | "unpublish" | "requeue") => void;
}

const CARD_BG = "#131820";

function formatDate(isoString: string | null): string {
  if (!isoString) return "Not yet";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Not yet";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Not yet";
  }
}

export function TrackStatusPanel({ track, onAction }: TrackStatusPanelProps) {
  const { status } = track;
  const isPublished = status.published;

  const capitalize = (s: string) => {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Release Status</Text>

      <View style={styles.list}>
        {/* Release State Row */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{capitalize(status.releaseState)}</Text>
          </View>
          <View style={styles.rightCol}>
            {status.canPublish ? (
              <Button
                label="Publish"
                tone="primary"
                size="sm"
                onPress={() => onAction("publish")}
              />
            ) : null}
            {status.canUnpublish ? (
              <Button
                label="Unpublish"
                tone="secondary"
                size="sm"
                onPress={() => onAction("unpublish")}
              />
            ) : null}
          </View>
        </View>

        {/* Processing State Row */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Text style={styles.label}>Processing</Text>
            <Text style={styles.value}>{capitalize(status.processing)}</Text>
          </View>
          <View style={styles.rightCol}>
            {status.canRequeue ? (
              <Button
                label="Requeue"
                tone="primary"
                size="sm"
                onPress={() => onAction("requeue")}
              />
            ) : null}
          </View>
        </View>

        {/* Published Date Row */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Text style={styles.label}>Published Date</Text>
            <Text style={styles.value}>{formatDate(status.processedAt)}</Text>
          </View>
          <View style={styles.rightCol} />
        </View>

        {/* Visibility Row */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Text style={styles.label}>Visibility</Text>
            <Text style={styles.value}>{isPublished ? "Public" : "Private"}</Text>
          </View>
          <View style={styles.rightCol} />
        </View>
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
  list: {
    gap: 16,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
    paddingBottom: 12,
  },
  leftCol: {
    flex: 1,
    gap: 2,
  },
  rightCol: {
    justifyContent: "center",
    alignItems: "flex-end",
    minWidth: 90,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  value: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
  },
});
