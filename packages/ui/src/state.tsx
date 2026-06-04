import { View, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Heading, BodyText } from "./typography";
import { Button } from "./button";
import { ShimmerPlaceholder } from "./shimmer-placeholder";
import { tokens } from "@micboxx/theme";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void; loading?: boolean };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.stateContainer}>
      {icon ? <Ionicons name={icon} size={48} color={tokens.colors.textMuted} style={styles.icon} /> : null}
      <Heading level="h3" align="center">{title}</Heading>
      {description ? (
        <BodyText color="secondary" align="center" style={styles.description}>
          {description}
        </BodyText>
      ) : null}
      {action ? (
        <View style={styles.actionWrap}>
          <Button label={action.label} onPress={action.onPress} tone="secondary" loading={action.loading} />
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.stateContainer}>
      <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.danger} style={styles.icon} />
      <Heading level="h3" align="center">{title}</Heading>
      <BodyText color="secondary" align="center" style={styles.description}>
        {message}
      </BodyText>
      {onRetry ? (
        <View style={styles.actionWrap}>
          <Button label="Try again" onPress={onRetry} tone="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: keyof typeof tokens.radiusSystem | number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 20, borderRadius = "section", style }: SkeletonProps) {
  const radius = typeof borderRadius === "number" ? borderRadius : tokens.radiusSystem[borderRadius] ?? tokens.radiusSystem.section;
  
  return (
    <ShimmerPlaceholder
      width={width as number}
      height={height as number}
      borderRadius={radius}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    padding: tokens.spacingSystem["2xl"],
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  icon: {
    marginBottom: tokens.spacingSystem.lg,
  },
  description: {
    marginTop: tokens.spacingSystem.sm,
    maxWidth: 280,
  },
  actionWrap: {
    marginTop: tokens.spacingSystem.xl,
  },
});
