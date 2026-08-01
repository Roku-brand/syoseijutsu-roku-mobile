import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, getTechniqueDisplayId } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const paperTexture = Platform.OS === 'web'
  ? ({
      backgroundImage: [
        'radial-gradient(circle at 12% 18%, rgba(151,112,51,0.035) 0 1px, transparent 1.5px)',
        'radial-gradient(circle at 78% 68%, rgba(99,75,39,0.025) 0 1px, transparent 1.5px)',
        'linear-gradient(98deg, rgba(173,135,68,0.025), transparent 28%, rgba(255,255,255,0.22) 62%, transparent)',
      ].join(','),
      backgroundSize: '23px 19px, 31px 27px, 100% 100%',
    } as never)
  : null;

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((persona) => ({
      category: category.key,
      name: persona.name,
    })),
  );
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{
    category: CategoryKey;
    name: string;
  }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 640;
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="人物像が見つかりません"
          description="前の画面へ戻って、人物像を選び直してください。"
        />
      </Screen>
    );
  }

  const theme = persona.articleTitle ?? 'その他';
  const countLabel = `${toJapaneseNumber(persona.items.length)}の処世術`;

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <DetailHeader title="人物像から探す" />

      <View style={[styles.scrollStage, compact && styles.scrollStageCompact]}>
        <View style={[styles.rod, styles.rodLeft]} aria-hidden>
          <View style={styles.rodCapTop} />
          <View style={styles.rodCapBottom} />
        </View>
        <View style={[styles.rod, styles.rodRight]} aria-hidden>
          <View style={styles.rodCapTop} />
          <View style={styles.rodCapBottom} />
        </View>

        <View style={[styles.scrollPaper, compact && styles.scrollPaperCompact, paperTexture]}>
          <View style={styles.foldTop} aria-hidden />
          <View style={styles.foldBottom} aria-hidden />

          <View style={[styles.goldFrameOuter, compact && styles.goldFrameOuterCompact]}>
            <View style={[styles.goldFrameInner, compact && styles.goldFrameInnerCompact]}>
              <View style={styles.manuscriptHeader}>
                <AppText style={styles.breadcrumb}>
                  {category.name}　/　{theme}
                </AppText>

                <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
                  <View style={styles.titleCopy}>
                    <AppText variant="title" style={[styles.title, compact && styles.titleCompact]}>
                      {persona.name}
                    </AppText>
                    <AppText style={styles.description}>
                      この人物像を構成する処世術を、一枚で見渡す
                    </AppText>
                  </View>
                  <AppText style={styles.manuscriptCount}>{countLabel}</AppText>
                </View>
              </View>

              <View style={styles.goldRule} />

              <View style={styles.sectionHeading}>
                <AppText style={styles.sectionDiamond}>◆</AppText>
                <AppText variant="serif" style={styles.sectionTitle}>構成する処世術</AppText>
              </View>

              <View style={styles.techniqueList}>
                {persona.items.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="link"
                    accessibilityLabel={`${item.title}を開く`}
                    onPress={() =>
                      router.push({ pathname: '/card/[id]', params: { id: item.id } })
                    }
                    style={({ pressed }) => [
                      styles.techniqueItem,
                      compact && styles.techniqueItemCompact,
                      index === persona.items.length - 1 && styles.techniqueItemLast,
                      pressed && styles.techniqueItemPressed,
                    ]}
                  >
                    <AppText style={styles.bullet}>◆</AppText>
                    <AppText style={[styles.techniqueTitle, compact && styles.techniqueTitleCompact]}>
                      {item.title}
                    </AppText>
                    <AppText style={styles.techniqueId}>{getTechniqueDisplayId(item.id)}</AppText>
                    <AppText style={styles.chevron}>›</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

function toJapaneseNumber(value: number) {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value < 10) return digits[value];
  if (value === 10) return '十';
  if (value < 20) return `十${digits[value - 10]}`;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${digits[tens]}十${ones ? digits[ones] : ''}`;
}

const styles = StyleSheet.create({
  screenContent: { maxWidth: 1220, paddingHorizontal: spacing.lg },
  scrollStage: {
    position: 'relative',
    marginHorizontal: 10,
    marginBottom: spacing.xxl,
    paddingHorizontal: 12,
    shadowColor: '#5D4524',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  scrollStageCompact: { marginHorizontal: 0, paddingHorizontal: 6 },
  rod: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    width: 12,
    zIndex: 3,
    borderWidth: 1,
    borderColor: '#A27C34',
    borderRadius: radius.pill,
    backgroundColor: '#C9A65A',
  },
  rodLeft: { left: 3 },
  rodRight: { right: 3 },
  rodCapTop: {
    position: 'absolute',
    top: -7,
    left: -3,
    width: 16,
    height: 8,
    borderWidth: 1,
    borderColor: '#9B7530',
    borderRadius: 4,
    backgroundColor: '#D1B06A',
  },
  rodCapBottom: {
    position: 'absolute',
    bottom: -7,
    left: -3,
    width: 16,
    height: 8,
    borderWidth: 1,
    borderColor: '#9B7530',
    borderRadius: 4,
    backgroundColor: '#D1B06A',
  },
  scrollPaper: {
    overflow: 'hidden',
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#D8C28E',
    backgroundColor: '#FBF6E9',
  },
  scrollPaperCompact: { paddingVertical: 7, paddingHorizontal: 8 },
  foldTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167,131,61,0.22)',
    backgroundColor: 'rgba(223,207,169,0.22)',
  },
  foldBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(167,131,61,0.22)',
    backgroundColor: 'rgba(223,207,169,0.22)',
  },
  goldFrameOuter: { borderWidth: 1.5, borderColor: '#B28A43', padding: 5 },
  goldFrameOuterCompact: { padding: 3 },
  goldFrameInner: {
    borderWidth: 1,
    borderColor: 'rgba(178,138,67,0.58)',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  goldFrameInnerCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  manuscriptHeader: { paddingHorizontal: 3 },
  breadcrumb: {
    color: '#8B6931',
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 19,
    letterSpacing: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  titleRowCompact: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  titleCopy: { flex: 1 },
  title: { color: '#171510', fontSize: 38, lineHeight: 52, letterSpacing: 1 },
  titleCompact: { fontSize: 29, lineHeight: 41 },
  description: {
    marginTop: spacing.xs,
    color: '#4F473A',
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
  },
  manuscriptCount: {
    paddingBottom: 4,
    color: '#7A5C2C',
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.7,
  },
  goldRule: { height: 1, marginTop: spacing.lg, backgroundColor: '#B58B43' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionDiamond: { color: '#B58B43', fontSize: 9, lineHeight: 14 },
  sectionTitle: { color: '#201C16', fontSize: 19, lineHeight: 28, fontWeight: '700' },
  techniqueList: { paddingTop: 2 },
  techniqueItem: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(86,75,58,0.17)',
    paddingHorizontal: 2,
  },
  techniqueItemCompact: { minHeight: 56, alignItems: 'flex-start', paddingVertical: 10 },
  techniqueItemLast: { borderBottomWidth: 0 },
  techniqueItemPressed: { backgroundColor: 'rgba(195,163,98,0.10)' },
  bullet: { color: '#B58B43', fontSize: 7, lineHeight: 14, marginTop: 1 },
  techniqueTitle: {
    flex: 1,
    color: '#26221B',
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 25,
  },
  techniqueTitleCompact: { fontSize: 15, lineHeight: 23 },
  techniqueId: {
    minWidth: 43,
    color: '#665034',
    fontFamily: fonts.serif,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  chevron: { color: '#A7833D', fontSize: 24, lineHeight: 28 },
});
