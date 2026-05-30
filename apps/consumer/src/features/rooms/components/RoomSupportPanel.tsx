import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RoomSupportBalance, RoomSupportStats } from "@/contracts/rooms";
import { tokens } from "@/theme/tokens";

function dollars(cents: number | null | undefined) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export function RoomSupportPanel({
  stats,
  balance,
  canShow,
  canSend,
  onSendBalance,
}: {
  stats: RoomSupportStats | null;
  balance: RoomSupportBalance | null;
  canShow: boolean;
  canSend: boolean;
  onSendBalance: (amountCents: number) => Promise<void>;
}) {
  if (!canShow) return null;
  const goal = stats?.goalCents ?? null;
  const total = stats?.totalAmountCents ?? 0;
  const progress = goal && goal > 0 ? Math.min(1, total / goal) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Support</Text>
      <Text style={styles.amount}>{dollars(total)}</Text>
      <Text style={styles.meta}>
        {stats?.backerCount ?? 0} supporters{goal ? ` · ${dollars(goal)} goal` : ""}
      </Text>
      {goal ? (
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      ) : null}
      {canSend && balance && balance.available_amount_cents >= 100 ? (
        <Pressable onPress={() => void onSendBalance(100).catch(() => undefined)} style={styles.button}>
          <Text style={styles.buttonText}>Send $1 from balance</Text>
        </Pressable>
      ) : (
        <Text style={styles.note}>Support checkout opens on web when direct payment is needed.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, padding: 16, borderRadius: 8, backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle, gap: 8 },
  title: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  amount: { color: tokens.colors.accent, fontSize: 24, fontWeight: "900" },
  meta: { color: tokens.colors.textSecondary, fontSize: 12 },
  bar: { height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, backgroundColor: tokens.colors.accent },
  button: { alignSelf: "flex-start", marginTop: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: tokens.colors.accent },
  buttonText: { color: "#fff", fontWeight: "800" },
  note: { color: tokens.colors.textSecondary, fontSize: 12 },
});
