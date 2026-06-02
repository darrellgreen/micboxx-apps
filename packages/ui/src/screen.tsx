import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import type { ReactNode } from "react";

import { AppBackdrop } from "./app-backdrop";
import { tokens } from "@micboxx/theme";

export interface ScreenProps extends ScrollViewProps {
  /** Skip bottom padding (e.g. for screens with a fixed footer) */
  noPaddingBottom?: boolean;
  /** Skip the horizontal padding (e.g. full-width hero sections) */
  noPaddingHorizontal?: boolean;
  /** Optional fixed header component */
  header?: ReactNode;
  /** Whether the screen should scroll (default: true) */
  scroll?: boolean;
  /** Edges for the safe area (default: ["top"]) */
  safeAreaEdges?: Edge[];
}

export function Screen({
  noPaddingBottom = false,
  noPaddingHorizontal = false,
  scroll = true,
  header,
  safeAreaEdges = ["top"],
  style,
  contentContainerStyle,
  children,
  ...props
}: ScreenProps) {
  const contentStyle = [
    styles.content,
    noPaddingBottom && styles.noPaddingBottom,
    noPaddingHorizontal && styles.noPaddingHorizontal,
    contentContainerStyle,
  ];

  const body = scroll ? (
    <ScrollView
      {...props}
      style={[styles.scroll, style]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, style, contentStyle]} {...props as any}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
      <View style={styles.root}>
        <AppBackdrop />
        {header}
        {body}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  root: {
    flex: 1,
    backgroundColor: tokens.colors.canvas,
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 160,
    gap: 18,
  },
  noPaddingBottom: {
    paddingBottom: 0,
  },
  noPaddingHorizontal: {
    paddingHorizontal: 0,
  },
});
