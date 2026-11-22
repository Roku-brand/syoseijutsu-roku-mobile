import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique, canReadTheory } from '@/access/access-config';
import { techniqueById, theoryById } from '@/data/catalog';
import { isRetiredTheoryId } from '@/data/theory-knowledge';
import { useAppState } from '@/state/app-state';
import { colors, fonts } from '@/constants/theme';
import { AppText } from './ui';
import { SaveDiamondButton } from './book-ui';
import { ShoseijutsuListCard } from './shoseijutsu-card';
import { TheoryListCard } from './theory-card';
import { PersonalContentCard, type PersonalContentRow } from './personal-content-card';

/** Saved IDs keep their existing storage model; the library presents them by content type. */
export function SavedKnowledgeCard({ row, onPress }: { row: PersonalContentRow; onPress: () => void }) {
  'use no memo';
  const { isPaid } = useAccess();
  const effectiveAccess = isPaid ? 'paid' : 'guest';
  const { toggleSaved, toggleSavedTheory, toggleSavedFeature } = useAppState();
  const removeSaved = () => row.kind === 'technique' ? toggleSaved(row.id) : row.kind === 'theory' ? toggleSavedTheory(row.id) : toggleSavedFeature(row.id);
  const saveButton = <SaveDiamondButton compact={row.kind !== 'technique'} label={row.kind === 'technique' ? '' : undefined} saved accessibilityLabel={`${row.title}のお気に入りを解除`} onPress={removeSaved} />;
  if (row.kind === 'feature') return <PersonalContentCard row={row} onPress={onPress} action={saveButton} />;
  const technique = row.kind === 'technique' ? techniqueById.get(row.id) : undefined;
  const theory = row.kind === 'theory' && !isRetiredTheoryId(row.id) ? theoryById.get(row.id) : undefined;
  return <View testID={`personal-content-${row.kind}`} style={styles.entry}>
    {technique ? <ShoseijutsuListCard card={technique} readable={canReadTechnique(effectiveAccess, technique.id) && technique.status !== 'locked'}
      onOpen={onPress} openLabel={`${row.title}を開く`} testID="saved-technique-row" />
      : theory ? <TheoryListCard theory={theory} readable={canReadTheory(effectiveAccess, theory.tagId)}
        onOpen={onPress} testID="saved-theory-row" />
        : <View testID="saved-content-unavailable" style={styles.unavailable}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress}><AppText style={styles.title}>{row.title}</AppText><AppText style={styles.note}>{row.description || '保存の記録は保持されています。'}</AppText></Pressable>
          <View style={styles.actions}>{saveButton}</View>
        </View>}
  </View>;
}
const styles = StyleSheet.create({
  entry: { width: '100%', minWidth: 0 },
  unavailable: { padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  title: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28 }, note: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
});
