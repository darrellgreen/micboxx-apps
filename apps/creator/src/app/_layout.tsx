import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";

import { AccountDrawerProvider } from "@/components/navigation/account-drawer";
import { AppBackdrop } from "@micboxx/ui";
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
import { ensureFreshSession, isAuthSessionExpiredError } from "@/features/auth/api";

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
          <SocialAuthGate />
          <CreatorBootstrapProvider>
            <ThemeProvider value={navigationTheme}>
              <AccountDrawerProvider>
                <View style={{ flex: 1, backgroundColor: tokens.colors.bgApp }}>
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
                      name="index"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="welcome"
                      options={{ headerShown: false }}
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
                      name="creator-access"
                      options={{ headerShown: false }}
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
                  </Stack>
                  <StatusBar style="light" />
                </View>
              </AccountDrawerProvider>
            </ThemeProvider>
          </CreatorBootstrapProvider>
        </AuthProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
