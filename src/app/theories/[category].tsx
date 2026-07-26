import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';

const categoryDescriptions: Record<string, string> = {
  psychology: '人の認知・感情・対人関係を理解する',
  'behavioral-science': '選択・習慣・行動変容の仕組みを読む',
  'organization-management': '組織・評価・権力・協働の力学を読む',
  strategy: '競争・交渉・不確実性の中で勝ち筋をつくる',
  'classics-thought': '古典に残る判断と人間観を現代へ引き寄せる',
  'maxims-experience': '格言・経験則・作品から判断の軸を得る',
};

export function generateStaticParams() {
  return [...new Set(theories.map((theory) => theory.categoryId))].map(
    (category) => ({ category }),
  );
}

export default function TheoryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const items = theories.filter((theory) => theory.categoryId === category);
  const title = items[0]?.categoryTitle;

  if (!items.length) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="理論カテゴリが見つかりません"
          description="前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <DetailHeader title="理論辞典" />
      <View style={styles.hero}>
        <Pill active>理論辞典</Pill>
        <AppText variant="display" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>
          {categoryDescriptions[category] ?? '処世術を支える知識を読む'}
        </AppText>
      </View>

      <View style={styles.sectionTitle}>
        <AppText variant="serif" style={styles.sectionLabel}>
          {items.length}の理論
        </AppText>
        <View style={styles.rule} />
        <AppText style={styles.ruleMark}>✦</AppText>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineLine} />
        {items.map((theory, index) => (
          <View key={theory.tagId} style={styles.timelineItem}>
            <View style={styles.node} />
            <Link
              href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${theory.title}を開く`}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.indexColumn}>
                  <AppText variant="serif" style={styles.number}>
                    {String(index + 1).padStart(3, '0')}
                  </AppText>
                  <View style={styles.indexRule} />
                  <AppText variant="label" style={styles.id}>
                    {theory.tagId}
                  </AppText>
                </View>
                <View style={styles.copy}>
                  <View style={styles.cardTopline}>
                    <AppText variant="serif" style={styles.cardTitle}>
                      {theory.title}
                    </AppText>
                    <View style={styles.discipline}>
                      <AppText variant="caption" style={styles.disciplineText}>
                        {theory.discipline}
                      </AppText>
                    </View>
                  </View>
                  <AppText style={styles.summary} numberOfLines={3}>
                    {theory.summary}
                  </AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
              </Pressable>
            </Link>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.xs },
  title: { marginTop: spacing.lg, fontSize: 46, lineHeight: 59 },
  description: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 17, lineHeight: 28 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  sectionLabel: { fontSize: 24, color: colors.gold },
  rule: { height: 1, flex: 1, backgroundColor: colors.gold, opacity: 0.78, marginTop: 9 },
  ruleMark: { color: colors.gold, fontSize: 16, marginTop: 5 },
  timeline: { position: 'relative', paddingLeft: 34, paddingTop: spacing.md, paddingBottom: spacing.sm },
  timelineLine: {
    position: 'absolute',
    top: spacing.md,
    bottom: 24,
    left: 10,
    width: 1.5,
    backgroundColor: colors.gold,
  },
  timelineItem: { position: 'relative', marginBottom: 14 },
  node: {
    position: 'absolute',
    left: -34,
    top: 40,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.paper,
    zIndex: 1,
  },
  card: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
  },
  pressed: { opacity: 0.66 },
  indexColumn: { width: 72, justifyContent: 'center', alignItems: 'flex-start' },
  number: { color: colors.gold, fontSize: 27, lineHeight: 34 },
  indexRule: { width: 30, height: 1, backgroundColor: colors.goldLight, marginVertical: spacing.sm },
  id: { color: colors.gold, fontSize: 10 },
  copy: { flex: 1, justifyContent: 'center' },
  cardTopline: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardTitle: { flex: 1, fontSize: 23, lineHeight: 32 },
  discipline: {
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: 88,
  },
  disciplineText: { color: colors.gold, fontSize: 10, lineHeight: 14 },
  summary: { marginTop: spacing.sm, color: colors.muted, fontSize: 14, lineHeight: 22 },
  chevron: { alignSelf: 'center', color: colors.gold, fontSize: 34, lineHeight: 38, marginLeft: -6 },
});
