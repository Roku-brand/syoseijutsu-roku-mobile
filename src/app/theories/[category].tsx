import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';

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
      <Pill active>理論辞典</Pill>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <SectionHeader title="理論" count={items.length} />
      {items.map((theory) => (
        <Link
          key={theory.tagId}
          href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }}
          asChild
        >
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.tag}>
              <AppText variant="label" style={styles.tagText}>
                {theory.tagId}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="serif" style={styles.cardTitle}>
                {theory.title}
              </AppText>
              <AppText variant="caption" numberOfLines={2}>
                {theory.summary ??
                  `${theory.discipline}に属する${theory.conceptType}`}
              </AppText>
            </View>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.lg },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: 10,
  },
  pressed: { opacity: 0.65 },
  tag: {
    height: 34,
    minWidth: 54,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { color: colors.goldLight, fontSize: 10 },
  copy: { flex: 1 },
  cardTitle: { fontSize: 16, lineHeight: 23, marginBottom: 5 },
});
