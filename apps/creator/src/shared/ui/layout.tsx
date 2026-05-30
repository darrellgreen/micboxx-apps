import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenHeader } from "@/components/navigation/ScreenHeader";
import { tokens } from "@/theme/tokens";

export function ScreenShell({
  title,
  subtitle,
  headerTitle,
  headerSubtitle,
  showScreenHeader = true,
  actions,
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  showScreenHeader?: boolean;
  actions?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>) {
  const hasHeader = Boolean(title || subtitle || actions);
  const body = (
    <View style={[styles.content, contentStyle]}>
      {showScreenHeader ? (
        <ScreenHeader title={headerTitle} subtitle={headerSubtitle} />
      ) : null}
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.actions}>{actions}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Panel({
  title,
  description,
  children,
}: PropsWithChildren<{
  title?: string;
  description?: string;
}>) {
  return (
    <View style={styles.panel}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {description ? (
        <Text style={styles.panelDescription}>{description}</Text>
      ) : null}
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function InlineRow({ children }: PropsWithChildren) {
  return <View style={styles.inlineRow}>{children}</View>;
}

export function PillButton({
  label,
  onPress,
  tone = "default",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "default" | "accent" | "subtle";
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pillButton,
        tone === "accent" && styles.pillButtonAccent,
        tone === "subtle" && styles.pillButtonSubtle,
        disabled && styles.pillButtonDisabled,
      ]}
    >
      <Text
        style={[
          styles.pillButtonLabel,
          tone === "subtle" && styles.pillButtonLabelSubtle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function KeyValueRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={styles.keyValueValue}>{value}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Panel>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Panel>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Panel title="Something needs another try" description={message}>
      {onRetry ? (
        <PillButton label="Retry" onPress={onRetry} tone="accent" />
      ) : null}
    </Panel>
  );
}

export const layoutStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gap: {
    gap: 12,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  header: {
    paddingTop: 6,
    gap: 8,
  },
  headerCopy: {
    gap: 4,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  panel: {
    backgroundColor: tokens.colors.surfaceSection,
    borderRadius: tokens.radiusSystem.section,
    padding: 12,
    gap: 8,
  },
  panelTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  panelDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  pillButton: {
    minHeight: 36,
    borderRadius: tokens.radiusSystem.control,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgElevated,
  },
  pillButtonAccent: {
    backgroundColor: tokens.colors.accent,
  },
  pillButtonSubtle: {
    backgroundColor: "transparent",
  },
  pillButtonDisabled: {
    opacity: 0.45,
  },
  pillButtonLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  pillButtonLabelSubtle: {
    color: tokens.colors.textSecondary,
  },
  inlineRow: {
    backgroundColor: tokens.colors.surfaceInline,
    borderRadius: tokens.radiusSystem.section,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  keyValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  keyValueLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
  },
  keyValueValue: {
    color: tokens.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  emptyTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  emptyDescription: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
