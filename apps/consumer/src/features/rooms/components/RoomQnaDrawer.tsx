import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { RoomQnaQuestion, RoomQnaState } from "@/contracts/rooms";
import { tokens } from "@/theme/tokens";

export function RoomQnaDrawer({
  qna,
  questions,
  canView,
  canSubmit,
  submitting,
  onSubmit,
  onVote,
}: {
  qna: RoomQnaState | null;
  questions: RoomQnaQuestion[];
  canView: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: (text: string) => Promise<void>;
  onVote: (questionId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  if (!canView) return null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || !canSubmit) return;
    setDraft("");
    await onSubmit(text).catch(() => undefined);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Q&A</Text>
      <Text style={styles.meta}>{qna?.enabled ? `${qna.openCount} open questions` : "Questions are quiet right now"}</Text>
      {questions.slice(0, 5).map((question) => (
        <View key={question.id} style={styles.question}>
          <Text style={styles.questionText}>{question.text}</Text>
          {question.answerText ? <Text style={styles.answer}>{question.answerText}</Text> : null}
          <Pressable onPress={() => void onVote(question.id).catch(() => undefined)} style={styles.vote}>
            <Text style={styles.voteText}>{question.votes} votes</Text>
          </Pressable>
        </View>
      ))}
      {questions.length === 0 ? <Text style={styles.empty}>No public questions yet.</Text> : null}
      {canSubmit ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!submitting}
            placeholder="Ask a question"
            placeholderTextColor={tokens.colors.textSecondary}
            style={styles.input}
          />
          <Pressable onPress={() => void submit()} style={styles.submit}>
            <Text style={styles.submitText}>Ask</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, padding: 16, borderRadius: 8, backgroundColor: tokens.colors.bgSurface, borderWidth: 1, borderColor: tokens.colors.borderSubtle, gap: 10 },
  title: { color: tokens.colors.textPrimary, fontSize: 17, fontWeight: "800" },
  meta: { color: tokens.colors.textSecondary, fontSize: 12 },
  question: { gap: 6, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.borderSubtle },
  questionText: { color: tokens.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  answer: { color: tokens.colors.textSecondary, fontSize: 13 },
  vote: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  voteText: { color: tokens.colors.textPrimary, fontSize: 12, fontWeight: "700" },
  empty: { color: tokens.colors.textSecondary, fontSize: 13 },
  composer: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { flex: 1, minHeight: 42, color: tokens.colors.textPrimary, borderRadius: 8, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.06)" },
  submit: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, backgroundColor: tokens.colors.accent },
  submitText: { color: "#fff", fontWeight: "800" },
});
