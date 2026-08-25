import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { AppText } from './ui';
import { SaveDiamondButton } from './book-ui';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useAppState } from '@/state/app-state';
import { useAppToast } from './app-toast';
import { getTheoryCoverSummary } from '@/data/theory-display';

export function TheoryArchiveCard({
  theory,
}: {
  theory: TheoryCard;
}) {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 620;
  const showToast = useAppToast();
  const { savedTheoryIds, toggleSavedTheory } = useAppState();
  const saved = savedTheoryIds.includes(theory.tagId);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${theory.title}を開く`}
        onPress={() => router.push({ pathname: '/theory/[id]', params: { id: theory.tagId } })}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}
      >
        <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={styles.metaRow}>
          <AppText variant="label" style={styles.id}>
            {getTheoryDisplayId(theory)}
          </AppText>
          <View style={styles.theoryPill}>
            <AppText variant="caption" style={styles.theoryPillText}>
              {theory.sourceType || theory.categoryTitle}
            </AppText>
          </View>
        </View>

        <AppText variant="serif" style={styles.title}>{theory.title}</AppText>
        {theory.summary ? (
          <AppText style={styles.summary}>
            {getTheoryCoverSummary(theory.summary)}
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
      <View style={styles.saveButton}>
        <SaveDiamondButton
          saved={saved}
          compact
          onPress={() => {
            toggleSavedTheory(theory.tagId);
            showToast(saved ? '蔵書から外しました' : '蔵書に保存しました');
          }}
        />
      </View>
    </View>
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
  openArea: { flex: 1 },
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
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
  id: { color: colors.gold, fontSize: 10, letterSpacing: 1.1 },
  title: {
    marginTop: 6,
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
  saveButton: { position: 'absolute', top: 10, right: 10, zIndex: 2 },
  pageLine: {
    height: 1,
    backgroundColor: 'rgba(52,73,92,0.08)',
  },
});
