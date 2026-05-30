import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@micboxx/ui";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { ScreenShell, SectionTitle } from "@/shared/ui/layout";
import { tokens } from "@micboxx/theme";

export default function CatalogHomeScreen() {
  const bootstrap = useCreatorBootstrap();

  return (
    <ScreenShell
      title="Catalog"
      subtitle="Entity-first release management. Tracks and albums stay separate; state lives inside each entity."
    >
      <View style={styles.hero}>
        <View style={styles.heroStat}>
          <Text style={styles.heroValue}>
            {bootstrap.tracksSummary?.meta.total ?? 0}
          </Text>
          <Text style={styles.heroLabel}>Tracks</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStat}>
          <Text style={styles.heroValue}>
            {bootstrap.albumsSummary?.meta.total ?? 0}
          </Text>
          <Text style={styles.heroLabel}>Albums</Text>
        </View>
      </View>

      <SectionTitle
        title="Entities"
        subtitle="Open tracks or albums, then filter by release state."
      />

      <AnimatedPressable
        style={styles.entityCard}
        onPress={() => router.push("/catalog/tracks")}
      >
        <View style={styles.entityIconWrap}>
          <Ionicons
            name="musical-notes-outline"
            size={22}
            color={tokens.colors.textPrimary}
          />
        </View>
        <View style={styles.entityCopy}>
          <Text style={styles.entityTitle}>Tracks</Text>
          <Text style={styles.entityText}>
            Drafts, scheduled releases, published tracks, and failed processing
            states all live here.
          </Text>
          <View style={styles.chipRow}>
            {["Draft", "Scheduled", "Published", "Failed"].map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={tokens.colors.textSecondary}
        />
      </AnimatedPressable>

      <AnimatedPressable
        style={styles.entityCard}
        onPress={() => router.push("/catalog/albums")}
      >
        <View style={styles.entityIconWrap}>
          <Ionicons name="albums-outline" size={22} color={tokens.colors.textPrimary} />
        </View>
        <View style={styles.entityCopy}>
          <Text style={styles.entityTitle}>Albums</Text>
          <Text style={styles.entityText}>
            Album grouping, release state, pricing, and membership stay on the
            album entity instead of getting mixed into upload shortcuts.
          </Text>
          <View style={styles.chipRow}>
            {["Draft", "Scheduled", "Published"].map((label) => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={tokens.colors.textSecondary}
        />
      </AnimatedPressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.surfacePrimary,
    borderRadius: tokens.radiusSystem.container,
    borderColor: tokens.colors.borderStrong,
    padding: 12,
  },
  heroStat: {
    flex: 1,
    gap: 4,
    alignItems: "center",
  },
  heroDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: tokens.colors.borderSubtle,
  },
  heroValue: {
    color: tokens.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  heroLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  entityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section,
    borderColor: tokens.colors.borderSubtle,
    padding: 12,
  },
  entityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radiusSystem.control,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  entityCopy: {
    flex: 1,
    gap: 6,
  },
  entityTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  entityText: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radiusSystem.pill,
    backgroundColor: tokens.colors.surfaceInline,
    borderColor: tokens.colors.borderSubtle,
  },
  chipLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
