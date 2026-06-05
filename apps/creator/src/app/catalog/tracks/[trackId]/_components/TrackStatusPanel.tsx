import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "@micboxx/ui";
import type { DashboardTrack } from "@/contracts/creator";
import { useAccountPreferences } from "@/features/account/provider";

interface TrackStatusPanelProps {
  track: DashboardTrack;
  onAction: (action: "publish" | "unpublish" | "requeue") => void;
}

const CARD_BG = "#131820";

export function TrackStatusPanel({ track, onAction }: TrackStatusPanelProps) {
  const { preferences } = useAccountPreferences();
  const advancedModeEnabled = preferences?.advancedModeEnabled ?? false;

  let publishedDateText = "Not published";
  const dateToFormat = track.status.publishAt || track.timestamps.createdAt;
  if (dateToFormat) {
    try {
      const date = new Date(dateToFormat);
      publishedDateText = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      publishedDateText = "Not published";
    }
  }

  const visibilityVal = track.status.published ? "Public" : "Private";

  const pricingVal = track.commerce.isPurchasable
    ? `${track.commerce.price ? `$${track.commerce.price}` : "0.00"} ${track.commerce.currency || "USD"}`
    : "Not for sale";

  const subOnlyVal = track.commerce.isSubscriberOnly ? "Yes" : "No";

  let processedAtText = "Not processed";
  if (track.status.processedAt) {
    try {
      const date = new Date(track.status.processedAt);
      processedAtText = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      processedAtText = "Not processed";
    }
  }

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
            <Text style={[styles.value, styles.greenText]}>
              {track.status.published ? "Published" : "Draft"}
            </Text>
            <AnimatedPressable style={styles.pillBtn} onPress={() => onAction(track.status.published ? "unpublish" : "publish")}>
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
            <Text style={[styles.value, styles.greenText]}>{visibilityVal}</Text>
            <AnimatedPressable style={styles.pillBtn} onPress={() => {}}>
              <Text style={styles.btnText}>Change</Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Row: Pricing */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Ionicons name="cash-outline" size={18} color="#00B3A6" />
            <Text style={styles.label}>Pricing</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.value, styles.whiteText]}>{pricingVal}</Text>
          </View>
        </View>

        {/* Row: Subscriber Only */}
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <Ionicons name="people-outline" size={18} color="#00B3A6" />
            <Text style={styles.label}>Subscriber Only</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={[styles.value, styles.whiteText]}>{subOnlyVal}</Text>
          </View>
        </View>

        {advancedModeEnabled && (
          <>
            {/* Row: Processing Attempts */}
            <View style={styles.row}>
              <View style={styles.leftCol}>
                <Ionicons name="construct-outline" size={18} color="#00B3A6" />
                <Text style={styles.label}>Processing Attempts</Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.value, styles.whiteText]}>
                  {track.status.attempts} / {track.status.maxAttempts || 3}
                </Text>
              </View>
            </View>

            {/* Row: Processed At */}
            <View style={styles.row}>
              <View style={styles.leftCol}>
                <Ionicons name="time-outline" size={18} color="#00B3A6" />
                <Text style={styles.label}>Processed At</Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.value, styles.whiteText]}>{processedAtText}</Text>
              </View>
            </View>
          </>
        )}
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
