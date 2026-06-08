import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable, AppHeader, Screen } from "@micboxx/ui";
import { getHelpCenterUrl, getSupportUrl } from "@/shared/api/external-links";
import { tokens } from "@micboxx/theme";

interface LinkRowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  chevron?: boolean;
}

function LinkRow({ icon, label, onPress, chevron = true }: LinkRowProps) {
  return (
    <AnimatedPressable onPress={onPress} haptic="selection" style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={20} color={tokens.colors.textPrimary} />
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Ionicons
        name={chevron ? "chevron-forward" : "open-outline"}
        size={15}
        color={tokens.colors.textSecondary}
      />
    </AnimatedPressable>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function Divider() {
  return <View style={s.divider} />;
}

export default function SupportScreen() {
  const helpUrl = getHelpCenterUrl();
  const supportUrl = getSupportUrl();

  return (
    <Screen
      header={<AppHeader variant="detail" title="Support" fallbackRoute="/(tabs)/dashboard" />}
      contentContainerStyle={s.content}
    >
        <SectionCard>
          {helpUrl && (
            <>
              <LinkRow
                icon="help-circle-outline"
                label="Help Center"
                onPress={() => void Linking.openURL(helpUrl)}
                chevron={false}
              />
              <Divider />
            </>
          )}
          {supportUrl && (
            <>
              <LinkRow
                icon="chatbubble-ellipses-outline"
                label="Contact Support"
                onPress={() => void Linking.openURL(supportUrl)}
                chevron={false}
              />
              <Divider />
            </>
          )}
          <LinkRow
            icon="document-text-outline"
            label="Legal & Policies"
            onPress={() => router.push("/account/legal" as never)}
          />
        </SectionCard>
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
});
