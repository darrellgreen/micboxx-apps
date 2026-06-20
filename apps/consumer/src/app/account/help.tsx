import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable, Screen } from "@micboxx/ui";
import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { getHelpCenterUrl, getSupportUrl } from "@/features/account/external-links";
import { tokens } from "@micboxx/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface LinkRowProps {
  icon: IoniconName;
  label: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
}

function LinkRow({ icon, label, subtitle, onPress, isLast = false }: LinkRowProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      haptic="selection"
      style={[s.row, !isLast && s.rowBorder]}
    >
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={22} color={tokens.colors.textPrimary} />
      </View>
      <View style={s.copy}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={tokens.colors.textSecondary} />
    </AnimatedPressable>
  );
}

export default function HelpScreen() {
  const helpUrl = getHelpCenterUrl();
  const supportUrl = getSupportUrl();

  return (
    <Screen
      header={
        <DetailRouteHeader
          title="Help & Support"
          fallbackRoute="/settings"
        />
      }
      contentContainerStyle={s.scroll}
    >
      <View style={s.navSection}>
        {helpUrl && (
          <LinkRow
            icon="help-circle-outline"
            label="Help Center"
            subtitle="Browse guides and frequently asked questions"
            onPress={() => void Linking.openURL(helpUrl)}
          />
        )}
        {supportUrl && (
          <LinkRow
            icon="chatbubble-ellipses-outline"
            label="Contact Support"
            subtitle="Get help from the MicBoxx team"
            onPress={() => void Linking.openURL(supportUrl)}
          />
        )}
        <LinkRow
          icon="document-text-outline"
          label="Legal & Policies"
          subtitle="Privacy policy, terms of service, and more"
          onPress={() => router.push("/account/legal" as never)}
          isLast
        />
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 140,
    gap: 16,
  },

  navSection: {},

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.borderSubtle,
  },
  iconWrap: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: tokens.colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
  },
});
