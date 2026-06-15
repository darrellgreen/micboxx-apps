import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Skeleton } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import type { EntitlementState } from "@micboxx/contracts";

export interface SubscriptionPanelProps {
  entitlement: EntitlementState | null | undefined;
  loading: boolean;
  error: string | null;
}

export function SubscriptionPanel({
  entitlement,
  loading,
  error,
}: SubscriptionPanelProps) {
  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Skeleton width="50%" height={16} borderRadius={8} />
          <Skeleton width="70%" height={12} borderRadius={6} />
          <Skeleton width="40%" height={12} borderRadius={6} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Unable to load subscription</Text>
        <Text style={styles.description}>{error}</Text>
      </View>
    );
  }

  const entitlementStatus = resolveEntitlementStatus(entitlement);

  if (!entitlement || entitlementStatus === "none") {
    return (
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>No active subscription</Text>
        <Text style={styles.description}>
          Your account is using the default free listener access.
        </Text>
      </View>
    );
  }

  const renewalDate = formatShortDate(
    entitlement.period.currentPeriodEndsAt ?? entitlement.period.expiresAt,
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Current subscription</Text>
      <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionIconWrap}>
          <Ionicons name="diamond-outline" size={24} color={tokens.colors.accent} />
        </View>
        <View style={styles.subscriptionCopy}>
          <Text style={styles.subscriptionLevel}>{entitlement.plan.label}</Text>
          <Text style={styles.subscriptionStatus}>
            {formatSubscriptionStatus(entitlement.status)}
          </Text>
          {renewalDate ? (
            <Text style={styles.subscriptionRenewal}>
              {entitlementStatus === "lapsed" ? "Access ends " : "Renews "}
              {renewalDate}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function resolveEntitlementStatus(
  entitlement: EntitlementState | null | undefined,
): "active" | "grace" | "lapsed" | "none" {
  if (!entitlement) return "none";
  const status = entitlement.status.toLowerCase();
  if (status === "active") return "active";
  if (status.includes("grace")) return "grace";
  if (
    status.includes("cancel") ||
    status.includes("expired") ||
    status.includes("lapsed")
  ) {
    return "lapsed";
  }

  return "active";
}

function formatSubscriptionStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatShortDate(secondsValue: number | null | undefined): string | null {
  if (!secondsValue) {
    return null;
  }

  return new Date(secondsValue * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    gap: 14,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  description: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  subscriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  subscriptionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  subscriptionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  subscriptionLevel: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
  },
  subscriptionStatus: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  subscriptionRenewal: {
    color: tokens.colors.textDisabled,
    fontSize: 12,
  },
});
