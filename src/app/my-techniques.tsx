import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, OrnamentHeading, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { useState } from 'react';

export default function MyTechniquesScreen() {
  const router = useRouter();
  const { personalMemos, addPersonalMemo, removePersonalMemo, personalPrinciple } = useAppState();
  const [draft, setDraft] = useState('');
  const canAdd = draft.trim().length > 0;

  const addMemo = () => {
    if (!canAdd) return;
    addPersonalMemo(draft);
    setDraft('');
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <AppText variant="label" style={styles.eyebrow}>MY TECHNIQUES</AppText>
          <AppText variant="serif" style={styles.title}>マイ処世術</AppText>
          <AppText style={styles.lead}>自分の言葉で残した、日常で使うための処世術です。</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="マイページへ戻る" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <AppText style={styles.backText}>戻る</AppText>
        </Pressable>
      </View>

      <View style={styles.principleCard}>
        <AppText variant="label" style={styles.principleLabel}>いまの自分の指針</AppText>
        <AppText variant="serif" style={styles.principle}>{personalPrinciple}</AppText>
      </View>

      <View style={styles.composer}>
        <AppText variant="serif" style={styles.composerTitle}>新しい処世術を残す</AppText>
        <AppText style={styles.composerLead}>思いついた言葉を、あとで使える一文にして保存します。</AppText>
        <View style={styles.composerRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            maxLength={140}
            placeholder="例：迷ったら、その場で返事をしない"
            placeholderTextColor={colors.muted}
            accessibilityLabel="マイ処世術"
            returnKeyType="done"
            onSubmitEditing={addMemo}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="マイ処世術を追加" disabled={!canAdd} onPress={addMemo} style={({ pressed }) => [styles.addButton, !canAdd && styles.addButtonDisabled, pressed && canAdd && styles.pressed]}>
            <AppText style={styles.addButtonText}>追加</AppText>
          </Pressable>
        </View>
      </View>

      <OrnamentHeading>保存した処世術　{personalMemos.length}</OrnamentHeading>
      {personalMemos.length ? (
        <View style={styles.memoList}>
          {personalMemos.map((memo, index) => (
            <View key={`${memo}-${index}`} style={styles.memoCard}>
              <View style={styles.memoNumber}><AppText variant="serif" style={styles.memoNumberText}>{String(index + 1).padStart(2, '0')}</AppText></View>
              <AppText style={styles.memoText}>{memo}</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1}番目のマイ処世術を削除`} onPress={() => removePersonalMemo(index)} hitSlop={10} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                <AppText style={styles.deleteText}>削除</AppText>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <AppText variant="serif" style={styles.emptyTitle}>まだマイ処世術はありません。</AppText>
          <AppText style={styles.emptyLead}>自分に効く一文を、上の入力欄から残しておけます。</AppText>
        </View>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  headingRow: { width: '100%', maxWidth: 780, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.gold, fontSize: 11, lineHeight: 17, letterSpacing: 1.8, fontWeight: '700' },
  title: { marginTop: 4, color: colors.ink, fontSize: 32, lineHeight: 43, fontWeight: '700' },
  lead: { marginTop: 7, color: colors.muted, fontSize: 14, lineHeight: 22 },
  backButton: { minHeight: 38, marginTop: 4, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  backText: { color: colors.gold, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  principleCard: { width: '100%', maxWidth: 780, alignSelf: 'center', marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.md, backgroundColor: '#F8F4EC', ...bookCardShadow },
  principleLabel: { color: colors.gold, fontSize: 11, lineHeight: 17, letterSpacing: 1.4, fontWeight: '700' },
  principle: { marginTop: 8, color: colors.ink, fontSize: 22, lineHeight: 33, fontWeight: '600', letterSpacing: 0.8 },
  composer: { width: '100%', maxWidth: 780, alignSelf: 'center', marginTop: spacing.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  composerTitle: { color: colors.ink, fontSize: 21, lineHeight: 29, fontWeight: '700' },
  composerLead: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 20 },
  composerRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm, marginTop: spacing.md },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D5C7B3', borderRadius: radius.sm, color: colors.ink, backgroundColor: '#FFFCF6', fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
  addButton: { minWidth: 68, minHeight: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.charcoal },
  addButtonDisabled: { backgroundColor: '#B7B0A5' },
  addButtonText: { color: colors.goldLight, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  memoList: { width: '100%', maxWidth: 780, alignSelf: 'center', gap: spacing.sm },
  memoCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  memoNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal },
  memoNumberText: { color: colors.goldLight, fontSize: 13, lineHeight: 18 },
  memoText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, lineHeight: 25 },
  deleteButton: { minHeight: 34, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  emptyCard: { width: '100%', maxWidth: 780, alignSelf: 'center', padding: spacing.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8CBB8', borderRadius: radius.md, backgroundColor: '#FBF7F0', alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 19, lineHeight: 28 },
  emptyLead: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.78 },
});
