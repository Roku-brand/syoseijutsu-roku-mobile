import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import { techniqueById, theoryById } from '@/data/catalog';
import { isRetiredTheoryId } from '@/data/theory-knowledge';
import { useAppState } from '@/state/app-state';
import { colors, fonts } from '@/constants/theme';
import { AppText } from './ui';
import { SaveDiamondButton } from './book-ui';
import { ShoseijutsuCard } from './shoseijutsu-card';
import { TheoryCard } from './theory-card';
import { PersonalContentCard, type PersonalContentRow } from './personal-content-card';

/** Saved IDs/folders keep their existing storage model; only presentation changes. */
export function SavedKnowledgeCard({ row, onPress, onOrganize }: { row: PersonalContentRow; onPress: () => void; onOrganize: () => void }) {
  'use no memo';
  const { accessState } = useAccess();
  const { toggleSaved, toggleSavedTheory } = useAppState();
  const organize = <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}の保存先を変更`} onPress={onOrganize} style={styles.organize}><AppText style={styles.organizeText}>整理</AppText></Pressable>;
  if (row.kind === 'feature') return <PersonalContentCard row={row} onPress={onPress} action={organize} />;
  const actions = <>{organize}<SaveDiamondButton compact saved accessibilityLabel={`${row.title}のお気に入りを解除`} onPress={() => row.kind === 'technique' ? toggleSaved(row.id) : toggleSavedTheory(row.id)} /></>;
  const technique = row.kind === 'technique' ? techniqueById.get(row.id) : undefined;
  const theory = row.kind === 'theory' && !isRetiredTheoryId(row.id) ? theoryById.get(row.id) : undefined;
  return <View testID={`personal-content-${row.kind}`} style={styles.entry}>
    {technique ? <ShoseijutsuCard card={technique} readable={canReadTechnique(accessState === 'paid' ? 'paid' : 'guest', technique.id) && technique.status !== 'locked'} actions={actions} onPress={onPress} openLabel={`${row.title}を開く`} role="button" />
      : theory ? <TheoryCard theory={theory} actions={actions} onPress={onPress} role="button" />
        : <View testID="saved-content-unavailable" style={styles.unavailable}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress}><AppText style={styles.title}>{row.title}</AppText><AppText style={styles.note}>{row.description || '保存の記録は保持されています。'}</AppText></Pressable>
          <View style={styles.actions}>{actions}</View>
        </View>}
  </View>;
}
const styles = StyleSheet.create({
  entry: { width: '100%', minWidth: 0, marginBottom: 12 },
  organize: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' }, organizeText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  unavailable: { padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  title: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28 }, note: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
});
