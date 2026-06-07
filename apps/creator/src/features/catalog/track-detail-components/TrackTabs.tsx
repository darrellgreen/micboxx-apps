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
  { id: "releases", label: "Releases", disabled: true },
  { id: "stats", label: "Stats", disabled: true },
];

export function TrackTabs({ activeTab, onChangeTab }: TrackTabsProps) {
  function handlePress(tab: (typeof TABS)[number]) {
    if (tab.disabled || tab.id === activeTab) {
      return;
    }

    onChangeTab(tab.id);
  }

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
              disabled={tab.disabled || isActive}
              onPress={() => handlePress(tab)}
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
              
              {/* Underline Indicator */}
              {isActive ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    position: "relative",
    alignItems: "center",
  },
  activeTab: {
    // No background
  },
  disabledTab: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.textSecondary,
  },
  activeTabLabel: {
    color: "#00B3A6",
    fontWeight: "700",
  },
  disabledTabLabel: {
    color: tokens.colors.textSecondary,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#00B3A6",
    borderRadius: 1,
  },
});
