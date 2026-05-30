import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";

import { AppBackdrop } from "@/components/ui/app-backdrop";
import { tokens } from "@micboxx/theme";

interface ScreenProps extends ScrollViewProps {
  /** Skip bottom padding (e.g. for screens with a fixed footer) */
  noPaddingBottom?: boolean;
  /** Skip the horizontal padding (e.g. full-width hero sections) */
  noPaddingHorizontal?: boolean;
}

export function Screen({
  noPaddingBottom = false,
  noPaddingHorizontal = false,
  style,
  contentContainerStyle,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.root}>
        <AppBackdrop />
        <ScrollView
          {...props}
          style={[styles.scroll, style]}
          contentContainerStyle={[
            styles.content,
            noPaddingBottom && styles.noPaddingBottom,
            noPaddingHorizontal && styles.noPaddingHorizontal,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
        />
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
