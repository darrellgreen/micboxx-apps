/**
 * Email verification screen.
 *
 * Step 2 of 2: User enters the 6-digit code sent to their inbox.
 * Auto-submits when all 6 digits are filled. Provides a timed resend link
 * (60 s cooldown). On success the user is returned to sign-in.
 *
 * Receives `uid` (number) and `email` (string) as route params from sign-up.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import { resendVerificationCode, verifyEmail } from "@/shared/api/registration";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailScreen() {
  const { uid: uidParam, email } = useLocalSearchParams<{
    uid: string;
    email: string;
  }>();
  const uid = Number(uidParam);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [focusIndex, setFocusIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus first input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, [cooldown]);

  // Submit code
  const submitCode = useCallback(
    async (code: string) => {
      if (code.length !== CODE_LENGTH || submitting) return;
      Keyboard.dismiss();
      setSubmitting(true);
      setError(null);
      try {
        await verifyEmail({ uid, code });
        setSuccess(true);
        // Brief success pause then navigate to sign-in
        setTimeout(() => {
          router.dismiss();
        }, 1200);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Verification failed. Please check the code and try again.",
        );
        setSubmitting(false);
        // Clear digits so user can re-enter
        setDigits(Array(CODE_LENGTH).fill(""));
        setFocusIndex(0);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    },
    [uid, submitting],
  );

  // Handle digit entry
  const handleChange = useCallback(
    (value: string, index: number) => {
      // Accept only digits; handle paste (multiple chars)
      const cleaned = value.replace(/\D/g, "").slice(0, CODE_LENGTH - index);
      if (!cleaned) return;

      const next = [...digits];
      for (let i = 0; i < cleaned.length; i++) {
        if (index + i < CODE_LENGTH) next[index + i] = cleaned[i];
      }
      setDigits(next);
      setError(null);

      const nextFocus = Math.min(index + cleaned.length, CODE_LENGTH - 1);
      setFocusIndex(nextFocus);
      inputRefs.current[nextFocus]?.focus();

      const full = next.join("");
      if (full.length === CODE_LENGTH && !next.includes("")) {
        void submitCode(full);
      }
    },
    [digits, submitCode],
  );

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
      if (e.nativeEvent.key === "Backspace") {
        if (digits[index]) {
          const next = [...digits];
          next[index] = "";
          setDigits(next);
        } else if (index > 0) {
          const next = [...digits];
          next[index - 1] = "";
          setDigits(next);
          setFocusIndex(index - 1);
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [digits],
  );

  // Resend code
  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMessage(null);
    setError(null);
    try {
      await resendVerificationCode(uid);
      setResendMessage("A new code has been sent to your email.");
      setCooldown(RESEND_COOLDOWN);
      setDigits(Array(CODE_LENGTH).fill(""));
      setFocusIndex(0);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not resend code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  }, [uid, cooldown, resending]);

  const maskedEmail = email
    ? email.replace(/(.{2}).+(@.+)/, (_m, a, b) => `${a}***${b}`)
    : "";

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={s.inner}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={require("../../assets/images/micboxx-logo.png")}
              style={s.logo}
              contentFit="contain"
            />
          </View>

          {/* Icon */}
          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={42} color={tokens.colors.accent} />
          </View>

          <Text style={s.headline}>Check your email</Text>
          <Text style={s.sub}>
            We sent a 6-digit verification code to{"\n"}
            <Text style={s.emailHighlight}>{maskedEmail}</Text>
          </Text>

          {/* Code inputs */}
          <View style={s.codeRow}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                value={digits[i]}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusIndex(i)}
                style={[
                  s.codeInput,
                  focusIndex === i && s.codeInputFocused,
                  success && s.codeInputSuccess,
                  !!error && s.codeInputError,
                ]}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH} // allows paste
                selectTextOnFocus
                editable={!submitting && !success}
                caretHidden
                textAlign="center"
                accessibilityLabel={`Digit ${i + 1}`}
              />
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={tokens.colors.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Resend message */}
          {resendMessage ? (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={tokens.colors.accent} />
              <Text style={s.successText}>{resendMessage}</Text>
            </View>
          ) : null}

          {/* Success state */}
          {success ? (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={tokens.colors.accent} />
              <Text style={s.successText}>Email verified! Taking you to sign-in…</Text>
            </View>
          ) : null}

          {/* Submit button (visible when not auto-submitting) */}
          {!success && (
            <AnimatedPressable
              style={[
                s.submitBtn,
                (submitting || digits.includes("")) && s.submitBtnDisabled,
              ]}
              onPress={() => void submitCode(digits.join(""))}
              disabled={submitting || digits.includes("")}
              haptic="light"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={s.submitLabel}>Verify code</Text>
                  <Ionicons name="checkmark" size={16} color="#000" />
                </>
              )}
            </AnimatedPressable>
          )}

          {/* Resend */}
          {!success && (
            <AnimatedPressable
              style={s.resendBtn}
              onPress={() => void handleResend()}
              disabled={cooldown > 0 || resending}
              haptic="selection"
            >
              {resending ? (
                <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
              ) : (
                <Text style={[s.resendLabel, cooldown > 0 && s.resendLabelMuted]}>
                  {cooldown > 0
                    ? `Resend code in ${cooldown}s`
                    : "Didn't receive a code? Resend"}
                </Text>
              )}
            </AnimatedPressable>
          )}

          {/* Back */}
          <AnimatedPressable
            style={s.backBtn}
            onPress={() => router.back()}
            haptic="selection"
          >
            <Text style={s.backLabel}>Back to sign in</Text>
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: "center",
    gap: 0,
  },

  logoWrap: { marginBottom: 32 },
  logo: { width: 140, height: 36 },

  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  headline: {
    color: tokens.colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 10,
  },
  sub: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 32,
  },
  emailHighlight: {
    color: tokens.colors.textPrimary,
    fontWeight: "600",
  },

  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  codeInput: {
    width: 46,
    height: 56,
    borderRadius: tokens.radii.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: tokens.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  codeInputFocused: {
    borderColor: tokens.colors.accent,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  codeInputSuccess: {
    borderColor: tokens.colors.accent,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  codeInputError: {
    borderColor: tokens.colors.danger,
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
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    flex: 1,
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(80,200,120,0.08)",
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: "rgba(80,200,120,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    width: "100%",
  },
  successText: {
    flex: 1,
    color: tokens.colors.accent,
    fontSize: 13,
    lineHeight: 18,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radii.pill,
    paddingVertical: 15,
    width: "100%",
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitLabel: { color: "#000", fontSize: 15, fontWeight: "800" },

  resendBtn: {
    paddingVertical: 8,
    alignItems: "center",
    marginBottom: 4,
  },
  resendLabel: {
    color: tokens.colors.accent,
    fontSize: 14,
    fontWeight: "500",
  },
  resendLabelMuted: {
    color: tokens.colors.textMuted,
  },

  backBtn: {
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  backLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
});
