import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RoomActivePollState } from "@micboxx/contracts";
import { tokens } from "@/theme/tokens";

export function RoomPollCard({
  poll,
  canVote,
  onVote,
}: {
  poll: RoomActivePollState | null;
  canVote: boolean;
  onVote: (pollId: string, optionId: string) => Promise<void>;
}) {
  if (!poll?.activePollId || poll.status !== "active" || !poll.question) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Poll</Text>
      <Text style={styles.question}>{poll.question}</Text>
      {poll.options.map((option) => {
        const selected = poll.viewerVoteOptionId === option.id;
        const percent = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;
        return (
          <Pressable
            key={option.id}
            disabled={!canVote || Boolean(poll.viewerVoteOptionId)}
            onPress={() => void onVote(poll.activePollId!, option.id).catch(() => undefined)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={styles.optionText}>{option.text}</Text>
            {poll.viewerVoteOptionId || poll.revealResultsAfterVote ? (
              <Text style={styles.optionMeta}>{percent}%</Text>
            ) : null}
          </Pressable>
        );
      })}
      <Text style={styles.meta}>{poll.totalVotes} total votes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, padding: 16, borderRadius: 8, backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle, gap: 10 },
  title: { color: tokens.colors.accent, fontSize: 12, fontWeight: "800" },
  question: { color: tokens.colors.textPrimary, fontSize: 16, fontWeight: "800" },
  option: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, padding: 12, backgroundColor: "rgba(255,255,255,0.06)" },
  optionSelected: { borderWidth: 1, borderColor: tokens.colors.accent },
  optionText: { flex: 1, color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  optionMeta: { color: tokens.colors.textSecondary, fontSize: 12, fontWeight: "700" },
  meta: { color: tokens.colors.textSecondary, fontSize: 12 },
});
