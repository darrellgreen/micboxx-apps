import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";
import { BottomSheetSurface } from "./bottom-sheet-surface";

type IconName = keyof typeof Ionicons.glyphMap;
const VISIBLE_ITEM_COUNT = 6;
const ITEM_HEIGHT = 56;
const ITEM_GAP = 8;
const LIST_VISIBLE_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEM_COUNT + ITEM_GAP * (VISIBLE_ITEM_COUNT - 1);
const SHEET_VERTICAL_CHROME = 24 + 96;
const SHEET_VISIBLE_HEIGHT = LIST_VISIBLE_HEIGHT + SHEET_VERTICAL_CHROME;
const LONG_LIST_SNAP_POINT = "58%";

export interface BottomActionSheetItem {
  key: string;
  label: string;
  icon?: IconName;
  imageUrl?: string | null;
  tone?: "default" | "destructive";
  onPress: () => void;
}

export function BottomActionSheet({
  visible,
  title,
  items,
  snapPoint,
  onClose,
}: {
  visible: boolean;
  title?: string;
  items: BottomActionSheetItem[];
  snapPoint?: number | string;
  onClose: () => void;
}) {
  const pendingActionRef = useRef<(() => void) | null>(null);
  const isLongList = items.length > VISIBLE_ITEM_COUNT;
  const shouldUseFixedSnapPoint = Boolean(snapPoint) || isLongList;
  const fixedSnapPoint = snapPoint ?? LONG_LIST_SNAP_POINT;
  const itemList = (
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
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ) : item.icon ? (
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
  );

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
      enableContentPanningGesture={false}
      enableDynamicSizing={!shouldUseFixedSnapPoint}
      maxDynamicContentSize={shouldUseFixedSnapPoint ? undefined : SHEET_VISIBLE_HEIGHT}
      snapPoints={shouldUseFixedSnapPoint ? [fixedSnapPoint] : undefined}
      scrollable={shouldUseFixedSnapPoint}
    >
      {itemList}
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
    height: ITEM_HEIGHT,
    borderRadius: tokens.radii.xl,
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
  itemImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: tokens.colors.bgElevated,
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
