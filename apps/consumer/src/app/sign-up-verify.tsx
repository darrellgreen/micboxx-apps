import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import {
  resendRegistrationCode,
  verifyRegistrationCode,
} from "@/features/auth/registration-api";
import { ApiError } from "@/lib/api/client";
import { tokens } from "@/theme/tokens";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default function SignUpVerifyScreen() {
  const params = useLocalSearchParams<{
    uid?: string | string[];
    email?: string | string[];
    intent?: string | string[];
  }>();

  const uid = useMemo(() => {
    const parsed = Number(firstParam(params.uid));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [params.uid]);

  const email = firstParam(params.email).trim();
  const intent = firstParam(params.intent).trim() || "listener";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  const missingContext = uid <= 0 || !email;

  function normalizedCode(value: string): string {
    return value.replace(/\D/g, "").slice(0, 6);
  }

  async function handleVerify() {
    if (verifying || uid <= 0) {
      return;
    }

    const nextCode = normalizedCode(code);
    if (nextCode.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setError(null);
    setMessage(null);
    setVerifying(true);

    try {
      await verifyRegistrationCode(uid, nextCode);
      setVerified(true);
      setMessage(
        intent === "artist"
          ? "Email verified. Continue to sign in and complete your creator setup."
          : "Email verified. Continue to sign in and start listening.",
      );
      setTimeout(() => {
        router.replace("/sign-in");
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to verify this code right now. Please try again.");
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resending || uid <= 0) {
      return;
    }

    setError(null);
    setMessage(null);
    setResending(true);

    try {
      const response = await resendRegistrationCode(uid);
      setMessage(response.message || "A new code has been sent.");
      setCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to resend a code right now. Please try again.");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.topBar}>
          <AnimatedPressable
            style={s.closeBtn}
            hitSlop={8}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/sign-in");
              }
            }}
          >
            <Ionicons
              name="close"
              size={20}
              color={tokens.colors.textSecondary}
            />
          </AnimatedPressable>
        </View>

        <View style={s.body}>
          <Text style={s.headline}>Verify your email</Text>
          <Text style={s.subhead}>
            {missingContext
              ? "Signup details are missing. Start signup again to receive a code."
              : `Enter the 6-digit code sent to ${email}.`}
          </Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={tokens.colors.danger}
              />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={s.messageBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={tokens.colors.accent}
              />
              <Text style={s.messageText}>{message}</Text>
            </View>
          ) : null}

          {!missingContext ? (
            <>
              <View style={s.fieldBlock}>
                <Text style={s.label}>Verification code</Text>
                <TextInput
                  style={s.codeInput}
                  value={code}
                  onChangeText={(value) => {
                    setCode(normalizedCode(value));
                    setError(null);
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  placeholderTextColor={tokens.colors.textMuted}
                  maxLength={6}
                />
              </View>

              <AnimatedPressable
                style={s.primaryBtn}
                scaleValue={0.93}
                onPress={() => void handleVerify()}
                disabled={verifying || verified}
              >
                {verifying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={s.primaryLabel}>Verify code</Text>
                  </>
                )}
              </AnimatedPressable>

              <AnimatedPressable
                style={s.secondaryBtn}
                haptic="none"
                onPress={() => void handleResend()}
                disabled={resending || verified}
              >
                {resending ? (
                  <ActivityIndicator
                    size="small"
                    color={tokens.colors.textSecondary}
                  />
                ) : (
                  <Text style={s.secondaryLabel}>Resend code</Text>
                )}
              </AnimatedPressable>
            </>
          ) : (
            <AnimatedPressable
              style={s.primaryBtn}
              scaleValue={0.93}
              onPress={() => {
                router.replace("/sign-up");
              }}
            >
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={s.primaryLabel}>Start signup</Text>
            </AnimatedPressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  headline: {
    color: tokens.colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
  },
  subhead: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,80,80,0.10)",
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,80,80,0.20)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,205,160,0.10)",
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: "rgba(0,205,160,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    flex: 1,
    color: tokens.colors.accent,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  codeInput: {
    height: 52,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 14,
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    ...tokens.shadows.accent,
    marginTop: 4,
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
});
