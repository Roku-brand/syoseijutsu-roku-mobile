import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { techniqueCards, theoryById } from '@/data/catalog';

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theory = theoryById.get(id);

  if (!theory) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="理論が見つかりません"
          description="前の画面へ戻り、別の理論を選んでください。"
        />
      </Screen>
    );
  }

  const related = techniqueCards
    .filter((card) => card.theoryTagIds?.includes(theory.tagId))
    .slice(0, 12);

  return (
    <Screen>
      <DetailHeader title={theory.tagId} />
      <Pill active>{theory.categoryTitle}</Pill>
      <AppText variant="title" style={styles.title}>
        {theory.title}
      </AppText>
      <AppText style={styles.summary}>{theory.summary}</AppText>

      {theory.definition && (
        <>
          <SectionHeader title="定義" />
          <View style={styles.definition}>
            <AppText>{theory.definition}</AppText>
          </View>
        </>
      )}

      <TheoryList title="要点" items={theory.keyPoints} tone="default" />
      <TheoryList title="落とし穴" items={theory.pitfalls} tone="caution" />
      <TheoryList title="実践方法" items={theory.strategies} tone="action" />
      <TheoryList
        title="使える場面"
        items={theory.applicationConditions}
        tone="default"
      />

      <SectionHeader title="この理論に関連する処世術" count={related.length} />
      {related.map((card) => (
        <TechniqueRow key={card.id} card={card} />
      ))}
    </Screen>
  );
}

function TheoryList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone: 'default' | 'caution' | 'action';
}) {
  if (!items?.length) return null;
  return (
    <>
      <SectionHeader title={title} />
      <View
        style={[
          styles.list,
          tone === 'caution' && styles.listCaution,
          tone === 'action' && styles.listAction,
        ]}
      >
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.listRow}>
            <AppText variant="label" style={styles.listIndex}>
              {String(index + 1).padStart(2, '0')}
            </AppText>
            <AppText style={styles.listText}>{item}</AppText>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg },
  summary: { color: colors.inkSoft, fontSize: 17, lineHeight: 30, marginTop: spacing.md },
  definition: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 14,
  },
  listCaution: { backgroundColor: '#EFE3DD' },
  listAction: { backgroundColor: '#E2E8DF' },
  listRow: { flexDirection: 'row', gap: spacing.md },
  listIndex: { color: colors.gold, width: 26, paddingTop: 2 },
  listText: { flex: 1 },
});
