import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";

interface TrackStatusPanelProps {
  track: DashboardTrack;
  onAction: (action: "publish" | "unpublish" | "requeue") => void;
}

const CARD_BG = "#131820";

export function TrackStatusPanel({ track, onAction }: TrackStatusPanelProps) {
  // Use mockup date by default if unavailable
  const publishedDateText = "Jun 3, 2026 at 2:41 PM";

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Track Status</Text>

      <View style={styles.list}>
        {/* Row 1: Status */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Ionicons name="checkmark-circle" size={18} color="#47C27A" />
            <Text style={styles.label}>Status</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.value, styles.greenText]}>Published</Text>
            <AnimatedPressable style={styles.pillBtn} onPress={() => onAction("unpublish")}>
              <Text style={styles.btnText}>Update Status</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Row 2: Published */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Ionicons name="calendar-outline" size={18} color="#00B3A6" />
            <Text style={styles.label}>Published</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.value, styles.whiteText]}>{publishedDateText}</Text>
            <AnimatedPressable style={styles.pillBtn} onPress={() => {}}>
              <Text style={styles.btnText}>Edit Date</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Row 3: Visibility */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Ionicons name="globe-outline" size={18} color="#00B3A6" />
            <Text style={styles.label}>Visibility</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.value, styles.greenText]}>Public</Text>
            <AnimatedPressable style={styles.pillBtn} onPress={() => {}}>
              <Text style={styles.btnText}>Change</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginVertical: 4,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  list: {
    gap: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
    paddingBottom: 10,
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 11,
    fontWeight: "600",
  },
  greenText: {
    color: "#00B3A6",
  },
  whiteText: {
    color: "#FFFFFF",
  },
  pillBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
