import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { tokens } from "@micboxx/theme";
import { Avatar, Button } from "@micboxx/ui";

interface ProfileCoverHeaderProps {
  coverUrl: string | null;
  avatarUrl: string | null;
  displayName: string;
  coverTopInset: number;
  uploadingAvatar: boolean;
  uploadingCover: boolean;
  onPickAvatar: () => void;
  onPickCover: () => void;
  onOpenEditModal: () => void;
}

export function ProfileCoverHeader({
  coverUrl,
  avatarUrl,
  displayName,
  coverTopInset,
  uploadingAvatar,
  uploadingCover,
  onPickAvatar,
  onPickCover,
  onOpenEditModal,
}: ProfileCoverHeaderProps) {
  return (
    <>
      <View style={[s.coverContainer, { height: 140 + coverTopInset }]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={s.coverImage} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={["#79C96B", "#00B3A6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.coverImage}
          />
        )}
        <TouchableOpacity style={[s.coverCameraBtn, { top: 12 + coverTopInset }]} onPress={onPickCover}>
          {uploadingCover
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="camera" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={s.header}>
        <View style={s.avatarWrap}>
          <Avatar uri={avatarUrl} displayName={displayName} size={88} />
          <TouchableOpacity style={s.cameraBtn} onPress={onPickAvatar}>
            {uploadingAvatar
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="camera" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
        <Button label="Edit Profile" tone="secondary" size="sm" onPress={onOpenEditModal} />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  coverContainer: {
    position: "relative",
    marginHorizontal: -20,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: "100%" },
  coverCameraBtn: {
    position: "absolute",
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  avatarWrap: {
    position: "relative",
    width: 92,
    height: 92,
    marginTop: -46,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: tokens.colors.bgApp,
    backgroundColor: tokens.colors.bgApp,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
