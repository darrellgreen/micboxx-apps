import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SoundwaveTabIcon } from "@/components/icons/SoundwaveTabIcon";
import {
    DetailActionBarProps,
    DetailActionItem,
    RelatedLaneModel,
} from "@/features/catalog/detail-models";
import { tokens } from "@micboxx/theme";
import { Heading, BodyText, Subtext, Button, Surface } from "@micboxx/ui";


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
    <Surface tone="section" borderRadius="section" padding="md" style={styles.heroCard}>
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

          <Heading level="h2">{title}</Heading>
          {subtitle ? (
            <BodyText size="sm" weight="semibold" color="secondary">{subtitle}</BodyText>
          ) : null}
          {meta ? <Subtext color="muted">{meta}</Subtext> : null}
        </View>
      </View>

      {description ? (
        <BodyText size="sm" color="secondary">{description}</BodyText>
      ) : null}

      {children ? <View style={styles.heroBody}>{children}</View> : null}
    </Surface>
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
  const isPrimary = emphasis === "primary";
  const isDanger = emphasis === "danger";
  const iconColor = isPrimary ? tokens.colors.bgApp : isDanger ? tokens.colors.danger : tokens.colors.textPrimary;

  const iconNode = item.customIcon === "soundwave" ? (
    <SoundwaveTabIcon size={15} color={iconColor} />
  ) : (
    <Ionicons name={item.icon ?? "ellipse-outline"} size={15} color={iconColor} />
  );

  return (
    <View style={isPrimary || emphasis === "secondary" ? { flex: 1 } : undefined}>
      <Button
        label={item.label}
        tone={emphasis}
        icon={iconNode}
        onPress={() => void item.onPress()}
        disabled={item.disabled}
      />
    </View>
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
      <Heading level="h4">{lane.title}</Heading>

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

              <BodyText size="sm" weight="semibold" numberOfLines={1}>
                {item.title}
              </BodyText>
              {item.subtitle ? (
                <BodyText size="sm" color="secondary" numberOfLines={1}>
                  {item.subtitle}
                </BodyText>
              ) : null}
              {item.meta ? (
                <Subtext color="muted">{item.meta}</Subtext>
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
