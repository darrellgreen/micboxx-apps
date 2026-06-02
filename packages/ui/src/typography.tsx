import { Text, StyleSheet, type TextProps as RNTextProps } from "react-native";
import { tokens } from "@micboxx/theme";

export interface BaseTextProps extends RNTextProps {
  color?: "primary" | "secondary" | "muted" | "accent" | "danger";
  align?: "auto" | "left" | "right" | "center" | "justify";
}

const colorMap = {
  primary: tokens.colors.textPrimary,
  secondary: tokens.colors.textSecondary,
  muted: tokens.colors.textMuted,
  accent: tokens.colors.accent,
  danger: tokens.colors.danger,
};

export interface HeadingProps extends BaseTextProps {
  level?: "h1" | "h2" | "h3" | "h4";
}

export function Heading({ level = "h2", color = "primary", align = "left", style, ...props }: HeadingProps) {
  return (
    <Text
      style={[
        styles.headingBase,
        styles[level],
        { color: colorMap[color], textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}

export interface BodyTextProps extends BaseTextProps {
  size?: "sm" | "base" | "md" | "lg";
  weight?: "regular" | "medium" | "semibold";
}

export function BodyText({ size = "base", weight = "regular", color = "primary", align = "left", style, ...props }: BodyTextProps) {
  return (
    <Text
      style={[
        styles.bodyBase,
        {
          fontSize: tokens.typography[size],
          fontWeight: tokens.typography[weight],
          lineHeight: tokens.typography[size] * tokens.typography.normal,
          color: colorMap[color],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Subtext({ color = "secondary", align = "left", style, ...props }: BaseTextProps) {
  return (
    <Text
      style={[
        styles.subtext,
        { color: colorMap[color], textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  headingBase: {
    fontFamily: tokens.typography.fontFamily.sans,
  },
  h1: {
    fontSize: tokens.typography["3xl"],
    fontWeight: tokens.typography.extrabold,
    lineHeight: tokens.typography["3xl"] * tokens.typography.tight,
  },
  h2: {
    fontSize: tokens.typography["2xl"],
    fontWeight: tokens.typography.bold,
    lineHeight: tokens.typography["2xl"] * tokens.typography.tight,
  },
  h3: {
    fontSize: tokens.typography.xl,
    fontWeight: tokens.typography.bold,
    lineHeight: tokens.typography.xl * tokens.typography.tight,
  },
  h4: {
    fontSize: tokens.typography.lg,
    fontWeight: tokens.typography.semibold,
    lineHeight: tokens.typography.lg * tokens.typography.snug,
  },
  bodyBase: {
    fontFamily: tokens.typography.fontFamily.sans,
  },
  subtext: {
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.sm,
    fontWeight: tokens.typography.regular,
    lineHeight: tokens.typography.sm * tokens.typography.normal,
  },
});
