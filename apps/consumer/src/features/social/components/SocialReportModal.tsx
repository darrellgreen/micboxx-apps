import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  SOCIAL_REPORT_REASON_OPTIONS,
  type SocialReportReasonKey,
} from "@/contracts/social";
import { tokens } from "@/theme/tokens";

export function SocialReportModal({
  visible,
  reasonKey,
  detail,
  submitting = false,
  error = null,
  onChangeReason,
  onChangeDetail,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  reasonKey: SocialReportReasonKey;
  detail: string;
  submitting?: boolean;
  error?: string | null;
  onChangeReason: (nextValue: SocialReportReasonKey) => void;
  onChangeDetail: (nextValue: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.sheet}>
          <Text style={styles.title}>Report comment</Text>
          <Text style={styles.body}>
            Choose the reason that best describes the issue. Add a note if the
            moderators need more context.
          </Text>

          <View style={styles.reasonGrid}>
            {SOCIAL_REPORT_REASON_OPTIONS.map((option) => {
              const active = option.value === reasonKey;

              return (
                <Pressable
                  key={option.value}
                  disabled={submitting}
                  onPress={() => onChangeReason(option.value)}
                  style={({ pressed }) => [
                    styles.reasonButton,
                    active && styles.reasonButtonActive,
                    pressed && !submitting ? styles.pressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonButtonLabel,
                      active && styles.reasonButtonLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.detailWrap}>
            <Text style={styles.fieldLabel}>Optional note</Text>
            <TextInput
              value={detail}
              onChangeText={onChangeDetail}
              placeholder="Add detail for moderators."
              placeholderTextColor={tokens.colors.textMuted}
              maxLength={2000}
              multiline
              editable={!submitting}
              style={styles.detailInput}
            />
          </View>

          {error ? <Text style={styles.errorLabel}>{error}</Text> : null}

          <View style={styles.actionsRow}>
            <Pressable
              disabled={submitting}
              onPress={onClose}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && !submitting ? styles.pressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </Pressable>

            <Pressable
              disabled={submitting}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                submitting && styles.disabled,
                pressed && !submitting ? styles.pressed : null,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {submitting ? "Submitting…" : "Submit report"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.64)",
  },
  sheet: {
    gap: 14,
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonButton: {
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonButtonActive: {
    backgroundColor: tokens.colors.accentDim,
    borderColor: tokens.colors.borderAccent,
  },
  reasonButtonLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  reasonButtonLabelActive: {
    color: tokens.colors.accentLight,
  },
  detailWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: tokens.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailInput: {
    minHeight: 112,
    borderRadius: tokens.radii.lg,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    color: tokens.colors.textPrimary,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  errorLabel: {
    color: "#ffb3b3",
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  primaryButton: {
    backgroundColor: tokens.colors.accent,
  },
  secondaryButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  primaryButtonLabel: {
    color: tokens.colors.bgApp,
    fontSize: 13,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.82,
  },
});
