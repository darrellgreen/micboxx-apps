// Must be first: patches console.warn before any lazy screen load triggers
// react-native's deprecated-API getters via Expo's importAll.
import "@/config/suppress-deprecation-warnings";

import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { Stack, usePathname, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { AccountDrawerProvider } from "@/components/navigation/account-drawer";
import { PersistentTabBar } from "@/components/navigation/PersistentTabBar";
import { AppBackdrop, ToastProvider } from "@micboxx/ui";
import { env } from "@/config/env";
import { AccountPreferencesProvider } from "@/features/account/provider";
import { AuthProvider, useAuth } from "@/features/auth/provider";
import { MiniPlayer } from "@/features/player/components/MiniPlayer";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { PlayerProvider } from "@/features/player/provider";
import { registerMicboxxPlaybackService } from "@/features/player/registerPlaybackService";
import { registerRoomLiveKitGlobals } from "@/features/rooms/live-video/registerLiveKitGlobals";
import { PushProvider } from "@/features/push/PushProvider";
import { registerPushBackgroundHandler } from "@/features/push/registerPushBackgroundHandler";
import { SocialAuthGate } from "@/features/social/SocialAuthGate";
import { store } from "@/store/store";
import { tokens } from "@micboxx/theme";
import {
  configureMicboxxApi,
} from "@micboxx/api";
import { configureMicboxxAnalytics } from "@micboxx/analytics";
import { ensureFreshSession, isAuthSessionExpiredError } from "@/features/auth/api";
import { PlatformAnalyticsAdapter } from "@/features/analytics/adapter";

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    sendDefaultPii: true,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration()],
    debug: __DEV__,
  });
}

configureMicboxxApi({
  baseUrl: env.drupalBaseUrl,
  webBaseUrl: env.micboxxWebBaseUrl,
  useFixtures: env.drupalBaseUrl.length === 0,
  getToken: async () => {
    const session = await ensureFreshSession();
    return session?.accessToken ?? null;
  },
  isAuthSessionExpiredError,
});

configureMicboxxAnalytics({
  provider: PlatformAnalyticsAdapter,
});

registerMicboxxPlaybackService();
registerRoomLiveKitGlobals();
registerPushBackgroundHandler();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: tokens.colors.bgApp,
    card: tokens.colors.bgSurface,
    border: tokens.colors.borderSubtle,
    primary: tokens.colors.accent,
    text: tokens.colors.textPrimary,
  },
};

// Routes where the bottom chrome (tab bar + mini player) should be hidden.
// "Hidden" means opacity:0 + non-interactive, NOT unmounted — so returning
// from a modal like /now-playing doesn't pay a fresh-mount cost.
const CHROME_HIDDEN_ROUTES = [
  ...(Platform.OS === "ios" ? [] : ["/now-playing"]),
  "/sign-in",
  "/sign-up",
  "/sign-up-verify",
  "/auth/callback",
];

function PersistentTabBarGate() {
  const pathname = usePathname();
  const hidden = CHROME_HIDDEN_ROUTES.includes(pathname);
  return (
    <View
      pointerEvents={hidden ? "none" : "auto"}
      style={hidden ? s.chromeHidden : undefined}
    >
      <PersistentTabBar />
    </View>
  );
}

function MiniPlayerGate() {
  const pathname = usePathname();
  const playerQueue = usePlayerQueue();
  const isRoomRoute = pathname.endsWith("/room");
  const isRoomOwnedQueue = playerQueue.context?.id?.startsWith("room:") === true;

  // Only clear a room-owned queue when navigating away from the room screen.
  // Stable ref avoids this effect re-firing on every clearQueue identity change.
  const clearQueue = playerQueue.clearQueue;
  useEffect(() => {
    if (!isRoomRoute && isRoomOwnedQueue) {
      void clearQueue();
    }
  }, [isRoomOwnedQueue, isRoomRoute, clearQueue]);

  const hidden = CHROME_HIDDEN_ROUTES.includes(pathname) || isRoomRoute || isRoomOwnedQueue;
  return (
    <View
      pointerEvents={hidden ? "none" : "auto"}
      style={hidden ? s.chromeHidden : undefined}
    >
      <MiniPlayer />
    </View>
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <SafeAreaView style={eb.safe}>
      <View style={eb.container}>
        <Text style={eb.title}>Something went wrong</Text>
        <Text style={eb.message}>{error.message}</Text>
        <Pressable onPress={retry} style={eb.button}>
          <Text style={eb.buttonLabel}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  chromeHidden: { opacity: 0 },
});

const eb = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  title: {
    color: tokens.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    color: tokens.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  button: {
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isHydrating } = useAuth();
  const pathname = usePathname();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.colors.bgApp, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={tokens.colors.accent} />
      </View>
    );
  }

  const authRoutes = ["/sign-in", "/sign-up", "/sign-up-verify", "/auth/callback"];
  const isAuthRoute = authRoutes.includes(pathname);

  if (!session && !isAuthRoute) {
    return (
      <>
        {children}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.bgApp, alignItems: "center", justifyContent: "center", zIndex: 9999 }]}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
          <Redirect href="/sign-in" />
        </View>
      </>
    );
  }

  return <>{children}</>;
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          <AccountPreferencesProvider>
            <SocialAuthGate />
            <PushProvider />
            <PlayerProvider>
              <ThemeProvider value={navigationTheme}>
                <AccountDrawerProvider>
                  <ToastProvider>
                    <View
                      style={{ flex: 1, backgroundColor: tokens.colors.bgApp }}
                    >
                      <AppBackdrop />
                      <AuthGate>
                        <Stack
                          screenOptions={{
                            headerTransparent: true,
                            headerShadowVisible: false,
                            headerTintColor: tokens.colors.textPrimary,
                            headerStyle: {
                              backgroundColor: "transparent",
                            },
                            contentStyle: {
                              backgroundColor: "transparent",
                            },
                          }}
                        >
                        <Stack.Screen
                          name="(tabs)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="now-playing"
                          options={{
                            headerShown: false,
                            presentation: "modal",
                            animation: "slide_from_bottom",
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="sign-in"
                          options={{
                            headerShown: false,
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="sign-up"
                          options={{
                            headerShown: false,
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="sign-up-verify"
                          options={{
                            headerShown: false,
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="auth/callback"
                          options={{
                            headerShown: false,
                            presentation: "transparentModal",
                            animation: "fade",
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="settings"
                          options={{
                            headerShown: false,
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        <Stack.Screen
                          name="playlist/create"
                          options={{
                            headerShown: false,
                            presentation: "modal",
                            animation: "slide_from_bottom",
                            contentStyle: {
                              backgroundColor: tokens.colors.bgApp,
                            },
                          }}
                        />
                        </Stack>
                        <PersistentTabBarGate />
                        <MiniPlayerGate />
                        <StatusBar style="light" />
                      </AuthGate>
                    </View>
                  </ToastProvider>
                </AccountDrawerProvider>
              </ThemeProvider>
            </PlayerProvider>
          </AccountPreferencesProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default env.sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
