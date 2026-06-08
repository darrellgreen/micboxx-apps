import type { PropsWithChildren } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";

import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";

export type ChipTabOption = {
  key: string;
  label: string;
  count?: number;
};

export function ChipTabs({
  options,
  value,
  onChange,
}: {
  options: ChipTabOption[];
  value: string;
  onChange: (next: string) => void;
}) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const sliderX = useRef(new Animated.Value(0)).current;
  const sliderW = useRef(new Animated.Value(0)).current;
  const initialised = useRef(false);

  const animateTo = (key: string, animate: boolean) => {
    const layout = layouts.current[key];
    if (!layout) return;
    if (animate) {
      Animated.parallel([
        Animated.spring(sliderX, { toValue: layout.x, useNativeDriver: false, tension: 280, friction: 28 }),
        Animated.spring(sliderW, { toValue: layout.width, useNativeDriver: false, tension: 280, friction: 28 }),
      ]).start();
    } else {
      sliderX.setValue(layout.x);
      sliderW.setValue(layout.width);
    }
  };

  useEffect(() => {
    animateTo(value, initialised.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <View style={styles.chipGroup}>
      {/* Sliding active pill */}
      <Animated.View
        style={[
          styles.chipSlider,
          { transform: [{ translateX: sliderX }], width: sliderW },
        ]}
      />
      {options.map((option) => {
        const active = option.key === value;
        return (
          <AnimatedPressable
            key={option.key}
            disabled={active}
            onPress={() => {
              if (!active) onChange(option.key);
            }}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              layouts.current[option.key] = { x, width };
              if (option.key === value) {
                animateTo(value, initialised.current);
                initialised.current = true;
              }
            }}
            haptic="selection"
            style={styles.chip}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
              {option.label}
              {typeof option.count === "number" ? ` · ${option.count}` : ""}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export function ListShell({ children }: PropsWithChildren) {
  return <View style={styles.listShell}>{children}</View>;
}

export function ListHeader({
  columns,
}: {
  columns: { key: string; label: string; align?: "left" | "right" }[];
}) {
  return (
    <View style={styles.listHeader}>
      {columns.map((column) => (
        <Text
          key={column.key}
          style={[
            styles.listHeaderText,
            column.align === "right" && styles.listHeaderTextRight,
          ]}
        >
          {column.label}
        </Text>
      ))}
    </View>
  );
}

export function ListRow({
  children,
  onPress,
}: PropsWithChildren<{
  onPress?: () => void;
}>) {
  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        haptic="selection"
        style={styles.listRow}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={styles.listRow}>{children}</View>;
}

export function StatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
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

const styles = StyleSheet.create({
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    borderRadius: tokens.radiusSystem.section,
    backgroundColor: tokens.colors.bgElevated,
    padding: 3,
    position: "relative",
  },
  chipSlider: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    borderRadius: tokens.radiusSystem.control,
    backgroundColor: tokens.colors.accentDim,
  },
  chip: {
    borderRadius: tokens.radiusSystem.control,
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 1,
  },
  chipLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  chipLabelActive: {
    color: tokens.colors.accent,
    fontWeight: "700",
  },
  listShell: {
    overflow: "hidden",
    borderRadius: tokens.radiusSystem.section,
    backgroundColor: tokens.colors.surfaceSection,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  listHeaderText: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  listHeaderTextRight: {
    textAlign: "right",
  },
  listRow: {
    backgroundColor: tokens.colors.surfaceInline,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  statusPill: {
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
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
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  statusLabel: {
    color: tokens.colors.accent,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
});
