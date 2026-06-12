import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";
import type { DashboardAlbum } from "@/contracts/creator";

const CARD_BG = "#131820";

type HealthStatus = "complete" | "partial" | "missing";

interface HealthRowProps {
  label: string;
  status: HealthStatus;
  value?: string;
}

function HealthRow({ label, status, value }: HealthRowProps) {
  const complete = status === "complete";
  const partial = status === "partial";
  const iconName = complete
    ? "checkmark-circle"
    : partial
      ? "ellipse"
      : "ellipse-outline";
  const statusLabel = value ?? (complete ? "Complete" : partial ? "Partial" : "Missing");
  const statusColor = complete
    ? tokens.colors.success
    : partial
      ? tokens.colors.warning
      : tokens.colors.textSecondary;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Ionicons
          name={iconName}
          size={16}
          color={statusColor}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.statusText, { color: statusColor }]}>
        {statusLabel}
      </Text>
    </View>
  );
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function resolveMetadataStatus(album: DashboardAlbum): HealthStatus {
  const hasTitle = hasValue(album.title);
  const hasDescription = hasValue(album.description);
  const hasReleaseTiming = Boolean(album.status.publishAt || album.status.published);
  const hasTracks = album.counts.tracks > 0;

  if (hasTitle && hasDescription && hasReleaseTiming && hasTracks) {
    return "complete";
  }

  if (hasTitle || hasDescription || hasReleaseTiming) {
    return "partial";
  }

  return "missing";
}

function booleanStatus(value: boolean): HealthStatus {
  return value ? "complete" : "missing";
}

function resolveRightsStatus(album: DashboardAlbum): HealthStatus {
  if (album.readiness !== undefined) {
    const hasRightsBlocker = album.readiness.blockers.some(
      (b) => b.code === "track_rights_not_attested",
    );
    return hasRightsBlocker ? "missing" : "complete";
  }
  return booleanStatus(album.status.canPublish || album.status.published);
}

function resolveCommerceRow(album: DashboardAlbum): HealthRowProps {
  if (hasValue(album.commerce.price)) {
    return { label: "Commerce", status: "complete", value: "Yes" };
  }

  return { label: "Commerce", status: "missing", value: "No" };
}

function resolveReleaseStateRow(album: DashboardAlbum): HealthRowProps {
  if (album.status.releaseState === "published") {
    return { label: "Release State", status: "complete", value: "Published" };
  }

  if (album.status.releaseState === "scheduled") {
    return { label: "Release State", status: "partial", value: "Scheduled" };
  }

  return { label: "Release State", status: "missing", value: "Draft" };
}

export function AlbumReleaseHealthPanel({ album }: { album: DashboardAlbum }) {
  const rows = [
    { label: "Artwork", status: booleanStatus(Boolean(album.artworkUrl)) },
    { label: "Tracks", status: booleanStatus(album.counts.tracks > 0) },
    { label: "Metadata", status: resolveMetadataStatus(album) },
    { label: "Rights", status: resolveRightsStatus(album) },
    resolveCommerceRow(album),
    resolveReleaseStateRow(album),
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Release Health</Text>

      <View style={styles.rowsContainer}>
        {rows.map((row) => (
          <HealthRow key={row.label} label={row.label} status={row.status} value={row.value} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    flex: 1,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  rowsContainer: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
