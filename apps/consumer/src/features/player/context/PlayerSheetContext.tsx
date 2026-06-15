import React, { createContext, useContext, useState, useCallback } from "react";
import Animated, { useSharedValue, withTiming, runOnJS, SharedValue } from "react-native-reanimated";

export interface PlayerSheetContextValue {
  progress: SharedValue<number>; // 0 = collapsed, 1 = expanded
  expand: (options?: { slug?: string }) => void;
  collapse: () => void;
  activeSlug: string | null;
  isExpandedState: boolean; // Helper state for mounting and pointerEvents
}

const PlayerSheetContext = createContext<PlayerSheetContextValue | null>(null);

export function PlayerSheetProvider({ children }: { children: React.ReactNode }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isExpandedState, setIsExpandedState] = useState(false);
  const progress = useSharedValue(0);

  const expand = useCallback((options?: { slug?: string }) => {
    if (options?.slug) {
      setActiveSlug(options.slug);
    } else {
      setActiveSlug(null);
    }
    setIsExpandedState(true);
    progress.value = withTiming(1, { duration: 240 });
  }, [progress]);

  const collapse = useCallback(() => {
    progress.value = withTiming(0, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(setIsExpandedState)(false);
        runOnJS(setActiveSlug)(null);
      }
    });
  }, [progress]);

  return (
    <PlayerSheetContext.Provider
      value={{
        progress,
        expand,
        collapse,
        activeSlug,
        isExpandedState,
      }}
    >
      {children}
    </PlayerSheetContext.Provider>
  );
}

export function usePlayerSheet() {
  const context = useContext(PlayerSheetContext);
  if (!context) {
    throw new Error("usePlayerSheet must be used within PlayerSheetProvider");
  }
  return context;
}
