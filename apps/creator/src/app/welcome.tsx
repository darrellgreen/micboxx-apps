import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen, AnimatedPressable, Button } from "@micboxx/ui";
import { useAuth } from "@/features/auth/provider";
import { useCreatorBootstrap } from "@/features/bootstrap/provider";
import { resolveCreatorEntryHref } from "@/features/bootstrap/routes";
import { tokens } from "@micboxx/theme";

export default function WelcomeScreen() {
  const bootstrap = useCreatorBootstrap();
  const { session, isHydrating, isSigningIn, error, signIn, signOut } =
    useAuth();

  const hasNavigated = useRef(false);

  useEffect(() => {
    if (session && !isHydrating && !bootstrap.loading) {
      if (hasNavigated.current) return;
      hasNavigated.current = true;
      router.replace(
        resolveCreatorEntryHref({
          hasSession: true,
          accessState: bootstrap.accessState,
          onboardingState: bootstrap.onboardingState,
          createEntryTarget: bootstrap.createEntryTarget,
        }),
      );
    }
    if (!session && !isHydrating) {
      hasNavigated.current = false;
    }
  }, [
    bootstrap.accessState,
    bootstrap.createEntryTarget,
    bootstrap.loading,
    bootstrap.onboardingState,
    isHydrating,
    session,
  ]);

  const isLoggedIn = Boolean(session);
  const busy = isHydrating || isSigningIn;

  return (
    <Screen scroll={false}>
      <View style={s.body}>
        <View style={s.logoWrap}>
          <Image
            source={require("../../assets/images/micboxx-logo.png")}
            style={s.logo}
            contentFit="contain"
          />
        </View>

        <Text style={s.headline}>
          {isLoggedIn ? "Welcome back," : "Your music,\nyour world."}
        </Text>
        {isLoggedIn && session ? (
          <Text style={s.displayName}>{session.user.displayName}</Text>
        ) : (
          <Text style={s.sub}>
            Sign in to manage releases, audience activity, and your creator
            workspace.
          </Text>
        )}

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

            <View style={{ width: "100%" }}>
              <Button
                label="Sign out"
                onPress={() => void signOut()}
                tone="secondary"
                size="lg"
                loading={busy}
                fullWidth
              />
            </View>
          </>
        ) : (
          <>
            <View style={{ width: "100%" }}>
              <Button
                label="Sign in with MicBoxx"
                icon={<Ionicons name="log-in-outline" size={20} color="#fff" />}
                onPress={() => void signIn()}
                tone="primary"
                size="lg"
                loading={busy}
                fullWidth
              />
            </View>

            <AnimatedPressable
              style={s.ghostBtn}
              haptic="none"
              onPress={() => router.push("/sign-up")}
              disabled={busy}
            >
              <Text style={s.ghostLabel}>Create creator account</Text>
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

});
