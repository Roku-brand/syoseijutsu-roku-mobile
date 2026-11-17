import type { PropsWithChildren, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppText } from './ui';

/** Shared paper-and-gold popup for principles and deck selection. */
export function BookPopup({ visible, compact, title, closeLabel, mark, onClose, onShow, testID, children }: PropsWithChildren<{
  visible: boolean; compact: boolean; title: string; closeLabel: string; mark?: ReactNode;
  onClose: () => void; onShow?: () => void; testID?: string;
}>) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose} onShow={onShow}>
    <View style={[styles.root, compact && styles.compactRoot]}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View testID={testID} accessibilityViewIsModal style={[styles.card, compact && styles.compactCard, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>{mark}<View style={styles.copy}><AppText style={styles.eyebrow}>処世術禄</AppText><AppText accessibilityRole="header" style={styles.title}>{title}</AppText></View></View>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.close, pressed && { opacity: .7 }]}><AppText style={styles.closeText}>×</AppText></Pressable>
        </View>
        {children}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,17,16,0.72)' },
  compactRoot: { paddingHorizontal: 0, paddingTop: 72, paddingBottom: 0, justifyContent: 'flex-end' },
  card: { width: '100%', maxWidth: 680, maxHeight: '92%', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.paper, overflow: 'hidden', ...shadow.card },
  compactCard: { maxHeight: '88%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { minHeight: 82, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.charcoal, borderBottomWidth: 1, borderBottomColor: colors.gold },
  titleGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flexShrink: 1 },
  eyebrow: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 10, lineHeight: 14, letterSpacing: 2 },
  title: { color: colors.surface, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 2 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,182,111,0.45)' },
  closeText: { color: colors.goldLight, fontSize: 29, lineHeight: 32, fontWeight: '300' },
});
