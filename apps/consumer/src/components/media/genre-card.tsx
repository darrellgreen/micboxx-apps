import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import type { PublicGenre } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";

function getAccentForGenre(slug: string): string {
  return (
    tokens.colors.genreColors[slug as keyof typeof tokens.colors.genreColors] ??
    tokens.colors.accent
  );
}

interface GenreCardProps {
  genre: PublicGenre;
  onPress: () => void;
}

export const GenreCard = React.memo(function GenreCard({
  genre,
  onPress,
}: GenreCardProps) {
  const trackCount = genre.counts?.tracks;
  const accent = getAccentForGenre(genre.slug);

  return (
    <AnimatedPressable onPress={onPress} style={styles.card}>
      <View style={[styles.glow, { backgroundColor: accent }]} />
      <Text numberOfLines={2} style={styles.name}>
        {genre.name}
      </Text>
      {trackCount != null ? (
        <Text style={styles.count}>
          {trackCount.toLocaleString()} track{trackCount === 1 ? "" : "s"}
        </Text>
      ) : null}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    padding: 14,
    justifyContent: "space-between",
    gap: 6,
    overflow: "hidden",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  name: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  count: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
});
