import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";
import { BottomSheetSurface } from "./bottom-sheet-surface";

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
  const pendingActionRef = useRef<(() => void) | null>(null);

  function handleItemPress(onPress: () => void) {
    pendingActionRef.current = onPress;
    onClose();
  }

  const handleDismiss = useCallback(() => {
    onClose();
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    if (pendingAction) {
      setTimeout(pendingAction, 50);
    }
  }, [onClose]);

  return (
    <BottomSheetSurface
      visible={visible}
      onDismiss={handleDismiss}
      contentStyle={styles.content}
    >
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
    </BottomSheetSurface>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  title: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
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
  pressed: {
    opacity: 0.82,
  },
});
