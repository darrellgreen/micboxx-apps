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
  onBack?: () => void;
  fallbackRoute?: string;
  rightContent?: ReactNode;
}

interface FlowHeaderProps {
  variant: "flow";
  title: string;
  step?: string;
  onClose?: () => void;
  fallbackRoute?: string;
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

function DetailHeader({ title, onBack, fallbackRoute = "/(tabs)/home", rightContent }: DetailHeaderProps) {
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
      <AnimatedPressable
        onPress={handleBack}
        haptic="selection"
        style={s.circularBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={24} color={tokens.colors.textPrimary} />
      </AnimatedPressable>

      <Text numberOfLines={1} style={s.detailTitle}>{title}</Text>

      <View style={s.detailRight}>
        {rightContent ?? <View />}
      </View>
    </View>
  );
}

function FlowHeader({ title, step, onClose, fallbackRoute = "/(tabs)/home" }: FlowHeaderProps) {
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

      <View style={s.flowCenter}>
        <Text numberOfLines={1} style={s.flowTitle}>{title}</Text>
        {step ? <Text numberOfLines={1} style={s.flowStep}>{step}</Text> : null}
      </View>

      <View style={s.flowSpacer} />
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
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  detailRight: {
    width: 40,
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
  flowSpacer: {
    width: 60,
  },
});
