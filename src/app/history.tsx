import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { isLockedTheoryShell } from '@/data/theory-display';

type HistoryEntry =
  | { kind: 'technique'; id: string; card: NonNullable<ReturnType<typeof techniqueById.get>> }
  | { kind: 'theory'; id: string; theory: NonNullable<ReturnType<typeof theoryById.get>> };

export default function HistoryScreen() {
  const router = useRouter();
  const { historyIds } = useAppState();
  const { catalogRevision, isPaid } = useAccess();
  const entries = useMemo(() => historyIds.map((id): HistoryEntry | null => {
    const card = techniqueById.get(id);
    if (card) return { kind: 'technique', id, card };
    const theory = theoryById.get(id);
    return theory && !isLockedTheoryShell(theory) ? { kind: 'theory', id, theory } : null;
  }).filter((entry): entry is HistoryEntry => Boolean(entry)), [catalogRevision, historyIds]);
  const pendingTheoryCount = isPaid ? historyIds.filter((id) => {
    const theory = theoryById.get(id);
    return Boolean(theory && isLockedTheoryShell(theory));
  }).length : 0;

  return (
    <BookScreen>
      {entries.length || pendingTheoryCount ? (
        <View style={styles.list}>
          {entries.map((entry, index) => entry.kind === 'technique' ? (
            <TechniqueRow key={entry.id} card={entry.card} showCategory sequence={index + 1} sequenceTotal={entries.length} />
          ) : (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.theory.title}を開く`}
              onPress={() => router.push({ pathname: '/theory/[id]', params: { id: entry.id } })}
              style={({ pressed }) => [styles.theoryRow, pressed && styles.pressed]}
            >
              <View style={styles.sequence}><AppText style={styles.sequenceText}>{String(index + 1).padStart(2, '0')}</AppText></View>
              <View style={styles.theoryCopy}>
                <View style={styles.metaLine}><AppText style={styles.kindLabel}>理論</AppText><AppText style={styles.theoryMeta}>{entry.theory.categoryTitle}</AppText></View>
                <AppText style={styles.theoryTitle}>{entry.theory.title}</AppText>
              </View>
              <AppText style={styles.chevron}>›</AppText>
            </Pressable>
          ))}
          {pendingTheoryCount ? <PendingTheoryRow count={pendingTheoryCount} /> : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <AppText variant="serif" style={styles.emptyTitle}>まだ閲覧履歴はありません</AppText>
          <AppText style={styles.emptyLead}>読んだ処世術や理論は、ここからいつでも読み返せます。</AppText>
        </View>
      )}
    </BookScreen>
  );
}

function PendingTheoryRow({ count }: { count: number }) {
  return (
    <View style={styles.pendingRow}>
      <View style={styles.pendingMark}><AppText style={styles.pendingMarkText}>理</AppText></View>
      <View style={styles.theoryCopy}>
        <AppText style={styles.pendingTitle}>完全版データを確認中</AppText>
        <AppText style={styles.pendingMeta}>{count}件の理論を読み込んでいます</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { width: '100%' },
  theoryRow: { minHeight: 82, paddingVertical: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  sequence: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  sequenceText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  theoryCopy: { flex: 1, minWidth: 0 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kindLabel: { paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, color: colors.gold, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  theoryMeta: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  theoryTitle: { marginTop: 4, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' },
  chevron: { color: colors.gold, fontSize: 28, lineHeight: 30 },
  pendingRow: { minHeight: 82, paddingVertical: 12, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  pendingMark: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  pendingMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 16 },
  pendingTitle: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23 },
  pendingMeta: { marginTop: 3, color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  pressed: { opacity: 0.62 },
  empty: { minHeight: 240, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8CBB8', borderRadius: radius.md, backgroundColor: '#FBF7F0' },
  emptyTitle: { color: colors.ink, fontSize: 19, lineHeight: 28 },
  emptyLead: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
