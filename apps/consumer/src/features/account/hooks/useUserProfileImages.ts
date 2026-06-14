import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

export function useUserProfileImages({
  onUploadAvatar,
  onUploadCover,
}: {
  onUploadAvatar: (fileUri: string, filename: string) => Promise<void>;
  onUploadCover: (fileUri: string, filename: string) => Promise<void>;
}) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need camera roll access to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      await onUploadAvatar(asset.uri, asset.fileName ?? "avatar.jpg");
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need camera roll access to change your cover photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setUploadingCover(true);
    try {
      await onUploadCover(asset.uri, asset.fileName ?? "cover.jpg");
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingCover(false);
    }
  };

  return { uploadingAvatar, uploadingCover, pickAvatar, pickCover };
}
