import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { tokens } from "@micboxx/theme";
import { AnimatedPressable } from "./animated-pressable";

export type HeaderVariant = "hub" | "detail" | "flow";

interface HubHeaderProps {
  variant: "hub";
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
}

interface DetailHeaderProps {
  variant: "detail";
  title: string;
  subtitle?: string;
  onBack?: () => void;
  fallbackRoute?: string;
  rightContent?: ReactNode;
  detailSideWidth?: number;
}

interface FlowHeaderProps {
  variant: "flow";
  title: string;
  step?: string;
  onClose?: () => void;
  fallbackRoute?: string;
  rightContent?: ReactNode;
  flowSideWidth?: number;
}

export type AppHeaderProps = HubHeaderProps | DetailHeaderProps | FlowHeaderProps;

export function AppHeader(props: AppHeaderProps) {
  switch (props.variant) {
    case "hub":
      return <HubHeader {...props} />;
    case "detail":
      return <DetailHeader {...props} />;
    case "flow":
      return <FlowHeader {...props} />;
  }
}

function HubHeader({ leftContent, centerContent, rightContent }: HubHeaderProps) {
  return (
    <View style={s.container}>
      {leftContent ? <View>{leftContent}</View> : null}
      <View style={s.hubCenter}>{centerContent}</View>
      {rightContent ? <View>{rightContent}</View> : null}
    </View>
  );
}

function DetailHeader({
  title,
  subtitle,
  onBack,
  fallbackRoute = "/(tabs)/home",
  rightContent,
  detailSideWidth = 40,
}: DetailHeaderProps) {
  const router = useRouter();

  const handleBack = onBack ?? (() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as never);
    }
  });

  return (
    <View style={s.container}>
      <View style={[s.detailSide, { width: detailSideWidth }]}>
        <AnimatedPressable
          onPress={handleBack}
          haptic="selection"
          style={s.circularBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={tokens.colors.textPrimary} />
        </AnimatedPressable>
      </View>

      <View style={s.detailCenter}>
        <Text numberOfLines={1} style={s.detailTitle}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={s.detailSubtitle}>{subtitle}</Text> : null}
      </View>

      <View style={[s.detailRight, { width: detailSideWidth }]}>
        {rightContent ?? <View />}
      </View>
    </View>
  );
}

function FlowHeader({
  title,
  step,
  onClose,
  fallbackRoute = "/(tabs)/home",
  rightContent,
  flowSideWidth = 80,
}: FlowHeaderProps) {
  const router = useRouter();

  const handleClose = onClose ?? (() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as never);
    }
  });

  return (
    <View style={s.container}>
      <View style={[s.flowSide, { width: flowSideWidth }]}>
        <AnimatedPressable
          onPress={handleClose}
          haptic="selection"
          style={s.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={tokens.colors.textPrimary} />
          <Text style={s.closeLabel}>Close</Text>
        </AnimatedPressable>
      </View>

      <View style={s.flowCenter}>
        <Text numberOfLines={1} style={s.flowTitle}>{title}</Text>
        {step ? <Text numberOfLines={1} style={s.flowStep}>{step}</Text> : null}
      </View>

      <View style={[s.flowRight, { width: flowSideWidth }]}>
        {rightContent ?? <View />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  hubCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  detailCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  detailSubtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  detailSide: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  detailRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingRight: 8,
  },
  closeLabel: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  flowCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flowSide: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  flowRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  flowTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  flowStep: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
});
