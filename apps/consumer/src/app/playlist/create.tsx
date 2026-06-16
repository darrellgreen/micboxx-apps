import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { DetailRouteHeader } from "@/components/navigation/DetailRouteHeader";
import { useAuth } from "@/features/auth/provider";
import { createPlaylist } from "@micboxx/api";
import { tokens } from "@micboxx/theme";
import { Button } from "@micboxx/ui";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreatePlaylistScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a playlist title.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());

      const newPlaylist = await createPlaylist(formData, session?.accessToken);

      router.replace({
        pathname: "/playlist/[slug]",
        params: { slug: newPlaylist.slug, playlistId: newPlaylist.id },
      });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Unable to create playlist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailRouteHeader title="Create Playlist" fallbackRoute="/(tabs)/library" />
      <View style={styles.content}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Playlist name"
          placeholderTextColor={tokens.colors.textMuted}
          style={styles.textInput}
          maxLength={64}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void handleSave()}
        />
        <Button
          label={isSubmitting ? "Creating..." : "Create Playlist"}
          disabled={!title.trim() || isSubmitting}
          onPress={() => void handleSave()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.bgApp,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 16,
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    color: tokens.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
