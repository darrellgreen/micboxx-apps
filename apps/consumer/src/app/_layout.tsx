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
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { AccountDrawerProvider } from "@/components/navigation/account-drawer";
import { PersistentTabBar } from "@/components/navigation/PersistentTabBar";
import { AppBackdrop, ToastProvider } from "@micboxx/ui";
import { env } from "@/config/env";
import { AccountPreferencesProvider } from "@/features/account/provider";
import { AuthProvider, useAuth } from "@/features/auth/provider";
import { SubscriptionProvider } from "@/features/subscription/provider";
import { MiniPlayer } from "@/features/player/components/MiniPlayer";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { PlayerProvider } from "@/features/player/provider";
import { PlayerSheetProvider } from "@/features/player/context/PlayerSheetContext";
import { PlayerSheetHost } from "@/features/player/components/PlayerSheetHost";
import { registerMicboxxPlaybackService } from "@/features/player/registerPlaybackService";
import { registerRoomLiveKitGlobals } from "@/features/rooms/live-video/registerLiveKitGlobals";
import { PushProvider } from "@/features/push/PushProvider";
import { registerPushBackgroundHandler } from "@/features/push/registerPushBackgroundHandler";
import { SocialAuthGate } from "@/features/social/SocialAuthGate";
import { store } from "@/store/store";
import { setSession } from "@/features/auth/auth-slice";
import { tokens } from "@micboxx/theme";
import {
  configureMicboxxApi,
  micboxxApi,
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
    try {
      const session = await ensureFreshSession();
      return session?.accessToken ?? null;
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        store.dispatch(setSession(null));
        store.dispatch(micboxxApi.util.resetApiState());
      }
      throw error;
    }
  },
  forceRefreshToken: async () => {
    try {
      const session = await ensureFreshSession(undefined, { force: true });
      return session?.accessToken ?? null;
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        store.dispatch(setSession(null));
        store.dispatch(micboxxApi.util.resetApiState());
      }
      throw error;
    }
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
const CHROME_HIDDEN_ROUTES = ["/sign-in", "/sign-up", "/sign-up-verify", "/auth/callback"];

interface AnimatedGateProps {
  hidden: boolean;
  children: React.ReactNode;
}

function AnimatedGate({ hidden, children }: AnimatedGateProps) {
  const visibleProgress = useSharedValue(hidden ? 0 : 1);

  useEffect(() => {
    visibleProgress.value = withTiming(hidden ? 0 : 1, {
      duration: 180,
    });
  }, [hidden, visibleProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visibleProgress.value,
    transform: [
      {
        translateY: interpolate(visibleProgress.value, [0, 1], [18, 0]),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
}

function PersistentTabBarGate() {
  const pathname = usePathname();
  const isIOS = Platform.OS === "ios";
  const isNowPlaying = pathname === "/now-playing";
  const hidden = CHROME_HIDDEN_ROUTES.includes(pathname) || (!isIOS && isNowPlaying);

  return (
    <AnimatedGate hidden={hidden}>
      <PersistentTabBar />
    </AnimatedGate>
  );
}

function MiniPlayerGate() {
  const pathname = usePathname();
  const playerQueue = usePlayerQueue();
  const isRoomRoute = pathname.endsWith("/room");
  const isRoomOwnedQueue = playerQueue.context?.id?.startsWith("room:") === true;

  const isIOS = Platform.OS === "ios";
  const isNowPlaying = pathname === "/now-playing";
  const hidden =
    CHROME_HIDDEN_ROUTES.includes(pathname) ||
    (!isIOS && isNowPlaying) ||
    isRoomRoute ||
    isRoomOwnedQueue;

  return (
    <AnimatedGate hidden={hidden}>
      <MiniPlayer />
    </AnimatedGate>
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
  const { session, isHydrating, isSigningIn } = useAuth();
  const pathname = usePathname();

  if (isHydrating || isSigningIn) {
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
      <React.Fragment key="unauthenticated">
        {children}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.bgApp, alignItems: "center", justifyContent: "center", zIndex: 9999 }]}>
          <ActivityIndicator size="large" color={tokens.colors.accent} />
          <Redirect href="/sign-in" />
        </View>
      </React.Fragment>
    );
  }

  return <React.Fragment key={session?.user?.uuid ?? "authenticated"}>{children}</React.Fragment>;
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          <SubscriptionProvider>
          <AccountPreferencesProvider>
            <SocialAuthGate />
            <PushProvider />
            <PlayerProvider>
              <PlayerSheetProvider>
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
                            name="account/index"
                            options={{
                              headerShown: false,
                              contentStyle: {
                                backgroundColor: tokens.colors.bgApp,
                              },
                            }}
                          />
                          <Stack.Screen
                            name="account/help"
                            options={{
                              headerShown: false,
                              contentStyle: {
                                backgroundColor: tokens.colors.bgApp,
                              },
                            }}
                          />
                          <Stack.Screen
                            name="recently-played"
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
                          <PlayerSheetHost />
                          <StatusBar style="light" />
                        </AuthGate>
                      </View>
                    </ToastProvider>
                  </AccountDrawerProvider>
                </ThemeProvider>
              </PlayerSheetProvider>
            </PlayerProvider>
          </AccountPreferencesProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default env.sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;
