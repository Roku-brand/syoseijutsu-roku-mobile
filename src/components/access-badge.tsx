import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { AppText } from './ui';

function LockGlyph() {
  return (
    <View accessibilityElementsHidden style={styles.lockGlyph}>
      <View style={styles.shackle} />
      <View style={styles.lockBody}>
        <View style={styles.keyhole} />
      </View>
    </View>
  );
}

export function AccessBadge({ locked, compact = false }: { locked: boolean; compact?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={locked ? '完全版限定' : '無料公開'}
      style={[styles.badge, locked ? styles.locked : styles.free, compact && styles.compact]}
    >
      {locked ? <LockGlyph /> : <View style={styles.freeDot} />}
      <AppText style={[styles.label, locked ? styles.lockedLabel : styles.freeLabel]}>
        {locked ? '完全版' : '無料公開'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  compact: { minHeight: 24, paddingHorizontal: 8, gap: 5 },
  locked: { borderColor: '#C9AB68', backgroundColor: '#272724' },
  free: { borderColor: '#B89A5A', backgroundColor: '#F5EFE2' },
  label: { fontSize: 9, lineHeight: 13, fontWeight: '700', letterSpacing: 0.5 },
  lockedLabel: { color: '#F0D99D' },
  freeLabel: { color: '#76591F' },
  lockGlyph: { width: 11, height: 13, alignItems: 'center', justifyContent: 'flex-end' },
  shackle: { position: 'absolute', top: 0, width: 8, height: 8, borderWidth: 1.4, borderColor: '#F0D99D', borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  lockBody: { width: 11, height: 8, borderRadius: 2, backgroundColor: '#F0D99D', alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 2, height: 3, borderRadius: 1, backgroundColor: colors.charcoal },
  freeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8B6928' },
});
