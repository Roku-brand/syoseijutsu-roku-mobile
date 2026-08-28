import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function HistoryScreen() {
  const { historyIds } = useAppState();
  const cards = useMemo(() => historyIds.map((id) => techniqueById.get(id)).filter(Boolean), [historyIds]);

  return <BookScreen>
    {cards.length ? <View style={styles.list}>{cards.map((card, index) => card ? <TechniqueRow key={card.id} card={card} showCategory sequence={index + 1} sequenceTotal={cards.length} /> : null)}</View> : <View style={styles.empty}><AppText variant="serif" style={styles.emptyTitle}>まだ閲覧履歴はありません</AppText><AppText style={styles.emptyLead}>読んだ処世術は、ここからいつでも読み返せます。</AppText></View>}
  </BookScreen>;
}

const styles = StyleSheet.create({
  list: { width: '100%' },
  empty: { minHeight: 240, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8CBB8', borderRadius: radius.md, backgroundColor: '#FBF7F0' },
  emptyTitle: { color: colors.ink, fontSize: 19, lineHeight: 28 },
  emptyLead: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
