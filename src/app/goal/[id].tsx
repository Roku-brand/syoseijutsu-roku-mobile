import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS } from '@/access/access-config';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards } from '@/data/catalog';
import { getSearchGoal, rankByGoal } from '@/data/search';

export function generateStaticParams() {
  return [
    { id: 'protect' },
    { id: 'improve' },
    { id: 'decide' },
    { id: 'communicate' },
    { id: 'act' },
    { id: 'reset' },
  ];
}

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPaid } = useAccess();
  const goal = getSearchGoal(id ?? '');

  if (!goal) {
    return (
      <Screen>
        <EmptyState title="目的が見つかりません" description="探す画面へ戻って、別の目的を選んでください。" />
      </Screen>
    );
  }

  const availableCards = techniqueCards.filter((card) => isPaid || FREE_TECHNIQUE_IDS.has(card.id));
  const cards = rankByGoal(availableCards, goal.id);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.mark}>
          <AppText style={styles.markText}>{goal.mark}</AppText>
        </View>
        <View style={styles.heroCopy}>
          <AppText style={styles.eyebrow}>目的から探す</AppText>
          <AppText variant="serif" style={styles.title}>{goal.label}</AppText>
          <AppText style={styles.description}>{goal.description}ための処世術を、関連度順に並べています。</AppText>
        </View>
      </View>

      <View style={styles.resultHeader}>
        <AppText style={styles.resultLabel}>関連する処世術</AppText>
        <AppText style={styles.resultCount}>{cards.length}件</AppText>
      </View>

      {cards.length ? (
        cards.map((card) => <TechniqueRow key={card.id} card={card} />)
      ) : (
        <View style={styles.emptyBox}>
          <AppText style={styles.emptyText}>この目的に結びつく処世術はありません。</AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.section },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 21, fontWeight: '700' },
  heroCopy: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  resultLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  resultCount: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  emptyBox: { padding: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  emptyText: { color: colors.muted, textAlign: 'center' },
});
