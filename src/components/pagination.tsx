import { Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { AppText } from './ui';

export function Pagination({ page, totalPages, onSelect, tone = 'technique', label, testID }: {
  page: number; totalPages: number; onSelect: (page: number) => void; tone?: 'technique' | 'theory' | 'neutral'; label: string; testID?: string;
}) {
  if (totalPages <= 1) return null;
  const ink = tone === 'neutral' ? colors.ink : tone === 'theory' ? catalogTheme.theory.ink : colors.gold;
  const inactive = tone === 'theory' ? catalogTheme.theory.inactive : 'transparent';
  const border = tone === 'neutral' ? colors.ink : tone === 'theory' ? catalogTheme.theory.inactive : colors.gold;
  return <View testID={testID} accessibilityLabel={label} style={styles.pagination}>
    {Array.from({ length: totalPages }, (_, index) => index + 1).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}ページ目`} accessibilityState={{ selected: value === page }} aria-current={value === page ? 'page' : undefined} aria-selected={value === page} onPress={() => onSelect(value)} style={({ pressed }) => [styles.button, { borderColor: value === page ? ink : border, backgroundColor: value === page ? ink : inactive }, pressed && styles.pressed]}>
      <AppText style={[styles.text, { color: value === page ? colors.surface : ink }, value === page && styles.activeText]}>{value}</AppText>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  pagination: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 6, marginBottom: 22 },
  button: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.serif, fontVariant: ['tabular-nums'], fontSize: 14, lineHeight: 20, textAlign: 'center' },
  activeText: { fontWeight: '600' }, pressed: { opacity: 0.7 },
});
