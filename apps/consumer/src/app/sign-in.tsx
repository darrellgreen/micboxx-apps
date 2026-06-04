import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen, Button, AnimatedPressable } from "@micboxx/ui";
import { useAuth } from "@/features/auth/provider";
import { tokens } from "@micboxx/theme";

export default function SignInScreen() {
  const { session, isHydrating, isSigningIn, error, signIn, signOut } =
    useAuth();

  // Once signed in, pop back to wherever the user came from
  useEffect(() => {
    if (session && !isHydrating) {
      router.replace("/(tabs)/home");
    }
  }, [session, isHydrating]);

  const isLoggedIn = Boolean(session);
  const busy = isHydrating || isSigningIn;

  return (
    <Screen scroll={false} safeAreaEdges={["top", "bottom"]}>
      {/* Close / back button */}
      <View style={s.topBar}>
        <AnimatedPressable
          style={s.closeBtn}
          hitSlop={8}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)/home");
          }}
        >
          <Ionicons
            name="close"
            size={20}
            color={tokens.colors.textSecondary}
          />
        </AnimatedPressable>
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <Image
            source={require("../../assets/images/micboxx-logo.png")}
            style={s.logo}
            contentFit="contain"
          />
        </View>

        {/* Copy */}
        <Text style={s.headline}>
          {isLoggedIn ? `Welcome back,` : "Your music,\nyour world."}
        </Text>
        {isLoggedIn && session ? (
          <Text style={s.displayName}>{session.user.displayName}</Text>
        ) : (
          <Text style={s.sub}>
            Sign in to unlock personalised recommendations, DMs, and your full
            listening history.
          </Text>
        )}

        {/* Error */}
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
      </View>

      {/* Actions */}
      <View style={s.actions}>
        {isLoggedIn ? (
          <>
            <View style={s.signedInRow}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={tokens.colors.accent}
              />
              <Text style={s.signedInLabel}>Signed in</Text>
            </View>

            <Button
              label="Sign out"
              onPress={() => void signOut()}
              disabled={busy}
              loading={busy}
              tone="secondary"
            />
          </>
        ) : (
          <>
            <Button
              label="Sign in with MicBoxx"
              onPress={() => void signIn()}
              disabled={busy}
              loading={busy}
              tone="primary"
            />

            <Button
              label="Create an account"
              onPress={() => {
                router.push("/sign-up");
              }}
              disabled={busy}
              tone="ghost"
            />

            <AnimatedPressable
              style={s.ghostBtn}
              haptic="none"
              onPress={() => {
                router.push("/sign-up-verify");
              }}
              disabled={busy}
            >
              <Text style={s.ghostLabel}>Enter verification code</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={s.ghostBtn}
              haptic="none"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/(tabs)/home");
              }}
              disabled={busy}
            >
              <Text style={s.ghostLabel}>Continue as guest</Text>
            </AnimatedPressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
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
    paddingHorizontal: 32,
    justifyContent: "center",
    gap: 16,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 160,
    height: 40,
  },
  headline: {
    color: tokens.colors.textPrimary,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 40,
    textAlign: "center",
  },
  displayName: {
    color: tokens.colors.accent,
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -8,
  },
  sub: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
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
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    color: tokens.colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
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
  },
  primaryLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ghostBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  signedInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  signedInLabel: {
    color: tokens.colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  signOutBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  signOutLabel: {
    color: tokens.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
});
