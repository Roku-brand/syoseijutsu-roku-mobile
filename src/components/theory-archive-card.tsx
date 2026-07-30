import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { AppText } from './ui';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export function TheoryArchiveCard({
  theory,
}: {
  theory: TheoryCard;
}) {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 620;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${theory.title}を開く`}
      onPress={() =>
        router.push({
          pathname: '/theory/[id]',
          params: { id: theory.tagId },
        })
      }
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.spine, compact && styles.spineCompact]}>
        <AppText style={styles.bookMark}>冊</AppText>
        <AppText style={styles.spineLabel}>理{'\n'}論</AppText>
      </View>

      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={styles.metaRow}>
          <AppText variant="label" style={styles.id}>
            {getTheoryDisplayId(theory)}
          </AppText>
        </View>

        <AppText variant="serif" style={styles.title}>
          {theory.title}
        </AppText>
        {theory.summary ? (
          <AppText
            style={styles.summary}
            numberOfLines={compact ? 3 : 2}
          >
            {theory.summary}
          </AppText>
        ) : null}

        <View style={styles.footer}>
          <AppText style={styles.chevron}>›</AppText>
        </View>
      </View>

      <View style={styles.pageMotif} accessibilityElementsHidden>
        <View style={styles.pageLine} />
        <View style={styles.pageLine} />
        <View style={styles.pageLine} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 176,
    position: 'relative',
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#4E6276',
    borderRadius: radius.md,
    backgroundColor: '#EEF0ED',
    overflow: 'hidden',
    shadowColor: '#263544',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  cardCompact: { minHeight: 164 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.994 }] },
  spine: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#263544',
    borderRightWidth: 1,
    borderRightColor: '#B59652',
  },
  spineCompact: { width: 56, gap: 6 },
  bookMark: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  spineLabel: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  copy: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  copyCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  metaRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  id: { color: '#5F6970', fontSize: 10, letterSpacing: 1.1 },
  title: {
    marginTop: 5,
    color: colors.ink,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
  },
  summary: {
    maxWidth: 900,
    marginTop: 7,
    color: '#5E6463',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    minHeight: 30,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  chevron: {
    color: '#34495C',
    fontSize: 30,
    lineHeight: 32,
    marginRight: -4,
  },
  pageMotif: {
    position: 'absolute',
    right: 74,
    bottom: 21,
    width: 150,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(52,73,92,0.07)',
    borderRadius: 24,
    opacity: 0.75,
    paddingHorizontal: 26,
    paddingVertical: 11,
    gap: 7,
    transform: [{ rotate: '-4deg' }],
  },
  pageLine: {
    height: 1,
    backgroundColor: 'rgba(52,73,92,0.08)',
  },
});
