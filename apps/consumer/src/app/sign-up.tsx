import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen, Button, AnimatedPressable } from "@micboxx/ui";
import type { RegisterRequest } from "@micboxx/contracts";
import {
  checkEmailAvailability,
  checkUsernameAvailability,
  registerUserForVerification,
} from "@/features/auth/registration-api";
import { ApiError } from "@micboxx/api";
import { tokens } from "@micboxx/theme";

interface SignupFormState {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const initialFormState: SignupFormState = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

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
    <View style={s.fieldBlock}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {status === "checking" ? (
          <ActivityIndicator size="small" color={tokens.colors.textSecondary} style={{ marginLeft: 6 }} />
        ) : status === "ok" ? (
          <Ionicons name="checkmark-circle" size={14} color={tokens.colors.accent} style={{ marginLeft: 6 }} />
        ) : null}
      </View>
      {children}
      {error ? (
        <Text style={s.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={s.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

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

export default function SignUpScreen() {
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field specific errors & statuses
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"checking" | "ok" | "error" | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // Refs for field-to-field navigation
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Debounce timers
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateForm<K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const handleUsernameChange = useCallback((value: string) => {
    const trimmed = value.trim();
    updateForm("username", trimmed);
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

  const handleEmailChange = useCallback((value: string) => {
    const trimmed = value.trim();
    updateForm("email", trimmed);
    setEmailStatus(null);
    setEmailError(null);

    const localError = validateEmail(trimmed);
    if (localError) return;

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

  function validate(): boolean {
    let hasError = false;

    if (!form.name.trim()) {
      setNameError("Display name is required.");
      hasError = true;
    } else {
      setNameError(null);
    }

    const uErr = validateUsername(form.username);
    if (uErr) {
      setUsernameError(uErr);
      hasError = true;
    } else {
      setUsernameError(null);
    }

    const eErr = validateEmail(form.email);
    if (eErr) {
      setEmailError(eErr);
      hasError = true;
    } else {
      setEmailError(null);
    }

    const pErr = validatePassword(form.password);
    if (pErr) {
      setPasswordError(pErr);
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    } else {
      setConfirmPasswordError(null);
    }

    if (!termsAccepted) {
      setError("You must accept the terms to create an account.");
      hasError = true;
    }

    if (usernameStatus === "error" || emailStatus === "error") {
      hasError = true;
    }

    return !hasError;
  }

  async function handleCreateAccount() {
    if (busy) {
      return;
    }

    setError(null);
    const isValid = validate();
    if (!isValid) {
      return;
    }

    setBusy(true);
    try {
      const payload: RegisterRequest = {
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        signupIntent: "listener",
        termsAccepted,
      };

      const data = await registerUserForVerification(payload);
      router.replace({
        pathname: "/sign-up-verify",
        params: {
          uid: String(data.uid),
          email: data.email,
          intent: data.signupIntent,
        },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to create account right now. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll={true} safeAreaEdges={["top", "bottom"]}>
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

        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.headline}>Create your MicBoxx account</Text>
          <Text style={s.subhead}>
            We will send a 6-digit verification code to your email to finish
            signup.
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

          <FormField label="Full name" error={nameError}>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={(value) => { updateForm("name", value); setNameError(null); }}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Your name"
              placeholderTextColor={tokens.colors.textMuted}
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
            <TextInput
              ref={usernameRef}
              style={s.input}
              value={form.username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="Choose a username"
              placeholderTextColor={tokens.colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </FormField>

          <FormField label="Email" error={emailError} status={emailStatus}>
            <TextInput
              ref={emailRef}
              style={s.input}
              value={form.email}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={tokens.colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </FormField>

          <FormField label="Password" hint="Minimum 8 characters." error={passwordError}>
            <TextInput
              ref={passwordRef}
              style={s.input}
              value={form.password}
              onChangeText={(value) => { updateForm("password", value); setPasswordError(null); setConfirmPasswordError(null); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              placeholder="At least 8 characters"
              placeholderTextColor={tokens.colors.textMuted}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
          </FormField>

          <FormField label="Confirm password" error={confirmPasswordError}>
            <TextInput
              ref={confirmRef}
              style={s.input}
              value={form.confirmPassword}
              onChangeText={(value) => { updateForm("confirmPassword", value); setConfirmPasswordError(null); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              placeholder="Repeat your password"
              placeholderTextColor={tokens.colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={() => void handleCreateAccount()}
            />
          </FormField>

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

          <Text style={s.ugcNotice}>
            By creating an account, you agree to MicBoxx&apos;s Terms and Privacy Policy. MicBoxx does
            not tolerate objectionable content, abusive behavior, harassment, hate speech, threats,
            or content that infringes on another person&apos;s rights. Users may report content or
            accounts that violate these rules.
          </Text>

          <Button
            label="Create account"
            onPress={() => void handleCreateAccount()}
            disabled={busy}
            loading={busy}
            tone="primary"
          />

          <Button
            label="I already have a code"
            onPress={() => {
              router.push("/sign-up-verify");
            }}
            disabled={busy}
            tone="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
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
    paddingHorizontal: 24,
    paddingTop: 12,
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
  fieldBlock: {
    gap: 6,
  },
  label: {
    color: tokens.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 14,
    color: tokens.colors.textPrimary,
    fontSize: 15,
  },
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
  ugcNotice: {
    color: tokens.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldError: {
    color: tokens.colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  fieldHint: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
