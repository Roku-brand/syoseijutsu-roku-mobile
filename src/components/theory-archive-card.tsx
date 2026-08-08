import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
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
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={styles.metaRow}>
          <AppText variant="label" style={styles.id}>
            {getTheoryDisplayId(theory)}
          </AppText>
        </View>

        <View style={styles.titleRow}>
          <AppText variant="serif" style={styles.title}>
            {theory.title}
          </AppText>
          <View style={styles.theoryPill}>
            <AppText variant="caption" style={styles.theoryPillText}>理論</AppText>
          </View>
        </View>
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
    minHeight: 132,
    position: 'relative',
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardCompact: { minHeight: 126 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.994 }] },
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
  id: { color: colors.gold, fontSize: 10, letterSpacing: 1.1 },
  titleRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 22,
    lineHeight: 31,
    fontWeight: '700',
  },
  theoryPill: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paperDeep,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  theoryPillText: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
  },
  summary: {
    width: '100%',
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
    color: colors.gold,
    fontSize: 30,
    lineHeight: 32,
    marginRight: -4,
  },
  pageMotif: { display: 'none' },
  pageLine: {
    height: 1,
    backgroundColor: 'rgba(52,73,92,0.08)',
  },
});
