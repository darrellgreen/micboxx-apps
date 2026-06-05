import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

interface AlbumTabsProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
}

const TABS = [
  { id: "overview", label: "Overview", disabled: false },
  { id: "tracks", label: "Tracks", disabled: false },
  { id: "details", label: "Details", disabled: true },
  { id: "release", label: "Release", disabled: true },
  { id: "stats", label: "Stats", disabled: true },
];

export function AlbumTabs({ activeTab, onChangeTab }: AlbumTabsProps) {
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
    gap: 18,
    width: "100%",
    justifyContent: "space-between",
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
    color: "#00B3A6", // Teal active color
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
