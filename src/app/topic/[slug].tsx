import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, DetailHeader, EmptyState } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards } from '@/data/catalog';
import {
  guidedTopicBySlug,
  guidedTopics,
} from '@/data/guided-topics';

export function generateStaticParams() {
  return guidedTopics.map((topic) => ({ slug: topic.slug }));
}

export default function GuidedTopicScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const topic = guidedTopicBySlug.get(slug);

  if (!topic) {
    return (
      <BookScreen>
        <DetailHeader title="悩みから探す" />
        <EmptyState
          title="分類が見つかりません"
          description="前の画面へ戻って、別の分類を選んでください。"
        />
      </BookScreen>
    );
  }

  const items = techniqueCards.filter((card) => card.tags?.includes(topic.tag));

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <DetailHeader title="悩みから探す" />

      <View style={styles.hero}>
        <View style={styles.mark}>
          <AppText style={styles.markText}>{topic.mark}</AppText>
        </View>
        <View style={styles.heroCopy}>
          <AppText variant="label" style={styles.group}>
            {topic.group}
          </AppText>
          <AppText variant="display" style={styles.title}>
            {topic.label}
          </AppText>
          <AppText style={styles.description}>{topic.description}</AppText>
        </View>
      </View>

      <View style={styles.indexHeading}>
        <AppText variant="serif" style={styles.indexTitle}>
          処世術一覧
        </AppText>
        <AppText variant="label" style={styles.count}>
          {items.length}
        </AppText>
      </View>

      {items.length ? (
        <View style={styles.list}>
          {items.map((card, index) => (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={`${card.title}を開く`}
              onPress={() =>
                router.push({
                  pathname: '/card/[id]',
                  params: { id: card.id },
                })
              }
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
            >
              <AppText variant="label" style={styles.number}>
                {String(index + 1).padStart(2, '0')}
              </AppText>
              <AppText variant="serif" style={styles.rowTitle}>
                {card.title}
              </AppText>
              <AppText style={styles.chevron}>›</AppText>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState
          mark="余"
          title="該当する処世術はありません"
          description="別の分類から探してみてください。"
        />
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 980,
    paddingBottom: 120,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.56)',
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  markText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
  },
  heroCopy: { flex: 1 },
  group: { color: colors.gold, marginBottom: 3 },
  title: { fontSize: 30, lineHeight: 42, letterSpacing: 1.5 },
  description: {
    marginTop: 5,
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 23,
  },
  indexHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
  },
  indexTitle: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 31,
    letterSpacing: 1,
  },
  count: { color: colors.gold },
  list: {
    borderTopWidth: 1,
    borderTopColor: colors.goldLight,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 13,
    paddingHorizontal: spacing.sm,
  },
  rowPressed: {
    backgroundColor: 'rgba(210,182,111,0.12)',
    paddingLeft: spacing.md,
  },
  number: {
    width: 28,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  rowTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  chevron: {
    color: colors.gold,
    fontSize: 25,
    lineHeight: 28,
  },
});
