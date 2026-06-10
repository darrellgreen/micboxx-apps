import * as Sentry from "@sentry/react-native";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";

import { AccountDrawerProvider } from "@/components/navigation/account-drawer";
import { AppBackdrop, ToastProvider } from "@micboxx/ui";
import { env } from "@/config/env";
import { AuthProvider } from "@/features/auth/provider";
import { CreatorBootstrapProvider } from "@/features/bootstrap/provider";
import { registerRoomLiveKitGlobals } from "@/features/rooms/live-video/registerLiveKitGlobals";
import { SocialAuthGate } from "@/features/social/SocialAuthGate";
import { store } from "@/store/store";
import { tokens } from "@micboxx/theme";
import {
  configureMicboxxApi,
} from "@micboxx/api";
import { configureMicboxxAnalytics } from "@micboxx/analytics";
import { ensureFreshSession, isAuthSessionExpiredError } from "@/features/auth/api";
import { PlatformAnalyticsAdapter } from "@/features/analytics/adapter";
import { AccountPreferencesProvider } from "@/features/account/provider";
import { SubscriptionProvider } from "@/features/subscription/provider";

Sentry.init({
  dsn: env.sentryDsn,
  sendDefaultPii: true,
  enableLogs: true,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
});

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

registerRoomLiveKitGlobals();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthProvider>
          <SubscriptionProvider>
          <AccountPreferencesProvider>
            <SocialAuthGate />
            <CreatorBootstrapProvider>
              <ThemeProvider value={navigationTheme}>
                <AccountDrawerProvider>
                  <ToastProvider>
                    <View style={{ flex: 1, backgroundColor: tokens.colors.bgApp }}>
                      <AppBackdrop />
                      <Stack
                        screenOptions={{
                          headerShown: false,
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
                        name="index"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="welcome"
                        options={{ headerShown: false }}
                      />
<Stack.Screen
                        name="creator-access"
                        options={{ headerShown: false }}
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
                        name="verify-email"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: tokens.colors.bgApp,
                          },
                        }}
                      />
                      <Stack.Screen
                        name="handoff/create-account"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="handoff/reset-password"
                        options={{ headerShown: false }}
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
                        name="onboarding"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="audience/index"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="rooms/[albumId]"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/tracks/index"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/albums/index"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/tracks/[trackId]/index"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/tracks/[trackId]/edit"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/albums/[albumId]/index"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="catalog/albums/[albumId]/edit"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="create/upload-push"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="create/release"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="create/album-push"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="create/select-album-push"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      <Stack.Screen
                        name="account-push"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                          contentStyle: {
                            backgroundColor: "transparent",
                          },
                        }}
                      />
                      </Stack>
                      <StatusBar style="light" />
                    </View>
                  </ToastProvider>
                </AccountDrawerProvider>
              </ThemeProvider>
            </CreatorBootstrapProvider>
          </AccountPreferencesProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
