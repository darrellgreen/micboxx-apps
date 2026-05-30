import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
    DetailActionBarProps,
    DetailActionItem,
    RelatedLaneModel,
} from "@/features/catalog/detail-models";
import { tokens } from "@micboxx/theme";

export function DetailRouteHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <View style={styles.headerRow}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.headerButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={18}
          color={tokens.colors.textPrimary}
        />
      </Pressable>

      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
  );
}

export function DetailHeroCard({
  title,
  subtitle,
  description,
  artworkUrl,
  meta,
  badgeLabel,
  imageVariant = "artwork",
  children,
}: {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  artworkUrl?: string | null;
  meta?: string | null;
  badgeLabel?: string | null;
  imageVariant?: "artwork" | "avatar";
  children?: ReactNode;
}) {
  const fallbackLabel = title.slice(0, 1).toUpperCase() || "M";

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View
          style={[
            styles.heroArtWrap,
            imageVariant === "avatar" && styles.heroArtWrapAvatar,
          ]}
        >
          {artworkUrl ? (
            <Image
              source={{ uri: artworkUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackLabel}>{fallbackLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.heroCopy}>
          {badgeLabel ? (
            <View style={styles.badgePill}>
              <Text style={styles.badgeLabel}>{badgeLabel}</Text>
            </View>
          ) : null}

          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          ) : null}
          {meta ? <Text style={styles.heroMeta}>{meta}</Text> : null}
        </View>
      </View>

      {description ? (
        <Text style={styles.heroDescription}>{description}</Text>
      ) : null}

      {children ? <View style={styles.heroBody}>{children}</View> : null}
    </View>
  );
}

export function DetailActionBar({
  primary,
  secondary,
  supporting = [],
}: DetailActionBarProps) {
  return (
    <View style={styles.actionBar}>
      <View style={styles.actionRowMain}>
        <ActionButton item={primary} emphasis="primary" />
        {secondary ? (
          <ActionButton item={secondary} emphasis="secondary" />
        ) : null}
      </View>

      {supporting.length ? (
        <View style={styles.actionRowSupport}>
          {supporting.map((item) => (
            <ActionButton
              key={item.key}
              item={item}
              emphasis={item.tone ?? "ghost"}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  item,
  emphasis,
}: {
  item: DetailActionItem;
  emphasis: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Pressable
      disabled={item.disabled}
      onPress={() => void item.onPress()}
      style={({ pressed }) => [
        styles.actionButton,
        emphasis === "primary" && styles.actionButtonPrimary,
        emphasis === "secondary" && styles.actionButtonSecondary,
        emphasis === "ghost" && styles.actionButtonGhost,
        emphasis === "danger" && styles.actionButtonDanger,
        item.disabled && styles.actionButtonDisabled,
        pressed && !item.disabled && styles.pressed,
      ]}
    >
      <Ionicons
        name={item.icon}
        size={15}
        color={
          emphasis === "primary"
            ? tokens.colors.bgApp
            : emphasis === "danger"
              ? tokens.colors.danger
              : tokens.colors.textPrimary
        }
      />
      <Text
        style={[
          styles.actionLabel,
          emphasis === "primary" && styles.actionLabelPrimary,
          emphasis === "danger" && styles.actionLabelDanger,
        ]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function DetailInfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.infoCard}>{children}</View>
    </View>
  );
}

export function DetailStatusPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusBody}>{body}</Text>
    </View>
  );
}

export function RelatedLaneSection({ lane }: { lane: RelatedLaneModel }) {
  const router = useRouter();

  return (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>{lane.title}</Text>

      {lane.items.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedRow}
        >
          {lane.items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [
                styles.relatedCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.relatedArtworkWrap}>
                {item.artworkUrl ? (
                  <Image
                    source={{ uri: item.artworkUrl }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.relatedFallback}>
                    <Text style={styles.relatedFallbackLabel}>
                      {item.title.slice(0, 1).toUpperCase() || "M"}
                    </Text>
                  </View>
                )}
              </View>

              <Text numberOfLines={1} style={styles.relatedTitle}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text numberOfLines={1} style={styles.relatedSubtitle}>
                  {item.subtitle}
                </Text>
              ) : null}
              {item.meta ? (
                <Text style={styles.relatedMeta}>{item.meta}</Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.statusTitle}>
            {lane.emptyState?.title ?? "Nothing here yet"}
          </Text>
          {lane.emptyState?.body ? (
            <Text style={styles.statusBody}>{lane.emptyState.body}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  headerTitle: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  heroCard: {
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurfaceMuted,
    padding: 16,
    gap: 14,
  },
  heroTop: {
    flexDirection: "row",
    gap: 14,
  },
  heroArtWrap: {
    width: 88,
    height: 88,
    borderRadius: tokens.radii.xl,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  heroArtWrapAvatar: {
    borderRadius: 44,
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  heroFallbackLabel: {
    color: tokens.colors.accentLight,
    fontSize: 28,
    fontWeight: "800",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  badgePill: {
    alignSelf: "flex-start",
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
  },
  badgeLabel: {
    color: tokens.colors.accentLight,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  heroMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  heroDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  heroBody: {
    gap: 12,
  },
  actionBar: {
    gap: 10,
  },
  actionRowMain: {
    flexDirection: "row",
    gap: 10,
  },
  actionRowSupport: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: tokens.colors.bgElevated,
    borderColor: tokens.colors.borderSubtle,
  },
  actionButtonGhost: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: tokens.colors.borderSubtle,
  },
  actionButtonDanger: {
    backgroundColor: "rgba(217,92,92,0.08)",
    borderColor: "rgba(217,92,92,0.25)",
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  actionLabelPrimary: {
    color: tokens.colors.bgApp,
  },
  actionLabelDanger: {
    color: tokens.colors.danger,
  },
  infoSection: {
    gap: 8,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
  },
  infoCard: {
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    padding: 14,
    gap: 10,
  },
  statusCard: {
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    padding: 18,
    gap: 8,
    alignItems: "center",
  },
  statusTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  statusBody: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  relatedRow: {
    gap: 12,
    paddingRight: 20,
  },
  relatedCard: {
    width: 144,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    padding: 10,
    gap: 7,
  },
  relatedArtworkWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: tokens.radii.lg,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  relatedFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.accentDim,
  },
  relatedFallbackLabel: {
    color: tokens.colors.accentLight,
    fontSize: 22,
    fontWeight: "800",
  },
  relatedTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  relatedSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  relatedMeta: {
    color: tokens.colors.textMuted,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.84,
  },
});
