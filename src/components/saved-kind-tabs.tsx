import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { AppText } from './ui';

export type SavedKind = 'technique' | 'theory' | 'feature';
const kinds: { id: SavedKind; label: string }[] = [
  { id: 'technique', label: '処世術' },
  { id: 'theory', label: '理論' },
  { id: 'feature', label: '特集' },
];

export function SavedKindTabs({ selected, onSelect, counts, testID = 'saved-kind-tabs' }: {
  selected: SavedKind;
  onSelect: (kind: SavedKind) => void;
  counts: Record<SavedKind, number>;
  testID?: string;
}) {
  return <View testID={testID} style={styles.row}>
    {kinds.map(kind => {
      const active = kind.id === selected;
      return <Pressable key={kind.id} testID={`${testID}-${kind.id}`} accessibilityRole="tab"
        accessibilityLabel={`${kind.label}のお気に入り ${counts[kind.id]}件`}
        accessibilityState={{ selected: active }} aria-selected={active} onPress={() => onSelect(kind.id)}
        style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}>
        <AppText style={[styles.label, active && styles.labelActive]}>{kind.label}</AppText>
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, width: '100%' },
  tab: { flex: 1, minWidth: 0, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  tabActive: { borderColor: '#205C4D', backgroundColor: '#205C4D' },
  label: { color: '#205C4D', fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  labelActive: { color: colors.white, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
