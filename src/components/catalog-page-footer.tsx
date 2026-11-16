import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText } from './ui';
import { Pagination } from './pagination';

export function CatalogPageFooter({ page, totalPages, onSelect, onTop, label, testID, theory = false }: {
  page: number; totalPages: number; onSelect: (page: number) => void; onTop: () => void; label: string; testID: string; theory?: boolean;
}) {
  return <View testID={testID} style={styles.footer}>
    <Pagination page={page} totalPages={totalPages} onSelect={onSelect} tone={theory ? 'theory' : 'technique'} label={label} />
    <Pressable accessibilityRole="button" accessibilityLabel="一覧の先頭へ戻る" onPress={onTop} style={({ pressed }) => [styles.top, pressed && { opacity: .7 }]}><AppText style={styles.text}>↑　先頭へ戻る</AppText></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  top: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }, text: { color: colors.goldDeep, fontSize: 13 },
});
