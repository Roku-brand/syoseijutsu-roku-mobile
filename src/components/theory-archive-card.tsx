import { StyleSheet, View } from 'react-native';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { SaveDiamondButton } from './book-ui';
import { useAppToast } from './app-toast';
import { TheoryCard } from './theory-card';

/** Search and saved folders share the same dictionary entry presentation. */
export function TheoryArchiveCard({ theory }: { theory: TheoryRecord }) {
  const { savedTheoryIds, toggleSavedTheory } = useAppState();
  const showToast = useAppToast();
  const saved = savedTheoryIds.includes(theory.tagId);
  return <View style={styles.entry}><TheoryCard theory={theory} actions={<SaveDiamondButton saved={saved} compact onPress={() => { toggleSavedTheory(theory.tagId); showToast(saved ? 'お気に入りから外しました' : 'お気に入りに保存しました'); }} />} /></View>;
}
const styles = StyleSheet.create({ entry: { marginBottom: 16 } });
