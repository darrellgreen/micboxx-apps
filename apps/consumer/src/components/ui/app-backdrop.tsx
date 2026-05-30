import { StyleSheet, View } from "react-native";

import { tokens } from "@/theme/tokens";

const GRID_LINES = Array.from({ length: 8 }, (_, index) => ({
  key: `line-${index}`,
  offset: 44 + index * 58,
}));

export function AppBackdrop() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={[styles.orb, styles.orbLeft]} />
      <View style={[styles.orb, styles.orbRight]} />
      <View style={[styles.orb, styles.orbBottom]} />
      {GRID_LINES.map((line) => (
        <View key={line.key}>
          <View style={[styles.vLine, { left: line.offset }]} />
          <View style={[styles.hLine, { top: line.offset + 12 }]} />
        </View>
      ))}
      <View style={styles.fadeTop} />
      <View style={styles.fadeBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbLeft: {
    top: -90,
    left: -120,
    width: 260,
    height: 260,
    backgroundColor: tokens.colors.accent,
    opacity: 0.14,
  },
  orbRight: {
    top: 120,
    right: -90,
    width: 220,
    height: 220,
    backgroundColor: tokens.colors.brandSecondary,
    opacity: 0.14,
  },
  orbBottom: {
    bottom: -120,
    left: 40,
    width: 280,
    height: 280,
    backgroundColor: tokens.colors.brandTertiary,
    opacity: 0.1,
  },
  vLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: tokens.colors.overlayLight,
  },
  hLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: tokens.colors.overlayLight,
  },
  fadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(6,9,20,0.64)",
  },
  fadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: "rgba(6,9,20,0.54)",
  },
});
