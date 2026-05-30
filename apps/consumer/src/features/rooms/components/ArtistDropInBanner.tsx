import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { RoomArtistPresenceState, RoomPinnedNoteState } from "@micboxx/contracts";
import { tokens } from "@micboxx/theme";

export function ArtistDropInBanner({
  artistPresence,
  pinnedNote,
  artistName,
}: {
  artistPresence: RoomArtistPresenceState | null;
  pinnedNote: RoomPinnedNoteState | null;
  artistName: string | null;
}) {
  if (!artistPresence?.isActive && !pinnedNote?.messageText) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="radio" size={18} color={tokens.colors.accentLight} />
      <View style={styles.copy}>
        <Text style={styles.title}>
          {artistPresence?.isActive ? `${artistName ?? "The artist"} is in the room` : "Pinned artist note"}
        </Text>
        {pinnedNote?.messageText ? (
          <Text style={styles.body}>{pinnedNote.messageText}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "rgba(61,220,132,0.10)",
    borderWidth: 1,
    borderColor: "rgba(61,220,132,0.22)",
  },
  copy: { flex: 1, gap: 4 },
  title: { color: tokens.colors.accentLight, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  body: { color: "rgba(238,238,242,0.78)", fontSize: 13, lineHeight: 18 },
});
