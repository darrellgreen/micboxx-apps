import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "@micboxx/theme";

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action}
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

export function EmptyLine({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={s.infoCard}>
      <Text style={s.infoTitle}>{title}</Text>
      <Text style={s.infoBody}>{body}</Text>
    </View>
  );
}

export function LibraryRow({
  title,
  subtitle,
  meta,
  artwork,
  roundArtwork = false,
  isLast = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  meta: string;
  artwork: string | null;
  roundArtwork?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [s.row, isLast && s.rowLast, pressed && s.pressed]}
    >
      <View style={[s.artwork, roundArtwork && s.roundArtwork]}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Text style={s.artworkText}>{title.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
      <View style={s.rowCopy}>
        <Text numberOfLines={1} style={s.rowTitle}>{title}</Text>
        <Text numberOfLines={1} style={s.rowSubtitle}>{subtitle}</Text>
        <Text numberOfLines={1} style={s.rowMeta}>{meta}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={tokens.colors.textSecondary} /> : null}
    </Pressable>
  );
}

export const s = StyleSheet.create({
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  sectionBody: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.borderSubtle },
  rowLast: { borderBottomWidth: 0 },
  pressed: { opacity: 0.76 },
  artwork: { width: 54, height: 54, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
  roundArtwork: { borderRadius: 27 },
  artworkText: { color: tokens.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "800" },
  rowSubtitle: { color: tokens.colors.textSecondary, fontSize: 13, marginTop: 2 },
  rowMeta: { color: tokens.colors.textSecondary, fontSize: 11, marginTop: 4 },
  empty: { color: tokens.colors.textSecondary, padding: 14, fontSize: 13 },
  infoCard: { padding: 4, gap: 4 },
  infoTitle: { color: tokens.colors.textPrimary, fontSize: 15, fontWeight: "800" },
  infoBody: { color: tokens.colors.textSecondary, fontSize: 13 },
  headerAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerActionText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingVertical: 24, gap: 12 },
  emptyText: { color: tokens.colors.textSecondary, fontSize: 13 },
  emptyAction: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: tokens.colors.accent },
  emptyActionText: { color: tokens.colors.accent, fontSize: 13, fontWeight: "700" },
});
