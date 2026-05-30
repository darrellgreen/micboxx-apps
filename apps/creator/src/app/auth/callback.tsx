import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { notifyDeepLinkCallback } from "@/features/auth/api";
import { tokens } from "@/theme/tokens";

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      if (__DEV__) {
        console.log("[creator auth/callback] deep-link URL received:", url);
      }
      notifyDeepLinkCallback(url);
    }
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/welcome");
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <Pressable
          style={s.closeBtn}
          hitSlop={8}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/welcome");
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
        <ActivityIndicator size="large" color={tokens.colors.accent} />
        <Text style={s.label}>Completing sign in…</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bgApp },
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
    color: tokens.colors.textSecondary,
    fontSize: 15,
  },
});
