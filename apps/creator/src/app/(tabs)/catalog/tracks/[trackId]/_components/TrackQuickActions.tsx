import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";

interface TrackQuickActionsProps {
  track: DashboardTrack;
}

export function TrackQuickActions({ track }: TrackQuickActionsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionRow}>
        <AnimatedPressable
          style={styles.actionBtn}
          onPress={() => router.push(`/catalog/tracks/${track.id}/edit` as never)}
          haptic="selection"
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="create-outline" size={20} color={tokens.colors.accent} />
          </View>
          <Text style={styles.actionLabel}>Edit Metadata</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.actionBtn}
          onPress={() => router.push("/dashboard/analytics")}
          haptic="selection"
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="bar-chart-outline" size={20} color={tokens.colors.accent} />
          </View>
          <Text style={styles.actionLabel}>View Analytics</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.actionBtn}
          onPress={() => {}}
          haptic="selection"
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="settings-outline" size={20} color={tokens.colors.accent} />
          </View>
          <Text style={styles.actionLabel}>Manage Release</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const CARD_BG = "#131820";

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginVertical: 4,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.bold,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: CARD_BG,
    borderRadius: 14,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
  },
});
