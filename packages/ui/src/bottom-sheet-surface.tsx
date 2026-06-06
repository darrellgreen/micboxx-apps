import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementRef, MutableRefObject, ReactNode } from "react";
import { Dimensions, Modal, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@micboxx/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const IS_IOS = Platform.OS === "ios";
const HAS_HOME_INDICATOR = IS_IOS && SCREEN_HEIGHT >= 812;
const DEFAULT_BOTTOM_INSET = HAS_HOME_INDICATOR ? 34 : 20;

interface BottomSheetSurfaceProps {
  children: ReactNode;
  visible: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  enableContentPanningGesture?: boolean;
  enableDynamicSizing?: boolean;
  footer?: ReactNode;
  maxDynamicContentSize?: number;
  onDismiss: () => void;
  scrollable?: boolean;
  snapPoints?: Array<number | string>;
}

interface BottomSheetSurfaceInnerProps extends BottomSheetSurfaceProps {
  mounted: boolean;
  setMounted: (mounted: boolean) => void;
  onRequestCloseRef: MutableRefObject<(() => void) | null>;
  insets: { top: number; bottom: number; left: number; right: number };
}

function BottomSheetSurfaceInner({
  children,
  visible,
  contentStyle,
  enableContentPanningGesture = true,
  enableDynamicSizing = true,
  footer,
  maxDynamicContentSize,
  onDismiss,
  scrollable = false,
  snapPoints,
  mounted,
  setMounted,
  onRequestCloseRef,
  insets,
}: BottomSheetSurfaceInnerProps) {
  const sheetRef = useRef<ElementRef<typeof BottomSheet>>(null);
  const hasOpenedRef = useRef(false);

  const requestClose = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  useEffect(() => {
    onRequestCloseRef.current = requestClose;
    return () => {
      onRequestCloseRef.current = null;
    };
  }, [onRequestCloseRef, requestClose]);

  useEffect(() => {
    if (visible) {
      hasOpenedRef.current = false;
      setMounted(true);
      return;
    }

    if (mounted) {
      requestClose();
    }
  }, [mounted, requestClose, visible, setMounted]);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0) {
        hasOpenedRef.current = true;
        return;
      }

      if (index !== -1) return;
      if (!hasOpenedRef.current) return;

      setMounted(false);
      onDismiss();
    },
    [onDismiss, setMounted],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.56}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      animateOnMount
      enableDynamicSizing={enableDynamicSizing}
      maxDynamicContentSize={maxDynamicContentSize}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={enableContentPanningGesture}
      enableHandlePanningGesture
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      onChange={handleSheetChange}
    >
      {scrollable ? (
        <>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              contentStyle,
              {
                paddingTop: 24,
                paddingBottom: footer ? 24 : Math.max((insets?.bottom ?? 0) + 32, 48),
              },
            ]}
          >
            {children}
          </BottomSheetScrollView>
          {footer ? (
            <BottomSheetView
              style={[
                styles.footer,
                { paddingBottom: Math.max((insets?.bottom ?? 0) + 32, 48) },
              ]}
            >
              {footer}
            </BottomSheetView>
          ) : null}
        </>
      ) : (
        <BottomSheetView
          style={[
            styles.content,
            contentStyle,
            {
              paddingTop: 24,
              paddingBottom: 0,
            },
          ]}
        >
          {footer ? (
            <>
              <View style={{ paddingBottom: 24 }}>
                {children}
              </View>
              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max((insets?.bottom ?? 0) + 32, 48) },
                ]}
              >
                {footer}
              </View>
            </>
          ) : (
            <View style={{ paddingBottom: Math.max((insets?.bottom ?? 0) + 32, 48) }}>
              {children}
            </View>
          )}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

export function BottomSheetSurface(props: BottomSheetSurfaceProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(props.visible);
  const requestCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (props.visible) {
      setMounted(true);
    }
  }, [props.visible]);

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      onRequestClose={() => requestCloseRef.current?.()}
      animationType="none"
      statusBarTranslucent
    >
      <BottomSheetSurfaceInner
        {...props}
        mounted={mounted}
        setMounted={setMounted}
        onRequestCloseRef={requestCloseRef}
        insets={insets}
      />
    </Modal>
  );
}

export { BottomSheetScrollView };

const styles = StyleSheet.create({
  background: {
    backgroundColor: tokens.colors.bgSurface,
    borderTopLeftRadius: tokens.radii["2xl"],
    borderTopRightRadius: tokens.radii["2xl"],
  },
  handle: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleIndicator: {
    width: 42,
    height: 4,
    borderRadius: tokens.radii.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
