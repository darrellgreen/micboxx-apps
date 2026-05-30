import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@micboxx/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export interface BottomActionSheetItem {
  key: string;
  label: string;
  icon?: IconName;
  tone?: "default" | "destructive";
  onPress: () => void;
}

export function BottomActionSheet({
  visible,
  title,
  items,
  onClose,
}: {
  visible: boolean;
  title?: string;
  items: BottomActionSheetItem[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const actionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, []);

  function handleItemPress(onPress: () => void) {
    onClose();

    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
    }

    actionTimeoutRef.current = setTimeout(() => {
      actionTimeoutRef.current = null;
      onPress();
    }, 220);
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handle} />

          {title ? <Text style={styles.title}>{title}</Text> : null}

          <View style={styles.itemList}>
            {items.map((item) => {
              const destructive = item.tone === "destructive";

              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleItemPress(item.onPress)}
                  style={({ pressed }) => [
                    styles.itemButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.itemCopy}>
                    {item.icon ? (
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={
                          destructive
                            ? tokens.colors.danger
                            : tokens.colors.textPrimary
                        }
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.itemLabel,
                        destructive && styles.itemLabelDestructive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={tokens.colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  sheet: {
    borderTopLeftRadius: tokens.radii["2xl"],
    borderTopRightRadius: tokens.radii["2xl"],
    backgroundColor: tokens.colors.bgSurface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  title: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  itemList: {
    gap: 8,
  },
  itemButton: {
    minHeight: 56,
    borderRadius: tokens.radii.xl,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  itemLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  itemLabelDestructive: {
    color: tokens.colors.danger,
  },
  cancelButton: {
    minHeight: 50,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
