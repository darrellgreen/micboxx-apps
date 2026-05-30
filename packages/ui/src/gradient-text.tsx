/**
 * Simulated gradient text using a View + Text overlay approach.
 * Since RN doesn't support gradient text natively, we use expo-blur and
 * a two-tone colour approach for headings.
 */
import { Text, type TextProps, StyleSheet } from "react-native";
import { tokens } from "@micboxx/theme";

interface GradientTextProps extends TextProps {
  children: React.ReactNode;
}

/** Purple-to-pink gradient simulation using accent colour */
export function AccentHeading({ style, ...props }: GradientTextProps) {
  return (
    <Text
      {...props}
      style={[styles.accent, style]}
    />
  );
}

export function SectionHeading({ style, ...props }: GradientTextProps) {
  return (
    <Text {...props} style={[styles.section, style]} />
  );
}

const styles = StyleSheet.create({
  accent: {
    color: tokens.colors.accentLight,
    fontWeight: "800",
    fontSize: 24,
    letterSpacing: -0.4,
  },
  section: {
    color: tokens.colors.text,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.2,
  },
});
