/**
 * OAuth redirect landing screen.
 *
 * After the user completes the Drupal OAuth form, the browser redirects to
 * `micboxx://auth/callback?code=…&state=…`.  Expo Router renders this
 * component, which calls `WebBrowser.maybeCompleteAuthSession()` to signal
 * back to `AuthSession.promptAsync()` that the code is ready.  The browser
 * is then dismissed automatically and `signInWithDrupal()` resumes with the
 * authorization code.
 *
 * This component intentionally renders nothing visible — the user never
 * actually sees it.  If something goes wrong and this screen stays open for
 * more than a few seconds, they can close it with the X button.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, Skeleton } from "@micboxx/ui";

import { notifyDeepLinkCallback } from "@/features/auth/api";
import { tokens } from "@micboxx/theme";

// On web this closes the auth popup; on native it's a no-op but harmless.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  // Deep-link fallback: if ASWebAuthenticationSession failed to intercept the
  // micboxx:// redirect and the OS opened it as a normal deep link, Expo Router
  // renders this screen and Linking.useURL() gives us the callback URL.
  // Notify the pending resolver in api.ts so the token exchange can proceed.
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      if (__DEV__) console.log("[auth/callback] deep-link URL received:", url);
      notifyDeepLinkCallback(url);
    }
  }, [url]);

  // Safety valve: the sign-in screen's useEffect pops this screen as soon as
  // the session is set.  This timer is a fallback so the user is never
  // stranded here if something goes wrong.
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen scroll={false} safeAreaEdges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable
          style={s.closeBtn}
          hitSlop={8}
          onPress={() => {
            router.replace("/(tabs)/home");
          }}
        >
          <Ionicons
            name="close"
            size={20}
            color={tokens.colors.textSecondary}
          />
        </Pressable>
      </View>
      <View style={s.body}>
        <View style={s.skeletonRow}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={s.skeletonCopy}>
            <Skeleton width="60%" height={14} borderRadius={6} />
            <Skeleton width="40%" height={10} borderRadius={6} />
          </View>
        </View>
        <Text style={s.label}>Completing sign in…</Text>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  label: {
    marginTop: 24,
    color: tokens.colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: 240,
  },
  skeletonCopy: {
    flex: 1,
    gap: 8,
  },
});
