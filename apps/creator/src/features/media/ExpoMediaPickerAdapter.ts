import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { MediaAsset, MediaPickOptions, MediaPickerAdapter } from "@micboxx/media";

export const ExpoMediaPickerAdapter: MediaPickerAdapter = {
  async pickImage(options?: MediaPickOptions): Promise<MediaAsset | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: options?.quality ?? 0.9,
      allowsEditing: options?.allowsEditing ?? false,
      allowsMultipleSelection: options?.multiple ?? false,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const file = result.assets[0];
    return {
      uri: file.uri,
      width: file.width,
      height: file.height,
      mimeType: file.mimeType,
      fileName: file.fileName,
      fileSize: file.fileSize,
    };
  },

  async pickAudio(options?: MediaPickOptions): Promise<MediaAsset | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      multiple: options?.multiple ?? false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const file = result.assets[0];
    return {
      uri: file.uri,
      mimeType: file.mimeType,
      fileName: file.name,
      fileSize: file.size,
    };
  },
};
