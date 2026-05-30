import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import * as Sentry from "@sentry/react-native";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { AccountDrawerProvider } from "@/components/navigation/account-drawer";
import { AppBackdrop } from "@/components/ui/app-backdrop";
import { env } from "@/config/env";
import { AccountPreferencesProvider } from "@/features/account/provider";
import { AuthProvider } from "@/features/auth/provider";
import { MiniPlayer } from "@/features/player/components/MiniPlayer";
import { usePlayerQueue } from "@/features/player/hooks/usePlayerQueue";
import { PlayerProvider } from "@/features/player/provider";
import { registerMicboxxPlaybackService } from "@/features/player/registerPlaybackService";
import { registerRoomLiveKitGlobals } from "@/features/rooms/live-video/registerLiveKitGlobals";
import { SocialAuthGate } from "@/features/social/SocialAuthGate";
import { store } from "@/store/store";
import { tokens } from "@/theme/tokens";

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

registerMicboxxPlaybackService();
registerRoomLiveKitGlobals();

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

function MiniPlayerGate() {
  const pathname = usePathname();
  const playerQueue = usePlayerQueue();
  const isRoomRoute = pathname.endsWith("/room");
  const isRoomOwnedQueue = playerQueue.context?.id?.startsWith("room:") === true;

  useEffect(() => {
    if (!isRoomRoute && isRoomOwnedQueue) {
      void playerQueue.clearQueue();
    }
  }, [isRoomOwnedQueue, isRoomRoute, playerQueue.clearQueue]);

  if (pathname === "/now-playing" || isRoomRoute || isRoomOwnedQueue) return null;
  return <MiniPlayer />;
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

export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          <AccountPreferencesProvider>
            <SocialAuthGate />
            <PlayerProvider>
              <ThemeProvider value={navigationTheme}>
                <AccountDrawerProvider>
                  <View
                    style={{ flex: 1, backgroundColor: tokens.colors.bgApp }}
                  >
                    <AppBackdrop />
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
                          presentation: "modal",
                          animation: "slide_from_bottom",
                          contentStyle: {
                            backgroundColor: tokens.colors.bgApp,
                          },
                        }}
                      />
                      <Stack.Screen
                        name="sign-up"
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
                        name="sign-up-verify"
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
                    </Stack>
                    <MiniPlayerGate />
                    <StatusBar style="light" />
                  </View>
                </AccountDrawerProvider>
              </ThemeProvider>
            </PlayerProvider>
          </AccountPreferencesProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
});
