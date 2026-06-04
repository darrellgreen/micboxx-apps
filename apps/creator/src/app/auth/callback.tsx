import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, Skeleton } from "@micboxx/ui";
import { notifyDeepLinkCallback } from "@/features/auth/api";
import { tokens } from "@micboxx/theme";

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
    <Screen scroll={false}>
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
        <Skeleton width={80} height={80} borderRadius={40} />
        <View style={s.labelStack}>
          <Skeleton width={140} height={20} borderRadius="section" />
          <Skeleton width={100} height={16} borderRadius="section" />
        </View>
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
  labelStack: {
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
});
