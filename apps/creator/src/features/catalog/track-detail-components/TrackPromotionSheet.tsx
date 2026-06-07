import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  DashboardPromotionCampaign,
  DashboardPromotionEligibleTrack,
  DashboardPromotionList,
  DashboardPromotionPackage,
  DashboardTrack,
} from "@/contracts/creator";
import { env } from "@/config/env";
import {
  createPromotionFundingSession,
  requestTrackPromotion,
} from "@/shared/api/creator-dashboard";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, BottomSheetSurface, useToast } from "@micboxx/ui";

type PromotionActionKind = "boost" | "view" | "unavailable";

interface PromotionViewModel {
  eligibleTrack: DashboardPromotionEligibleTrack | null;
  campaign: DashboardPromotionCampaign | null;
  actionKind: PromotionActionKind;
  statusLabel: string;
  summary: string;
  statusTone: "default" | "success" | "warning" | "danger" | "muted";
}

interface TrackPromotionSheetProps {
  visible: boolean;
  track: DashboardTrack;
  dashboard: DashboardPromotionList | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

function formatCurrency(amount: string, currency: string) {
  const numeric = Number.parseFloat(amount);
  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numeric);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function packageCostMinor(item: DashboardPromotionPackage | null) {
  if (!item) return 0;
  const numeric = Number.parseFloat(item.price.amount);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
}

function latestCampaignForTrack(
  dashboard: DashboardPromotionList,
  trackId: number,
) {
  return dashboard.campaigns.find((campaign) => campaign.track.id === trackId) ?? null;
}

function buildUnavailableSummary(reason: string | null) {
  if (!reason) return "This track is not ready for promotion yet.";
  if (reason.toLowerCase().includes("active")) {
    return "This track already has a boost in progress.";
  }

  return reason;
}

function buildPromotionViewModel(
  track: DashboardTrack,
  dashboard: DashboardPromotionList | null,
): PromotionViewModel {
  if (!dashboard) {
    return {
      eligibleTrack: null,
      campaign: null,
      actionKind: "unavailable",
      statusLabel: "Unavailable",
      summary: "Promotion status is still loading.",
      statusTone: "muted",
    };
  }

  const eligibleTrack =
    dashboard.eligibleTracks.find((item) => item.id === track.id) ?? null;
  const campaign = latestCampaignForTrack(dashboard, track.id);

  if (campaign?.status === "awaiting_review") {
    return {
      eligibleTrack,
      campaign,
      actionKind: "view",
      statusLabel: "Awaiting review",
      summary: "Waiting for approval before this boost can go live.",
      statusTone: "warning",
    };
  }

  if (campaign?.status === "active") {
    return {
      eligibleTrack,
      campaign,
      actionKind: "view",
      statusLabel: "Active boost",
      summary: "This boost is live now.",
      statusTone: "success",
    };
  }

  if (
    campaign?.status === "completed" ||
    campaign?.status === "rejected" ||
    campaign?.status === "canceled"
  ) {
    const canBoostAgain = Boolean(dashboard.policy.eligible && eligibleTrack?.canCreateCampaign);
    const fallback =
      campaign.status === "rejected"
        ? "This boost was declined. Review the status details before trying again."
        : campaign.status === "canceled"
          ? "This boost was canceled before it went live."
          : "The last boost finished. You can review the result or start another one.";

    return {
      eligibleTrack,
      campaign,
      actionKind: canBoostAgain ? "boost" : "view",
      statusLabel:
        campaign.status === "rejected"
          ? "Rejected"
          : campaign.status === "canceled"
            ? "Canceled"
            : "Completed",
      summary: campaign.reason ?? fallback,
      statusTone: campaign.status === "rejected" ? "danger" : "muted",
    };
  }

  if (campaign) {
    return {
      eligibleTrack,
      campaign,
      actionKind: "view",
      statusLabel: campaign.status === "payment_failed" ? "Unavailable" : "Awaiting review",
      summary:
        campaign.reason ??
        (campaign.status === "payment_failed"
          ? "This boost needs payment attention before another campaign can be created."
          : "This boost is still being prepared."),
      statusTone: campaign.status === "payment_failed" ? "danger" : "warning",
    };
  }

  if (dashboard.policy.eligible && eligibleTrack?.canCreateCampaign) {
    return {
      eligibleTrack,
      campaign: null,
      actionKind: "boost",
      statusLabel: "Ready to boost",
      summary: "No boost is running on this track right now.",
      statusTone: "default",
    };
  }

  return {
    eligibleTrack,
    campaign,
    actionKind: "unavailable",
    statusLabel: "Unavailable",
    summary:
      dashboard.policy.reason ??
      buildUnavailableSummary(eligibleTrack?.reason ?? null),
    statusTone: "muted",
  };
}

function buildIdempotencyKey(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }

  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function buildReturnUrl(trackId: number, status?: "success" | "cancel") {
  const base = AuthSession.makeRedirectUri({
    scheme: env.appScheme,
    path: `catalog/tracks/${trackId}`,
  });

  return status ? `${base}?promotionFunding=${status}` : base;
}

export function TrackPromotionSheet({
  visible,
  track,
  dashboard,
  loading,
  error,
  onClose,
  onRefresh,
}: TrackPromotionSheetProps) {
  const { showToast } = useToast();
  const viewModel = useMemo(
    () => buildPromotionViewModel(track, dashboard),
    [dashboard, track],
  );
  const [selectedPackageKey, setSelectedPackageKey] = useState(
    dashboard?.packages[0]?.key ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [fundingPresetKey, setFundingPresetKey] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedPackage =
    dashboard?.packages.find((item) => item.key === selectedPackageKey) ??
    dashboard?.packages[0] ??
    null;
  const selectedPackageCostMinor = packageCostMinor(selectedPackage);
  const hasEnoughBalance =
    Boolean(selectedPackage && dashboard) &&
    (dashboard?.balance.availableMinor ?? 0) >= selectedPackageCostMinor;
  const shortageMinor = Math.max(
    0,
    selectedPackageCostMinor - (dashboard?.balance.availableMinor ?? 0),
  );

  async function handleLaunchBoost() {
    if (!selectedPackage || !dashboard) {
      setLocalError("Choose a boost package before continuing.");
      return;
    }

    setSubmitting(true);
    setLocalError(null);

    try {
      await requestTrackPromotion({
        trackId: track.id,
        packageKey: selectedPackage.key,
      });
      await onRefresh();
      showToast({
        tone: "success",
        title: dashboard.policy.mode === "review_required" ? "Boost submitted" : "Boost launched",
        message:
          dashboard.policy.mode === "review_required"
            ? "Your track boost is waiting for review."
            : "Your track boost is active.",
      });
      onClose();
    } catch (nextError) {
      setLocalError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to start this boost right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddFunds(presetKey: string) {
    setFundingPresetKey(presetKey);
    setLocalError(null);

    try {
      const successUrl = buildReturnUrl(track.id, "success");
      const cancelUrl = buildReturnUrl(track.id, "cancel");
      const response = await createPromotionFundingSession({
        presetKey,
        successUrl,
        cancelUrl,
        idempotencyKey: buildIdempotencyKey(`promotion-topup:${track.id}:${presetKey}`),
      });

      if (!response.checkout.url) {
        throw new Error("Promotion checkout did not return a payment URL.");
      }

      const result = await WebBrowser.openAuthSessionAsync(
        response.checkout.url,
        buildReturnUrl(track.id),
        { preferEphemeralSession: true },
      );

      await onRefresh();

      if (result.type === "success" && result.url.includes("promotionFunding=cancel")) {
        showToast({
          tone: "info",
          title: "Funding canceled",
          message: "Your promotion balance did not change.",
        });
      } else if (result.type === "success") {
        showToast({
          tone: "success",
          title: "Funding checkout finished",
          message: "Your balance will update when payment clears.",
        });
      } else {
        showToast({
          tone: "info",
          title: "Checkout closed",
          message: "Refresh promotions once payment is complete.",
        });
      }
    } catch (nextError) {
      setLocalError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to add promotion funds right now.",
      );
    } finally {
      setFundingPresetKey(null);
    }
  }

  const footer =
    viewModel.actionKind === "boost" && hasEnoughBalance ? (
      <Pressable
        disabled={submitting || !selectedPackage}
        onPress={() => void handleLaunchBoost()}
        style={[styles.primaryButton, submitting && styles.disabled]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name="megaphone" size={17} color="#fff" />
        )}
        <Text style={styles.primaryLabel}>
          {dashboard?.policy.mode === "review_required"
            ? "Submit boost"
            : "Launch boost"}
        </Text>
      </Pressable>
    ) : null;

  return (
    <BottomSheetSurface
      visible={visible}
      onDismiss={onClose}
      scrollable
      contentStyle={styles.content}
      footer={footer}
    >
      <View style={styles.headerRow}>
        <View style={styles.artworkFrame}>
          {track.assets.artworkUrl ? (
            <Image
              source={{ uri: track.assets.artworkUrl }}
              style={styles.artwork}
              contentFit="cover"
            />
          ) : (
            <View style={styles.artworkFallback}>
              <Ionicons
                name="musical-note"
                size={24}
                color={tokens.colors.textSecondary}
              />
            </View>
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Track promotion</Text>
          <Text style={styles.title} numberOfLines={2}>
            {viewModel.actionKind === "boost"
              ? `Boost ${track.title}`
              : `${track.title} promotion`}
          </Text>
          <StatusPill
            label={viewModel.statusLabel}
            tone={viewModel.statusTone}
          />
        </View>
      </View>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={tokens.colors.accent} />
                <Text style={styles.secondaryText}>Loading promotion status...</Text>
              </View>
            ) : null}

            {error ? <Notice tone="error" text={error} /> : null}
            {localError ? <Notice tone="error" text={localError} /> : null}

            <Notice tone="info" text={viewModel.summary} />

            {viewModel.campaign ? (
              <CampaignStatus campaign={viewModel.campaign} />
            ) : null}

            {viewModel.actionKind === "boost" && dashboard ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Choose boost package</Text>
                  <View style={styles.optionList}>
                    {dashboard.packages.map((item) => {
                      const selected =
                        (selectedPackage?.key ?? selectedPackageKey) === item.key;
                      return (
                        <AnimatedPressable
                          key={item.key}
                          haptic="selection"
                          onPress={() => setSelectedPackageKey(item.key)}
                          style={[
                            styles.packageOption,
                            selected && styles.packageOptionSelected,
                          ]}
                        >
                          <View style={styles.optionHeader}>
                            <Text style={styles.optionTitle}>{item.label}</Text>
                            {selected ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color={tokens.colors.accent}
                              />
                            ) : null}
                          </View>
                          <Text style={styles.optionMeta}>
                            {formatCurrency(item.price.amount, item.price.currency)} / {item.durationDays}-day run
                          </Text>
                          <Text style={styles.optionDescription}>
                            {item.description}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>

                <View
                  style={[
                    styles.balancePanel,
                    hasEnoughBalance
                      ? styles.balancePanelReady
                      : styles.balancePanelNeedsFunds,
                  ]}
                >
                  <Text style={styles.balanceTitle}>
                    Ready to spend now: {formatCurrency(dashboard.balance.available, dashboard.balance.currency)}
                  </Text>
                  <Text style={styles.balanceText}>
                    {selectedPackage
                      ? hasEnoughBalance
                        ? dashboard.policy.mode === "review_required"
                          ? "This boost will be submitted now. The amount stays on hold until it is approved."
                          : "This boost will start right away and use your promotion balance."
                        : `You need ${(shortageMinor / 100).toLocaleString("en-US", { style: "currency", currency: dashboard.balance.currency })} more to launch this boost.`
                      : "Choose a boost to continue."}
                  </Text>
                </View>

                {!hasEnoughBalance ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Add promotion funds</Text>
                    <View style={styles.optionList}>
                      {dashboard.fundingPresets.map((preset) => {
                        const pending = fundingPresetKey === preset.key;
                        return (
                          <AnimatedPressable
                            key={preset.key}
                            disabled={fundingPresetKey !== null}
                            haptic="selection"
                            onPress={() => void handleAddFunds(preset.key)}
                            style={[
                              styles.fundingOption,
                              fundingPresetKey !== null && styles.disabled,
                            ]}
                          >
                            <View>
                              <Text style={styles.optionTitle}>{preset.label}</Text>
                              <Text style={styles.optionMeta}>
                                {formatCurrency(preset.amount, preset.currency)} added to your promotion balance
                              </Text>
                            </View>
                            {pending ? (
                              <ActivityIndicator color={tokens.colors.textPrimary} />
                            ) : (
                              <Ionicons
                                name="card-outline"
                                size={20}
                                color={tokens.colors.textPrimary}
                              />
                            )}
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
    </BottomSheetSurface>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: PromotionViewModel["statusTone"];
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === "success" && styles.statusSuccess,
        tone === "warning" && styles.statusWarning,
        tone === "danger" && styles.statusDanger,
        tone === "muted" && styles.statusMuted,
      ]}
    >
      <Text
        style={[
          styles.statusLabel,
          tone === "success" && styles.statusLabelSuccess,
          tone === "warning" && styles.statusLabelWarning,
          tone === "danger" && styles.statusLabelDanger,
          tone === "muted" && styles.statusLabelMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Notice({ tone, text }: { tone: "info" | "error"; text: string }) {
  return (
    <View style={[styles.notice, tone === "error" && styles.noticeError]}>
      <Text style={[styles.noticeText, tone === "error" && styles.noticeTextError]}>
        {text}
      </Text>
    </View>
  );
}

function CampaignStatus({ campaign }: { campaign: DashboardPromotionCampaign }) {
  const submitted = formatDate(campaign.requestedAt) ?? "-";
  const windowLabel =
    campaign.startAt || campaign.endAt
      ? `${formatDate(campaign.startAt) ?? "-"} to ${formatDate(campaign.endAt) ?? "-"}`
      : "Timing will appear here when available.";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Current boost</Text>
      <View style={styles.statusGrid}>
        <KeyValue label="Package" value={campaign.package.label} />
        <KeyValue label="Submitted" value={submitted} />
        <KeyValue label="Window" value={windowLabel} />
        <KeyValue label="Spend" value={campaign.results.spend} />
        <KeyValue
          label="Impressions"
          value={
            campaign.results.impressions == null
              ? "-"
              : String(campaign.results.impressions)
          }
        />
        <KeyValue
          label="Promoted plays"
          value={
            campaign.results.promotedPlays == null
              ? "-"
              : String(campaign.results.promotedPlays)
          }
        />
      </View>
    </View>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.keyValue}>
      <Text style={styles.keyLabel}>{label}</Text>
      <Text style={styles.keyValueText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    gap: 14,
  },
  artworkFrame: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  artwork: {
    width: "100%",
    height: "100%",
  },
  artworkFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  eyebrow: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  secondaryText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  optionList: {
    gap: 9,
  },
  packageOption: {
    gap: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    padding: 13,
  },
  packageOptionSelected: {
    borderColor: tokens.colors.borderAccent,
    backgroundColor: tokens.colors.accentDim,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  optionMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  optionDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  balancePanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 13,
    gap: 5,
  },
  balancePanelReady: {
    borderColor: "rgba(71,194,122,0.35)",
    backgroundColor: "rgba(71,194,122,0.10)",
  },
  balancePanelNeedsFunds: {
    borderColor: "rgba(230,184,92,0.35)",
    backgroundColor: "rgba(230,184,92,0.10)",
  },
  balanceTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  balanceText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  fundingOption: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusGrid: {
    gap: 8,
  },
  keyValue: {
    borderRadius: 12,
    backgroundColor: tokens.colors.bgElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    padding: 12,
    gap: 4,
  },
  keyLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  keyValueText: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  notice: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgElevated,
    padding: 12,
  },
  noticeError: {
    borderColor: "rgba(217,92,92,0.35)",
    backgroundColor: "rgba(217,92,92,0.10)",
  },
  noticeText: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeTextError: {
    color: tokens.colors.danger,
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusSuccess: {
    backgroundColor: "rgba(71,194,122,0.15)",
  },
  statusWarning: {
    backgroundColor: "rgba(230,184,92,0.15)",
  },
  statusDanger: {
    backgroundColor: "rgba(217,92,92,0.15)",
  },
  statusMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusLabel: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  statusLabelSuccess: {
    color: tokens.colors.success,
  },
  statusLabelWarning: {
    color: tokens.colors.warning,
  },
  statusLabelDanger: {
    color: tokens.colors.danger,
  },
  statusLabelMuted: {
    color: tokens.colors.textSecondary,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.colors.accent,
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  disabled: {
    opacity: 0.6,
  },
});
