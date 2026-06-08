/**
 * Creator registration screen.
 *
 * Step 1 of 2: Collect display name, username, email, and password.
 * On success the user is forwarded to /verify-email with their uid + email
 * so they can enter the 6-digit code that arrives in their inbox.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@micboxx/ui";
import { tokens } from "@micboxx/theme";
import {
  checkEmailAvailability,
  checkUsernameAvailability,
  registerCreator,
} from "@/shared/api/registration";

// ─── Field input ──────────────────────────────────────────────────────────────

function FormField({
  label,
  hint,
  error,
  status,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  status?: "checking" | "ok" | "error" | null;
  children: React.ReactNode;
}) {
  return (
    <View style={f.wrap}>
      <View style={f.labelRow}>
        <Text style={f.label}>{label}</Text>
        {status === "checking" ? (
          <ActivityIndicator size="small" color={tokens.colors.textSecondary} />
        ) : status === "ok" ? (
          <Ionicons name="checkmark-circle" size={14} color={tokens.colors.accent} />
        ) : null}
      </View>
      {children}
      {error ? (
        <Text style={f.error}>{error}</Text>
      ) : hint ? (
        <Text style={f.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  hint: { color: tokens.colors.textSecondary, fontSize: 12, lineHeight: 17 },
  error: { color: tokens.colors.danger, fontSize: 12, lineHeight: 17 },
});

// ─── Text input ───────────────────────────────────────────────────────────────

function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  autoCorrect = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "words" | "sentences";
  keyboardType?: "default" | "email-address";
  returnKeyType?: "next" | "done" | "go";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
  autoCorrect?: boolean;
}) {
  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.textMuted}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      style={inp.input}
    />
  );
}

const inp = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    color: tokens.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateUsername(value: string): string | null {
  if (value.length < 3) return "At least 3 characters required.";
  if (value.length > 30) return "30 characters max.";
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Letters, numbers, and underscores only.";
  return null;
}

function validateEmail(value: string): string | null {
  if (!value.includes("@") || !value.includes(".")) return "Enter a valid email address.";
  return null;
}

function validatePassword(value: string): string | null {
  if (value.length < 8) return "At least 8 characters required.";
  if (value.length > 128) return "Password is too long.";
  return null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [emailStatus, setEmailStatus] = useState<"checking" | "ok" | "error" | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Refs for field-to-field navigation
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Debounce timers
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Username field ──────────────────────────────────────────────────────────
  const handleUsernameChange = useCallback((value: string) => {
    const trimmed = value.trim();
    setUsername(trimmed);
    setUsernameStatus(null);
    setUsernameError(null);

    const localError = validateUsername(trimmed);
    if (localError) {
      setUsernameError(localError);
      return;
    }

    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    setUsernameStatus("checking");
    usernameTimer.current = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(trimmed);
        if (result.available) {
          setUsernameStatus("ok");
        } else {
          setUsernameStatus("error");
          setUsernameError(result.reason ?? "Username is unavailable.");
        }
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
  }, []);

  // ── Email field ─────────────────────────────────────────────────────────────
  const handleEmailChange = useCallback((value: string) => {
    const trimmed = value.trim();
    setEmail(trimmed);
    setEmailStatus(null);
    setEmailError(null);

    const localError = validateEmail(trimmed);
    if (localError) return; // don't check availability yet

    if (emailTimer.current) clearTimeout(emailTimer.current);
    setEmailStatus("checking");
    emailTimer.current = setTimeout(async () => {
      try {
        const result = await checkEmailAvailability(trimmed);
        if (result.available) {
          setEmailStatus("ok");
        } else {
          setEmailStatus("error");
          setEmailError(result.reason ?? "Email is unavailable.");
        }
      } catch {
        setEmailStatus(null);
      }
    }, 500);
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    setSubmitError(null);

    // Local validation
    let hasError = false;

    if (!name.trim()) {
      setNameError("Display name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }

    const uErr = validateUsername(username);
    if (uErr) { setUsernameError(uErr); hasError = true; } else { setUsernameError(null); }

    const eErr = validateEmail(email);
    if (eErr) { setEmailError(eErr); hasError = true; } else { setEmailError(null); }

    const pErr = validatePassword(password);
    if (pErr) { setPasswordError(pErr); hasError = true; } else { setPasswordError(null); }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    } else {
      setConfirmPasswordError(null);
    }

    if (!termsAccepted) {
      setSubmitError("You must accept the Terms of Service to create an account.");
      hasError = true;
    }

    if (hasError || usernameStatus === "error" || emailStatus === "error") return;

    setSubmitting(true);
    try {
      const result = await registerCreator({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        signupIntent: "artist",
        termsAccepted: true,
      });

      router.replace({
        pathname: "/verify-email",
        params: { uid: String(result.uid), email: result.email },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    name, username, email, password, confirmPassword,
    termsAccepted, usernameStatus, emailStatus,
  ]);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={require("../../assets/images/micboxx-logo.png")}
              style={s.logo}
              contentFit="contain"
            />
          </View>

          <Text style={s.headline}>Create your{"\n"}creator account</Text>
          <Text style={s.sub}>Join MicBoxx to release music, grow your audience, and connect with fans.</Text>

          {/* Fields */}
          <View style={s.fields}>

            <FormField label="Display name" error={nameError}>
              <Input
                value={name}
                onChangeText={(v) => { setName(v); setNameError(null); }}
                placeholder="Your artist or full name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />
            </FormField>

            <FormField
              label="Username"
              hint="Letters, numbers, and underscores. Min 3 characters."
              error={usernameError}
              status={usernameStatus}
            >
              <Input
                inputRef={usernameRef}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="your_username"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </FormField>

            <FormField label="Email" error={emailError} status={emailStatus}>
              <Input
                inputRef={emailRef}
                value={email}
                onChangeText={handleEmailChange}
                placeholder="you@example.com"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </FormField>

            <FormField label="Password" hint="Minimum 8 characters." error={passwordError}>
              <Input
                inputRef={passwordRef}
                value={password}
                onChangeText={(v) => { setPassword(v); setPasswordError(null); setConfirmPasswordError(null); }}
                placeholder="Create a strong password"
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
            </FormField>

            <FormField label="Confirm password" error={confirmPasswordError}>
              <Input
                inputRef={confirmRef}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(null); }}
                placeholder="Repeat your password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => void handleSubmit()}
              />
            </FormField>

            {/* Terms */}
            <Pressable
              style={s.termsRow}
              onPress={() => setTermsAccepted((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
            >
              <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
                {termsAccepted && <Ionicons name="checkmark" size={13} color="#000" />}
              </View>
              <Text style={s.termsLabel}>
                I agree to the{" "}
                <Text style={s.termsLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={s.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>

            {/* Submit error */}
            {submitError ? (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={tokens.colors.danger} />
                <Text style={s.errorText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Submit button */}
            <AnimatedPressable
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={() => void handleSubmit()}
              disabled={submitting}
              haptic="light"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Text style={s.submitLabel}>Create account</Text>
                  <Ionicons name="arrow-forward" size={16} color="#000" />
                </>
              )}
            </AnimatedPressable>

            {/* Back to login */}
            <AnimatedPressable
              style={s.backBtn}
              onPress={() => router.back()}
              haptic="selection"
            >
              <Text style={s.backLabel}>Already have an account? Sign in</Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  kav: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 0,
  },

  logoWrap: { alignItems: "center", marginBottom: 28 },
  logo: { width: 140, height: 36 },

  headline: {
    color: tokens.colors.textPrimary,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sub: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 28,
  },

  fields: { gap: 18 },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  termsLabel: {
    flex: 1,
    color: tokens.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: tokens.colors.accent,
    fontWeight: "600",
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

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radii.pill,
    paddingVertical: 15,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitLabel: {
    color: "#000",
    fontSize: 15,
    fontWeight: "800",
  },

  backBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
});
