import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { DetailSwipe } from '@/components/detail-swipe';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getTheoryDisplayId,
  techniqueCards,
  theories,
  theoryById,
} from '@/data/catalog';
import type { TechniqueCard, TheoryCard } from '@/data/types';

export function generateStaticParams() {
  return Array.from(theoryById.keys()).map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theory = theoryById.get(id);
  const [informationOpen, setInformationOpen] = useState(false);

  if (!theory) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
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
  const explanation =
    theory.summary ??
    theory.definition ??
    `${theory.discipline}に属する${theory.conceptType}です。`;
  const navigateTheory = (offset: -1 | 1) => {
    const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } });
  };

  return (
    <Screen style={styles.screen} contentContainerStyle={styles.screenContent}>
      <DetailSwipe
        style={styles.article}
        onPrevious={() => navigateTheory(-1)}
        onNext={() => navigateTheory(1)}
      >
        <View style={styles.hero}>
          <AppText style={styles.number}>{getTheoryDisplayId(theory)}</AppText>
          <View style={styles.titleRow}>
            <AppText
              variant="serif"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={styles.title}
            >
              {theory.title}
            </AppText>
            <View style={styles.categoryTag}>
              <AppText style={styles.categoryTagText}>
                {theory.sourceType || theory.categoryTitle}
              </AppText>
            </View>
          </View>
          <AppText style={styles.explanation}>{explanation}</AppText>
        </View>

        {!!theory.domains?.length && (
          <DetailSection title="関連領域">
            <View style={styles.chips}>
              {theory.domains.map((domain) => (
                <DomainChip key={domain} domain={domain} router={router} />
              ))}
            </View>
          </DetailSection>
        )}

        {related.length > 0 && (
          <DetailSection title="関連する処世術" count={related.length}>
            <View style={styles.relatedList}>
              {related.map((card) => (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title}を開く`}
                  onPress={() =>
                    router.push({ pathname: '/card/[id]', params: { id: card.id } })
                  }
                  style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}
                >
                  <AppText
                    variant="serif"
                    numberOfLines={2}
                    style={styles.relatedTitle}
                  >
                    {card.title}
                  </AppText>
                  <AppText style={styles.chevron}>›</AppText>
                </Pressable>
              ))}
            </View>
          </DetailSection>
        )}

        <View style={styles.informationSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={informationOpen ? '理論情報を閉じる' : '理論情報を開く'}
            accessibilityState={{ expanded: informationOpen }}
            onPress={() => setInformationOpen((open) => !open)}
            style={({ pressed }) => [styles.informationToggle, pressed && styles.pressed]}
          >
            <AppText variant="serif" style={styles.informationTitle}>理論情報</AppText>
            <AppText style={styles.informationSymbol}>{informationOpen ? '−' : '＋'}</AppText>
          </Pressable>
          {informationOpen ? <TheoryInformation theory={theory} /> : null}
        </View>
      </DetailSwipe>
    </Screen>
  );
}

function DetailSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <AppText variant="serif" style={styles.sectionTitle}>{title}</AppText>
        {typeof count === 'number' ? (
          <View style={styles.countBadge}>
            <AppText style={styles.countText}>{count}</AppText>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function DomainChip({
  domain,
  router,
}: {
  domain: string;
  router: ReturnType<typeof useRouter>;
}) {
  const target = getDomainTarget(domain);
  const content = (
    <View style={styles.chip}>
      <AppText style={styles.chipText}>{domain}</AppText>
    </View>
  );

  if (!target) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${domain}の処世術を開く`}
      onPress={() => {
        if (target.kind === 'category') {
          router.push({ pathname: '/category/[key]', params: { key: target.card.categoryKey } });
          return;
        }
        if (target.kind === 'subcategory') {
          router.push({
            pathname: '/subcategory/[category]/[name]',
            params: { category: target.card.categoryKey, name: target.card.subcategory },
          });
          return;
        }
        router.push({
          pathname: '/theme/[category]/[title]',
          params: { category: target.category, title: target.title },
        });
      }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

type DomainTarget =
  | { kind: 'category'; card: TechniqueCard }
  | { kind: 'subcategory'; card: TechniqueCard }
  | { kind: 'theme'; category: 'interpersonal' | 'work' | 'life'; title: string };

const domainThemeTargets: Record<string, Extract<DomainTarget, { kind: 'theme' }>> = {
  '不安の解消': { kind: 'theme', category: 'life', title: '内面の管理' },
  '交渉・合意の戦術': { kind: 'theme', category: 'work', title: '交渉・合意の戦術' },
  '交渉・合意術': { kind: 'theme', category: 'work', title: '交渉・合意の戦術' },
  '人生のつまずき': { kind: 'theme', category: 'life', title: '人生のつまずき' },
  '人生のつまずき・再設計': { kind: 'theme', category: 'life', title: '人生のつまずき' },
  '人生の指針': { kind: 'theme', category: 'life', title: '人生の指針' },
  '目標達成': { kind: 'theme', category: 'work', title: '目標達成' },
  '立ち回り': { kind: 'theme', category: 'interpersonal', title: '集団での立ち回り' },
  '自己防衛・境界線': { kind: 'theme', category: 'interpersonal', title: '関係の管理' },
  '評価の獲得': { kind: 'theme', category: 'work', title: '評価の獲得' },
  '関係の構築': { kind: 'theme', category: 'interpersonal', title: '関係の構築' },
  '関係の管理': { kind: 'theme', category: 'interpersonal', title: '関係の管理' },
  '集団での立ち回り': { kind: 'theme', category: 'interpersonal', title: '集団での立ち回り' },
};

function getDomainTarget(domain: string): DomainTarget | null {
  const categoryCard = techniqueCards.find((card) => card.categoryName === domain);
  if (categoryCard) return { kind: 'category', card: categoryCard };

  const themeTarget = domainThemeTargets[domain];
  if (themeTarget) return themeTarget;

  const compactDomain = domain.replace('の戦術', '術').replace('の処世術', '');
  const subcategoryCard = techniqueCards.find((card) =>
    card.subcategory === domain ||
    card.subcategory.replace('の戦術', '術').replace('の処世術', '') === compactDomain,
  );
  return subcategoryCard ? { kind: 'subcategory', card: subcategoryCard } : null;
}

function TheoryInformation({ theory }: { theory: TheoryCard }) {
  const rows = [
    ['分類', theory.sourceType],
    ['専門分野', theory.discipline],
    ['形式', theory.conceptType],
  ].filter(([, value]) => Boolean(value));

  return (
    <View style={styles.informationBody}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.informationRow}>
          <AppText style={styles.informationLabel}>{label}</AppText>
          <AppText style={styles.informationValue}>{value}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FBF8F2' },
  screenContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 132,
  },
  article: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  hero: { paddingTop: 2 },
  number: {
    color: '#8D887F',
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  titleRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: '#111311',
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  categoryTag: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CFC4B4',
    borderRadius: radius.pill,
    backgroundColor: '#F2EEE6',
  },
  categoryTagText: {
    color: '#504B43',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  explanation: {
    marginTop: 29,
    color: '#252925',
    fontSize: 17,
    lineHeight: 31,
    letterSpacing: 0.15,
  },
  section: { marginTop: 36 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#24251F', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAE3D7',
  },
  countText: { color: '#625846', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#D4CABC',
    borderRadius: radius.pill,
    backgroundColor: '#FDFBF7',
  },
  chipText: { color: '#4B4943', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  relatedList: { borderTopWidth: 1, borderTopColor: '#DFD7CA' },
  relatedRow: {
    minHeight: 62,
    paddingVertical: 13,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD7CA',
  },
  relatedTitle: { flex: 1, color: '#1D211E', fontSize: 18, lineHeight: 26, fontWeight: '600' },
  chevron: { color: colors.gold, fontSize: 26, lineHeight: 28 },
  informationSection: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#DFD7CA' },
  informationToggle: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  informationTitle: { color: '#24251F', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  informationSymbol: { color: '#5E594F', fontSize: 22, lineHeight: 28 },
  informationBody: { paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E5DED3' },
  informationRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DED3',
  },
  informationLabel: { width: 82, color: '#746E64', fontSize: 12, lineHeight: 19 },
  informationValue: { flex: 1, color: '#292B27', fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.56 },
});
