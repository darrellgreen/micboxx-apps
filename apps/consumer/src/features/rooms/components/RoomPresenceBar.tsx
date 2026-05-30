import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import type { RoomPresenceSummaryEntry } from "@/contracts/rooms";
import { tokens } from "@/theme/tokens";

export function RoomPresenceBar({ presence }: { presence: RoomPresenceSummaryEntry[] }) {
  const visible = presence
    .filter(
      (entry) =>
        entry.actorType === "user"
        && entry.visibility === "visible",
    )
    .slice(0, 3);

  const presenceLabel =
    presence.length === 0
      ? "Listening room is open"
      : presence.length === 1
        ? "Just you here"
        : `${presence.length} people in the Room`;

  const formatAvatarLabel = (
    entry: Pick<RoomPresenceSummaryEntry, "displayName" | "uid">,
  ): string => {
    const source = entry.displayName?.trim() || entry.uid;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  };

  const getAvatarBackground = (uid: string): string => {
    let hash = 0;
    for (let index = 0; index < uid.length; index += 1) {
      hash = (hash << 5) - hash + uid.charCodeAt(index);
      hash |= 0;
    }

    const palettes = [
      "#0f172a",
      "#1f2937",
      "#0b3d2a",
      "#2a1f3d",
      "#123949",
    ];

    return palettes[Math.abs(hash) % palettes.length] ?? palettes[0]!;
  };

  return (
    <View style={styles.outer}>
      <View style={styles.wrap}>
        {visible.length > 0 ? (
          <View style={styles.avatarStack}>
            {visible.map((entry, index) => (
              <View
                key={entry.sessionKey}
                style={[
                  styles.avatar,
                  {
                    marginLeft: index === 0 ? 0 : -10,
                    zIndex: visible.length - index,
                    backgroundColor: getAvatarBackground(entry.uid),
                  },
                ]}
              >
                {entry.avatarUrl ? (
                  <Image
                    source={{ uri: entry.avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.avatarText}>{formatAvatarLabel(entry)}</Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.label}>{presenceLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 6,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(18,22,30,0.74)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  label: {
    color: tokens.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(12,16,22,0.92)",
  },
  avatarText: {
    color: tokens.colors.textPrimary,
    fontSize: 10,
    fontWeight: "900",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
});
