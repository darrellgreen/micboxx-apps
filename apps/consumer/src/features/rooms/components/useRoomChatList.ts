import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import {
    Keyboard,
    Platform,
    type FlatList,
    type GestureResponderEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";

interface UseRoomChatListOptions {
  messageCount: number;
  windowHeight: number;
  insetsBottom: number;
  hasPinnedMessage: boolean;
  artistPresenceActive: boolean;
}

interface RoomChatListDerivedLayout {
  bottomSafeSpace: number;
  keyboardLift: number;
  composerBottom: number;
  maskHeight: number;
  listBottom: number;
  chatMaskLocations: readonly [number, number, number, number];
  backgroundFadeHeight: number;
  backgroundFadeLocations: readonly [number, number, number, number];
}

interface UseRoomChatListResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listRef: MutableRefObject<FlatList<any> | null>;
  isExpanded: boolean;
  keyboardHeight: number;
  layout: RoomChatListDerivedLayout;
  onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onTouchStart: (event: GestureResponderEvent) => void;
  onTouchEnd: (event: GestureResponderEvent) => void;
}

const COLLAPSED_HEIGHT = 110;

export function useRoomChatList({
  messageCount,
  windowHeight,
  insetsBottom,
  hasPinnedMessage,
  artistPresenceActive,
}: UseRoomChatListOptions): UseRoomChatListResult {
  const [isExpanded, setIsExpanded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<FlatList<any> | null>(null);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(Math.max(0, event.endCoordinates?.height ?? 0));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setIsExpanded(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (messageCount === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: isExpanded });
    });
  }, [messageCount, isExpanded]);

  useEffect(() => {
    if (artistPresenceActive) {
      setIsExpanded(true);
    }
  }, [artistPresenceActive]);

  const onScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragStartYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const startY = dragStartYRef.current;
    if (startY == null) {
      return;
    }

    const endY = event.nativeEvent.contentOffset.y;
    const delta = endY - startY;

    if (delta > 8) {
      setIsExpanded(true);
    }

    if (isExpanded && delta < -8 && endY <= 8) {
      setIsExpanded(false);
    }

    dragStartYRef.current = null;
  }, [isExpanded]);

  const onTouchStart = useCallback((event: GestureResponderEvent) => {
    if (!isExpanded) {
      dragStartYRef.current = event.nativeEvent.pageY;
    }
  }, [isExpanded]);

  const onTouchEnd = useCallback((event: GestureResponderEvent) => {
    if (!isExpanded && dragStartYRef.current != null) {
      const deltaY = dragStartYRef.current - event.nativeEvent.pageY;
      if (deltaY > 12) {
        setIsExpanded(true);
      }
    }
    dragStartYRef.current = null;
  }, [isExpanded]);

  const bottomSafeSpace = Math.max(14, insetsBottom + 12);
  const keyboardLift = Math.max(0, keyboardHeight - insetsBottom);
  const composerBottom = bottomSafeSpace + 66 + keyboardLift;

  const expandedHeight = Math.floor(
    windowHeight * (artistPresenceActive ? 0.5 : 0.4),
  );
  const maskHeight = isExpanded ? expandedHeight : COLLAPSED_HEIGHT;

  const pinnedHeight = hasPinnedMessage ? 54 : 0;
  const listBottom = composerBottom + pinnedHeight + 8;

  const chatMaskLocations = isExpanded
    ? ([0, 0.18, 0.42, 0.68] as const)
    : ([0, 0.36, 0.62, 0.84] as const);

  const backgroundFadeHeight = composerBottom + maskHeight + 24;
  const backgroundFadeLocations = isExpanded
    ? ([0, 0.38, 0.72, 1] as const)
    : ([0, 0.46, 0.78, 1] as const);

  return {
    listRef,
    isExpanded,
    keyboardHeight,
    layout: {
      bottomSafeSpace,
      keyboardLift,
      composerBottom,
      maskHeight,
      listBottom,
      chatMaskLocations,
      backgroundFadeHeight,
      backgroundFadeLocations,
    },
    onScrollBeginDrag,
    onScrollEndDrag,
    onTouchStart,
    onTouchEnd,
  };
}
