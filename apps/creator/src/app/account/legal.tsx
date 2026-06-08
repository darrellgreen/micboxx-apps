import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable, AppHeader, Screen } from "@micboxx/ui";
import { getPrivacyUrl, getTermsUrl } from "@/shared/api/external-links";
import { tokens } from "@micboxx/theme";

const appVersion = Constants.expoConfig?.version ?? "—";
const androidBuild = Constants.expoConfig?.android?.versionCode;
const buildNumber: string | null =
  Constants.expoConfig?.ios?.buildNumber ??
  (androidBuild != null ? String(androidBuild) : null);

function LinkRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={20} color={tokens.colors.textPrimary} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Ionicons name="open-outline" size={15} color={tokens.colors.textSecondary} />
    </AnimatedPressable>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

export default function LegalScreen() {
  return (
    <Screen
      header={<AppHeader variant="detail" title="Legal & Policies" fallbackRoute="/account/support" />}
      contentContainerStyle={s.content}
    >
      {/* ── Links ─────────────────────────────────────────────── */}
      <View style={s.card}>
        <LinkRow
          icon="lock-closed-outline"
          label="Privacy Policy"
          onPress={() => void Linking.openURL(getPrivacyUrl())}
        />
        <Divider />
        <LinkRow
          icon="document-text-outline"
          label="Terms of Service"
          onPress={() => void Linking.openURL(getTermsUrl())}
        />
      </View>

      {/* ── About ─────────────────────────────────────────────── */}
      <View style={s.card}>
        <View style={s.aboutRow}>
          <View style={s.rowIcon}>
            <Ionicons name="information-circle-outline" size={20} color={tokens.colors.textPrimary} />
          </View>
          <View style={s.aboutCopy}>
            <Text style={s.aboutTitle}>MicBoxx Creator</Text>
            <Text style={s.aboutMeta}>
              Version {appVersion}{buildNumber ? ` (${buildNumber})` : ""}
            </Text>
            <Text style={s.aboutMeta}>© {new Date().getFullYear()} MicBoxx. All rights reserved.</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 10 },

  card: {
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radii.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: tokens.colors.borderSubtle, marginLeft: 52 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 24,
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },

  // About block
  aboutRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  aboutCopy: { flex: 1, gap: 3 },
  aboutTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  aboutMeta: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
