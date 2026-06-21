import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { MicboxxSession } from "@micboxx/contracts";
import type { DashboardUserProfile } from "@/features/account/api";
import { useUserProfileImages } from "@/features/account/hooks/useUserProfileImages";
import { EditProfileModal } from "./EditProfileModal";
import { PlaylistsSection } from "./PlaylistsSection";
import { ProfileCoverHeader } from "./ProfileCoverHeader";
import { ProfileIdentity } from "./ProfileIdentity";
import { RecentlyPlayedSection } from "./RecentlyPlayedSection";
import { RoomHistorySection } from "./RoomHistorySection";

interface UserProfileViewProps {
  profile: DashboardUserProfile;
  accessToken: string;
  userUuid: string;
  session?: MicboxxSession | null;
  coverTopInset?: number;
  onUpdateProfile: (data: Partial<DashboardUserProfile>) => void;
  onUploadAvatar: (fileUri: string, filename: string) => Promise<void>;
  onUploadCover: (fileUri: string, filename: string) => Promise<void>;
}

export function UserProfileView({
  profile,
  accessToken,
  userUuid,
  session,
  coverTopInset = 0,
  onUpdateProfile,
  onUploadAvatar,
  onUploadCover,
}: UserProfileViewProps) {
  const [editModalVisible, setEditModalVisible] = useState(false);

  const { uploadingAvatar, uploadingCover, pickAvatar, pickCover } = useUserProfileImages({
    onUploadAvatar,
    onUploadCover,
  });

  return (
    <View style={s.container}>
      <ProfileCoverHeader
        coverUrl={profile.coverUrl}
        avatarUrl={profile.avatarUrl}
        displayName={profile.displayName}
        coverTopInset={coverTopInset}
        uploadingAvatar={uploadingAvatar}
        uploadingCover={uploadingCover}
        onPickAvatar={pickAvatar}
        onPickCover={pickCover}
        onOpenEditModal={() => setEditModalVisible(true)}
      />

      <ProfileIdentity profile={profile} />

      <RecentlyPlayedSection accessToken={accessToken} userUuid={userUuid} session={session} />
      <PlaylistsSection accessToken={accessToken} userUuid={userUuid} />
      <RoomHistorySection accessToken={accessToken} userUuid={userUuid} />

      <EditProfileModal
        visible={editModalVisible}
        profile={profile}
        accessToken={accessToken}
        onClose={() => setEditModalVisible(false)}
        onUpdateProfile={onUpdateProfile}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 0 },
});
