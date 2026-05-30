import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import type { RegisterRequest } from "@micboxx/contracts";
import { registerUserForVerification } from "@/features/auth/registration-api";
import { ApiError } from "@/lib/api/client";
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

export default function SignUpScreen() {
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateForm<K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required.";
    if (!form.username.trim()) return "Username is required.";
    if (form.username.trim().length < 3) {
      return "Username must be at least 3 characters.";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      return "Username can only contain letters, numbers, and underscores.";
    }

    if (!form.email.trim()) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    if (!form.password) return "Password is required.";
    if (form.password.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (form.confirmPassword !== form.password) {
      return "Passwords do not match.";
    }

    if (!termsAccepted) {
      return "You must accept the terms to create an account.";
    }

    return null;
  }

  async function handleCreateAccount() {
    if (busy) {
      return;
    }

    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
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

          <View style={s.fieldBlock}>
            <Text style={s.label}>Full name</Text>
            <TextInput
              style={s.input}
              value={form.name}
              onChangeText={(value) => updateForm("name", value)}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Your name"
              placeholderTextColor={tokens.colors.textMuted}
            />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={form.username}
              onChangeText={(value) => updateForm("username", value)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              placeholder="Choose a username"
              placeholderTextColor={tokens.colors.textMuted}
            />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={form.email}
              onChangeText={(value) => updateForm("email", value)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={tokens.colors.textMuted}
            />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={form.password}
              onChangeText={(value) => updateForm("password", value)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              placeholder="At least 8 characters"
              placeholderTextColor={tokens.colors.textMuted}
            />
          </View>

          <View style={s.fieldBlock}>
            <Text style={s.label}>Confirm password</Text>
            <TextInput
              style={s.input}
              value={form.confirmPassword}
              onChangeText={(value) => updateForm("confirmPassword", value)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              placeholder="Repeat your password"
              placeholderTextColor={tokens.colors.textMuted}
            />
          </View>

          <View style={s.termsRow}>
            <View style={s.termsCopyWrap}>
              <Text style={s.termsTitle}>Accept terms</Text>
              <Text style={s.termsCopy}>
                Required to create your account and send the verification code.
              </Text>
            </View>
            <Switch
              value={termsAccepted}
              onValueChange={setTermsAccepted}
              trackColor={{
                false: tokens.colors.borderSubtle,
                true: tokens.colors.accent,
              }}
            />
          </View>

          <AnimatedPressable
            style={s.primaryBtn}
            scaleValue={0.93}
            onPress={() => void handleCreateAccount()}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail-outline" size={18} color="#fff" />
                <Text style={s.primaryLabel}>Create account</Text>
              </>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            style={s.secondaryBtn}
            haptic="none"
            onPress={() => {
              router.push("/sign-up-verify");
            }}
            disabled={busy}
          >
            <Text style={s.secondaryLabel}>I already have a code</Text>
          </AnimatedPressable>
        </ScrollView>
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
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bgSurface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  termsCopyWrap: {
    flex: 1,
    gap: 2,
  },
  termsTitle: {
    color: tokens.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  termsCopy: {
    color: tokens.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
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
    marginTop: 6,
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
