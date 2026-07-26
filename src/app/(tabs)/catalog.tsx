import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BookScreen,
  BookTitle,
  IndexCard,
  OrnamentHeading,
} from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import {
  categories,
  categoryMeta,
  categoryOrder,
  theories,
} from '@/data/catalog';

const theoryCategories = [
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '動' },
  { id: 'organization-management', title: '組織・経営論', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典・思想', mark: '古' },
  { id: 'maxims-experience', title: '格言・経験則', mark: '格' },
];

const shortDescriptions = {
  interpersonal: '関係を築き、守る',
  work: '成果と合意をつくる',
  life: '人生を整え、進む',
} as const;

export default function CatalogScreen() {
  const router = useRouter();

  return (
    <BookScreen>
      <BookTitle title="体系" subtitle="知恵を、使える形で手元に置く。" />

      <OrnamentHeading>処世術</OrnamentHeading>
      {categoryOrder.map((key) => {
        const category = categories.find((item) => item.key === key);
        if (!category) return null;
        const count = category.subcategories.reduce(
          (sum, item) => sum + item.items.length,
          0,
        );
        return (
          <IndexCard
            key={key}
            mark={categoryMeta[key].mark}
            title={categoryMeta[key].label}
            subtitle={shortDescriptions[key]}
            count={count}
            tint={categoryPalette[key].tint}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              router.push({ pathname: '/category/[key]', params: { key } });
            }}
          />
        );
      })}

      <OrnamentHeading>理論辞典</OrnamentHeading>
      <AppText style={styles.theoryLead}>
        処世術を支える、{theories.length}の知識基盤。
      </AppText>
      <View style={styles.theoryGrid}>
        {theoryCategories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={`${category.title}を開く`}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              router.push({
                pathname: '/theories/[category]',
                params: { category: category.id },
              });
            }}
            style={({ pressed }) => [
              styles.theoryCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.theoryMark}>
              <AppText style={styles.theoryMarkText}>{category.mark}</AppText>
            </View>
            <AppText style={styles.theoryTitle}>{category.title}</AppText>
          </Pressable>
        ))}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  theoryLead: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: 1,
    color: colors.inkSoft,
  },
  theoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  theoryCard: {
    width: '31.5%',
    minHeight: 130,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  theoryMark: {
    width: 47,
    height: 47,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theoryMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
  },
  theoryTitle: {
    minHeight: 42,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
