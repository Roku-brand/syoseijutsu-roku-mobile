import { StyleSheet, View } from 'react-native';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { SaveDiamondButton } from './book-ui';
import { useAppToast } from './app-toast';
import { ShoseijutsuCard } from './shoseijutsu-card';

/** Search results use the same catalogue card and the existing saved-state actions. */
export function TechniqueRow({ card }: { card: TechniqueCard }) {
  const { savedIds, toggleSaved } = useAppState();
  const showToast = useAppToast();
  const saved = savedIds.includes(card.id);
  return <View style={styles.entry}><ShoseijutsuCard card={card} openLabel={`${card.title}を開く`} actions={<SaveDiamondButton saved={saved} accessibilityLabel={saved ? '保存を解除' : '保存'} onPress={() => { toggleSaved(card.id); showToast(saved ? '蔵書から外しました' : '蔵書に保存しました'); }} />} /></View>;
}
const styles = StyleSheet.create({ entry: { marginBottom: 16 } });
