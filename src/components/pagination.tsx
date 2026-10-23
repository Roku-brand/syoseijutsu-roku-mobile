import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { AppText } from './ui';

/** Both catalogues use the same compact, directly selectable page control. */
export function Pagination({ page, totalPages, onSelect, tone = 'technique', label, testID }: {
  page: number; totalPages: number; onSelect: (page: number) => void;
  tone?: 'technique' | 'theory' | 'neutral'; label: string; testID?: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [page, totalPages]);
  if (totalPages <= 1) return null;
  const current = Math.min(totalPages, Math.max(1, page));
  const ink = tone === 'theory' ? catalogTheme.theory.ink : tone === 'neutral' ? colors.ink : colors.goldDeep;
  const select = (value: number) => { setOpen(false); onSelect(value); };
  return <View testID={testID} accessibilityLabel={label} style={styles.pagination}>
    <Pressable accessibilityRole="button" accessibilityLabel="前のページ" disabled={current === 1} onPress={() => select(current - 1)} style={[styles.arrow, current === 1 && styles.disabled]}><AppText style={[styles.arrowText, { color: ink }]}>‹</AppText></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}：${current}/${totalPages}`} aria-expanded={open} accessibilityHint="ページを選択します" onPress={() => setOpen(true)} style={[styles.trigger, { borderColor: ink }]}>
      <AppText style={[styles.text, { color: ink }]}>{current}<AppText style={styles.total}> / {totalPages}</AppText></AppText><AppText style={{ color: ink }}>⌄</AppText>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="次のページ" disabled={current === totalPages} onPress={() => select(current + 1)} style={[styles.arrow, current === totalPages && styles.disabled]}><AppText style={[styles.arrowText, { color: ink }]}>›</AppText></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}><View role="dialog" aria-modal accessibilityLabel={label} style={styles.dialog}>
        <View style={styles.heading}><AppText style={styles.headingText}>ページを選ぶ</AppText><Pressable accessibilityRole="button" accessibilityLabel="ページ選択を閉じる" onPress={() => setOpen(false)} style={styles.close}><AppText style={{ color: ink }}>閉じる</AppText></Pressable></View>
        <ScrollView contentContainerStyle={styles.pages}>{Array.from({ length: totalPages }, (_, index) => index + 1).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}ページ目`} accessibilityState={{ selected: value === current }} aria-current={value === current ? 'page' : undefined} onPress={() => select(value)} style={[styles.page, { borderColor: ink }, value === current && { backgroundColor: ink }]}><AppText style={[styles.text, { color: value === current ? colors.surface : ink }]}>{value}</AppText></Pressable>)}</ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trigger: { minHeight: 44, minWidth: 86, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface },
  text: { fontFamily: fonts.sans, fontVariant: ['tabular-nums'], fontSize: 14, lineHeight: 22, fontWeight: '600' },
  total: { fontWeight: '400' }, arrow: { width: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, arrowText: { fontSize: 26, lineHeight: 32 }, disabled: { opacity: 0.25 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(23,23,18,0.38)' },
  dialog: { width: '100%', maxWidth: 380, maxHeight: '80%', padding: 20, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, headingText: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 }, close: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  pages: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, page: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
});
