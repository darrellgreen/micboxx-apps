import { useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@micboxx/theme";
import { AnimatedPressable, Button } from "@micboxx/ui";
import { Ionicons } from "@expo/vector-icons";
import { updateUserProfile } from "@/features/account/api";
import type { DashboardUserProfile } from "@/features/account/api";
import { ModalField } from "./profile-shared";

interface EditProfileModalProps {
  visible: boolean;
  profile: DashboardUserProfile;
  accessToken: string;
  onClose: () => void;
  onUpdateProfile: (data: Partial<DashboardUserProfile>) => void;
}

export function EditProfileModal({
  visible,
  profile,
  accessToken,
  onClose,
  onUpdateProfile,
}: EditProfileModalProps) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.links.website ?? "");
  const [instagram, setInstagram] = useState(profile.links.instagram ?? "");
  const [facebook, setFacebook] = useState(profile.links.facebook ?? "");
  const [twitter, setTwitter] = useState(profile.links.twitter ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Validation Error", "Display name cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(accessToken, {
        displayName,
        bio,
        website,
        instagram,
        facebook,
        twitter,
      });
      onUpdateProfile(updated);
      onClose();
    } catch (err) {
      Alert.alert("Save failed", err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={s.overlay}>
        <View style={[s.container, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <View style={s.header}>
            <Text style={s.title}>Edit Profile</Text>
            <AnimatedPressable onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color={tokens.colors.textPrimary} />
            </AnimatedPressable>
          </View>
          <ScrollView contentContainerStyle={s.scroll}>
            <ModalField label="Display Name" value={displayName} onChangeText={setDisplayName} placeholder="Your public name" maxLength={120} />
            <ModalField label="Bio" value={bio} onChangeText={setBio} placeholder="Tell others about your sound preferences..." multiline maxLength={600} />
            <ModalField label="Website" value={website} onChangeText={setWebsite} placeholder="https://yourwebsite.com" autoCapitalize="none" />
            <ModalField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="instagram.com/handle" autoCapitalize="none" />
            <ModalField label="Facebook" value={facebook} onChangeText={setFacebook} placeholder="facebook.com/handle" autoCapitalize="none" />
            <ModalField label="Twitter / X" value={twitter} onChangeText={setTwitter} placeholder="x.com/handle" autoCapitalize="none" />
            <View style={{ marginTop: 10 }}>
              <Button label={isSaving ? "Saving…" : "Save Profile"} tone="primary" fullWidth onPress={handleSave} disabled={isSaving} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  container: {
    backgroundColor: tokens.colors.bgSurface,
    borderTopLeftRadius: tokens.radii.xl,
    borderTopRightRadius: tokens.radii.xl,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  title: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },
  scroll: { padding: 20, gap: 16 },
});
