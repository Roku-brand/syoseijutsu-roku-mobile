import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
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
  const router = useRouter();
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
        {items.map((theory, index) => (
          <View key={theory.tagId} style={styles.timelineItem}>
            <View style={styles.node}>
              <AppText variant="label" style={styles.nodeNumber}>
                {index + 1}
              </AppText>
            </View>
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
                pressed && styles.pressed,
              ]}
            >
                <View style={styles.copy}>
                  <AppText variant="label" style={styles.cardId}>
                    {theory.tagId}
                  </AppText>
                  <View style={styles.cardTopline}>
                    <AppText variant="serif" style={styles.cardTitle}>
                      {theory.title}
                    </AppText>
                  </View>
                  <AppText style={styles.summary} numberOfLines={3}>
                    {theory.summary}
                  </AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.md },
  title: { marginTop: spacing.lg, fontSize: 46, lineHeight: 59 },
  description: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 17, lineHeight: 28 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.section,
  },
  sectionLabel: { fontSize: 24, color: colors.gold },
  rule: { height: 1, flex: 1, backgroundColor: colors.gold, opacity: 0.78, marginTop: 9 },
  ruleMark: { color: colors.gold, fontSize: 16, marginTop: 5 },
  timeline: { position: 'relative', paddingTop: spacing.lg, paddingBottom: spacing.sm },
  timelineItem: { position: 'relative', marginBottom: spacing.lg },
  node: {
    position: 'absolute',
    left: -20,
    top: 54,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  card: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.xl,
    shadowColor: '#2B241A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressed: { opacity: 0.66 },
  nodeNumber: { color: colors.gold, fontSize: 12, lineHeight: 16 },
  cardId: { color: colors.gold, fontSize: 10, lineHeight: 14, marginBottom: spacing.sm },
  copy: { flex: 1, justifyContent: 'center' },
  cardTopline: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontSize: 23, lineHeight: 32 },
  summary: { marginTop: spacing.sm, color: colors.muted, fontSize: 14, lineHeight: 22 },
  chevron: { alignSelf: 'center', color: colors.gold, fontSize: 34, lineHeight: 38, marginLeft: -6 },
});
