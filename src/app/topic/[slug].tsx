import { Link, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { techniqueCards } from '@/data/catalog';
import {
  guidedTopicBySlug,
  guidedTopics,
} from '@/data/guided-topics';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export function generateStaticParams() {
  return guidedTopics.map((topic) => ({ slug: topic.slug }));
}

export default function GuidedTopicScreen() {
  const { width } = useHydratedWindowDimensions();
  const { slug, category, subcategory } = useLocalSearchParams<{
    slug: string;
    category?: string;
    subcategory?: string;
  }>();
  const topic = guidedTopicBySlug.get(slug);
  const compact = width < 640;

  if (!topic) {
    return (
      <BookScreen>
        <EmptyState
          title="分類が見つかりません"
          description="前の画面へ戻って、別の分類を選んでください。"
        />
      </BookScreen>
    );
  }

  const items = techniqueCards.filter(
    (card) =>
      card.tags?.includes(topic.tag) &&
      (!category || card.categoryKey === category) &&
      (!subcategory || card.subcategory === subcategory),
  );
  const chapterIndex =
    guidedTopics.filter((item) => item.group === topic.group).indexOf(topic) + 1;

  return (
    <BookScreen contentContainerStyle={styles.content}>

      <View style={styles.chapterShell}>
        <View style={styles.chapterPanel}>
          <Corner position="topLeft" />
          <Corner position="topRight" />
          <Corner position="bottomLeft" />
          <Corner position="bottomRight" />

          <AppText style={styles.watermark}>{topic.mark}</AppText>

          <View style={[styles.chapterHeader, compact && styles.chapterHeaderCompact]}>
            <View style={[styles.mark, compact && styles.markCompact]}>
              <AppText style={[styles.markText, compact && styles.markTextCompact]}>
                {topic.mark}
              </AppText>
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="label" style={styles.group}>
                {topic.group}　{toKanjiChapter(chapterIndex)}
              </AppText>
              <AppText
                accessibilityRole="header"
                aria-level={1}
                variant="display"
                style={[styles.title, compact && styles.titleCompact]}
              >
                {topic.label}
              </AppText>
              <AppText style={styles.description}>{topic.description}</AppText>
            </View>
          </View>

          <View style={styles.ornamentRule}>
            <View style={styles.ruleLine} />
          </View>

          <View style={styles.indexHeading}>
            <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.indexTitle}>
              この章の処世術
            </AppText>
            <AppText variant="label" style={styles.count}>
              {items.length}
            </AppText>
          </View>

          {items.length ? (
            <View style={styles.list}>
              {items.map((card, index) => (
                <Link key={card.id} href={{ pathname: '/card/[id]', params: { id: card.id } }} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${card.title}を開く`}
                    style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.rowPressed]}
                  >
                    <AppText variant="label" style={styles.number}>{index + 1}</AppText>
                    <AppText variant="serif" style={[styles.rowTitle, compact && styles.rowTitleCompact]}>{card.title}</AppText>
                    <AppText style={styles.chevron}>›</AppText>
                  </Pressable>
                </Link>
              ))}
            </View>
          ) : (
            <EmptyState
              mark="余"
              title="該当する処世術はありません"
              description="別の分類から探してみてください。"
            />
          )}
        </View>
      </View>
    </BookScreen>
  );
}

function Corner({
  position,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        position.includes('top') ? styles.cornerTop : styles.cornerBottom,
        position.includes('Left') ? styles.cornerLeft : styles.cornerRight,
      ]}
    >
      <View style={styles.cornerInner} />
    </View>
  );
}

function toKanjiChapter(index: number) {
  const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return `第${numerals[index - 1] ?? index}章`;
}

const styles = StyleSheet.create({
  content: {
    maxWidth: 1040,
    paddingBottom: 120,
  },
  chapterShell: {
    marginTop: spacing.md,
    borderRadius: 18,
  },
  chapterPanel: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 150,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  chapterHeaderCompact: {
    alignItems: 'flex-start',
    gap: 14,
    minHeight: 128,
    paddingHorizontal: 0,
    paddingTop: spacing.sm,
  },
  mark: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.charcoal,
  },
  markCompact: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
  },
  markText: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
  },
  markTextCompact: { fontSize: 23, lineHeight: 30 },
  heroCopy: { flex: 1 },
  group: {
    color: colors.gold,
    marginBottom: spacing.sm,
    fontSize: 12,
    letterSpacing: 1.4,
  },
  title: {
    color: '#171B20',
    fontSize: 36,
    lineHeight: 48,
    letterSpacing: 2.4,
  },
  titleCompact: { fontSize: 25, lineHeight: 35, letterSpacing: 1.2 },
  description: {
    marginTop: spacing.sm,
    color: '#3E3A34',
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.7,
  },
  watermark: { display: 'none' },
  ornamentRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  ruleLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  indexHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  indexTitle: {
    color: '#171B20',
    fontSize: 22,
    lineHeight: 31,
    letterSpacing: 1.3,
  },
  count: { color: '#A7833D' },
  list: {
    borderTopWidth: 1,
    borderTopColor: '#89745B',
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#B9AA95',
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
  },
  rowCompact: { minHeight: 62, gap: spacing.sm },
  rowPressed: {
    backgroundColor: 'rgba(179,138,54,0.11)',
    paddingLeft: spacing.md,
  },
  number: {
    width: 52,
    color: '#A7833D',
    fontSize: 11,
    letterSpacing: 1,
  },
  rowTitle: {
    flex: 1,
    color: '#171B20',
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '600',
  },
  rowTitleCompact: { fontSize: 15, lineHeight: 23 },
  chevron: {
    color: '#A7833D',
    fontSize: 25,
    lineHeight: 28,
  },
  corner: { display: 'none' },
  cornerTop: { top: 8, borderTopWidth: 2 },
  cornerBottom: { bottom: 8, borderBottomWidth: 2 },
  cornerLeft: { left: 8, borderLeftWidth: 2 },
  cornerRight: { right: 8, borderRightWidth: 2 },
  cornerInner: {
    position: 'absolute',
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
    borderColor: '#D2B66F',
    borderWidth: 1,
  },
});
