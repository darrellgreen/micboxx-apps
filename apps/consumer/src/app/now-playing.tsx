import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { usePlayerSheet } from "@/features/player/context/PlayerSheetContext";
import { tokens } from "@micboxx/theme";

export default function NowPlayingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { expand } = usePlayerSheet();

  useEffect(() => {
    expand({ slug: slug ?? undefined });
    router.replace("/");
  }, [slug, expand, router]);

  return <View style={{ flex: 1, backgroundColor: tokens.colors.bgApp }} />;
}
