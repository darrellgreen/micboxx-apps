import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Toast, {
  BaseToast,
  type BaseToastProps,
  type ToastConfig,
} from "react-native-toast-message";
import { tokens } from "@micboxx/theme";
import { hapticLight, hapticSuccess } from "./useHaptic";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION_MS = 3200;
const TOP_OFFSET = 48;

const toneColors: Record<ToastTone, string> = {
  success: tokens.colors.success,
  info: tokens.colors.accent,
  warning: tokens.colors.warning,
  error: tokens.colors.danger,
};

const toastConfig: ToastConfig = {
  success: (props) => <MicboxxToast tone="success" {...props} />,
  info: (props) => <MicboxxToast tone="info" {...props} />,
  warning: (props) => <MicboxxToast tone="warning" {...props} />,
  error: (props) => <MicboxxToast tone="error" {...props} />,
};

export function ToastProvider({ children }: PropsWithChildren) {
  const hideToast = useCallback(() => {
    Toast.hide();
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const tone = options.tone ?? "info";

    if (tone === "success") {
      hapticSuccess();
    } else {
      hapticLight();
    }

    Toast.show({
      type: tone,
      position: "top",
      text1: options.title,
      text2: options.message,
      visibilityTime: options.durationMs ?? DEFAULT_DURATION_MS,
      topOffset: TOP_OFFSET,
    });
  }, []);

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [hideToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        config={toastConfig}
        position="top"
        topOffset={TOP_OFFSET}
        visibilityTime={DEFAULT_DURATION_MS}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return value;
}

function MicboxxToast({
  tone,
  ...props
}: BaseToastProps & { tone: ToastTone }) {
  return (
    <BaseToast
      {...props}
      style={[styles.toast, { borderLeftColor: toneColors[tone] }]}
      contentContainerStyle={styles.content}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
      text1Style={styles.title}
      text2Style={styles.message}
      renderTrailingIcon={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
          onPress={() => Toast.hide()}
          style={styles.dismiss}
        >
          <Text style={styles.dismissLabel}>×</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  toast: {
    minHeight: 58,
    width: "92%",
    maxWidth: 560,
    borderLeftWidth: 4,
    borderRadius: tokens.radiusSystem.section,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.bgElevated,
    ...tokens.shadows.md,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.base,
    fontWeight: tokens.typography.semibold,
  },
  message: {
    color: tokens.colors.textSecondary,
    fontFamily: tokens.typography.fontFamily.sans,
    fontSize: tokens.typography.sm,
    lineHeight: 18,
  },
  dismiss: {
    width: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: tokens.typography.medium,
  },
});
