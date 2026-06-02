import { View, StyleSheet, type ViewProps } from "react-native";
import { tokens } from "@micboxx/theme";

export interface SurfaceProps extends ViewProps {
  tone?: "primary" | "section" | "inline";
  elevation?: "none" | "sm" | "md";
  padding?: keyof typeof tokens.spacingSystem | "none";
  borderRadius?: keyof typeof tokens.radiusSystem | "none";
}

export function Surface({
  tone = "section",
  elevation = "none",
  padding = "md",
  borderRadius = "section",
  style,
  ...props
}: SurfaceProps) {
  const bgColor = tokens.surfaces[tone].backgroundColor;
  const shadowStyle = elevation !== "none" ? tokens.shadows[elevation] : undefined;
  
  return (
    <View
      style={[
        {
          backgroundColor: bgColor,
          padding: padding === "none" ? 0 : tokens.spacingSystem[padding],
          borderRadius: borderRadius === "none" ? 0 : tokens.radiusSystem[borderRadius],
          borderWidth: tone === "section" || tone === "inline" ? 1 : 0,
          borderColor: tokens.colors.borderSubtle,
        },
        shadowStyle,
        style,
      ]}
      {...props}
    />
  );
}
