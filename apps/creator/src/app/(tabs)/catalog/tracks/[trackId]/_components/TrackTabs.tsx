import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

interface TrackTabsProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
}

const TABS = [
  { id: "overview", label: "Overview", disabled: false },
  { id: "details", label: "Details", disabled: true },
  { id: "lyrics", label: "Lyrics", disabled: true },
  { id: "files", label: "Files", disabled: true },
  { id: "release", label: "Release", disabled: true },
  { id: "stats", label: "Stats", disabled: true },
];

export function TrackTabs({ activeTab, onChangeTab }: TrackTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChangeTab(tab.id)}
              style={[
                styles.tab,
                isActive && styles.activeTab,
                tab.disabled && styles.disabledTab,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.activeTabLabel,
                  tab.disabled && styles.disabledTabLabel,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: tokens.radiusSystem.pill,
    backgroundColor: tokens.colors.bgSurface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  activeTab: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  disabledTab: {
    opacity: 0.4,
  },
  tabLabel: {
    fontSize: tokens.typography.sm,
    fontWeight: tokens.typography.medium,
    color: tokens.colors.textSecondary,
  },
  activeTabLabel: {
    color: tokens.colors.bgApp,
    fontWeight: tokens.typography.bold,
  },
  disabledTabLabel: {
    color: tokens.colors.textSecondary,
  },
});
