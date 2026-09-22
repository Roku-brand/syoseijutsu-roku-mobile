import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../../access/access-config';
import { useAccess } from '../../access/access-state';
import { BookScreen, bookCardShadow } from '../../components/book-ui';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { categoryMeta, techniqueById, techniqueCards, theories, theoryById } from '../../data/catalog';
import { learningCases, learningStages } from '../../data/learning';
import { getTheoryCategoryLabel, isLockedTheoryShell } from '../../data/theory-display';
import type { CategoryKey, TechniqueCard, TheoryCard } from '../../data/types';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { useAppState } from '../../state/app-state';
import { colors, fonts } from '../../constants/theme';
import { APP_ROUTES, techniqueRoute, theoryRoute } from '../../navigation/app-routes';

const interpersonalRecommendationImage = require('../../../assets/home/recommendation-interpersonal.webp');
const workRecommendationImage = require('../../../assets/home/recommendation-work.webp');
const lifeRecommendationImage = require('../../../assets/home/recommendation-life.webp');
const theoryRecommendationImage = require('../../../assets/home/recommendation-theory.webp');

type HomeContent =
  | { type: 'technique'; card: TechniqueCard }
  | { type: 'theory'; card: TheoryCard };

const recommendationImages: Record<CategoryKey | 'theory', ImageSourcePropType> = {
  interpersonal: interpersonalRecommendationImage,
  work: workRecommendationImage,
  life: lifeRecommendationImage,
  theory: theoryRecommendationImage,
};

function contentId(item: HomeContent) {
  return item.type === 'technique' ? item.card.id : item.card.tagId;
}

function localGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'おはようございます';
  if (hour >= 12 && hour < 18) return 'こんにちは';
  return 'こんばんは';
}

function readableContent(
  accessState: string,
  technique: TechniqueCard | undefined,
  theory: TheoryCard | undefined,
): HomeContent | null {
  if (technique && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(technique.id))) return { type: 'technique', card: technique };
  if (theory && !isLockedTheoryShell(theory) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(theory.tagId))) return { type: 'theory', card: theory };
  return null;
}

function buildRecommendations({ accessState, historyIds, interests, savedIds }: {
  accessState: string;
  historyIds: string[];
  interests: CategoryKey[];
  savedIds: string[];
}) {
  const categoryScore = new Map<CategoryKey, number>(interests.map((key, index) => [key, 12 - index]));
  [...historyIds.slice(0, 20), ...savedIds.slice(0, 20)].forEach((id, index) => {
    const card = techniqueById.get(id);
    if (card) categoryScore.set(card.categoryKey, (categoryScore.get(card.categoryKey) ?? 0) + Math.max(2, 10 - Math.floor(index / 3)));
  });
  const seen = new Set(historyIds.slice(0, 8));
  const techniqueCandidates = techniqueCards
    .filter((card) => accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))
    .sort((a, b) => {
      const scoreA = (categoryScore.get(a.categoryKey) ?? 0) - (seen.has(a.id) ? 30 : 0) + (savedIds.includes(a.id) ? 4 : 0);
      const scoreB = (categoryScore.get(b.categoryKey) ?? 0) - (seen.has(b.id) ? 30 : 0) + (savedIds.includes(b.id) ? 4 : 0);
      return scoreB - scoreA || a.id.localeCompare(b.id);
    });
  const relatedTheoryIds = [...savedIds, ...historyIds].flatMap((id) => techniqueById.get(id)?.theoryTagIds ?? []);
  const theoryRank = new Map(relatedTheoryIds.map((id, index) => [id, relatedTheoryIds.length - index]));
  const theoryCandidates = theories
    .filter((theory) => !isLockedTheoryShell(theory) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(theory.tagId)))
    .sort((a, b) => (theoryRank.get(b.tagId) ?? 0) - (theoryRank.get(a.tagId) ?? 0) || a.tagId.localeCompare(b.tagId));
  const items: HomeContent[] = [];
  const selected = new Set<string>();
  const categoryOrder: CategoryKey[] = ['interpersonal', 'work', 'life'];
  const addTechnique = (card: TechniqueCard | undefined) => {
    if (!card || selected.has(card.id) || items.length >= 7) return;
    selected.add(card.id);
    items.push({ type: 'technique', card });
  };
  const addTheory = (card: TheoryCard | undefined) => {
    if (!card || selected.has(card.tagId) || items.length >= 7) return;
    selected.add(card.tagId);
    items.push({ type: 'theory', card });
  };

  categoryOrder.forEach((category) => addTechnique(techniqueCandidates.find((card) => card.categoryKey === category)));
  addTheory(theoryCandidates[0]);
  categoryOrder.forEach((category) => addTechnique(techniqueCandidates.filter((card) => card.categoryKey === category)[1]));
  techniqueCandidates.forEach(addTechnique);
  theoryCandidates.forEach(addTheory);
  return items.slice(0, 7);
}

export default function HomeScreen() {
  const router = useRouter();
  const { desktop: isDesktop } = useResponsiveLayout();
  const { accessState, catalogRevision, isPaid } = useAccess();
  const { hydrated, historyIds, interests, savedIds, learningRecords, homeWelcomePending, dismissHomeWelcome } = useAppState();
  const [greeting, setGreeting] = useState('こんにちは');

  useEffect(() => setGreeting(localGreeting()), []);

  const recommendations = useMemo(
    () => buildRecommendations({ accessState, historyIds, interests, savedIds }),
    [accessState, catalogRevision, historyIds, interests, savedIds],
  );
  const recentContent = useMemo(
    () => historyIds.map((id) => readableContent(accessState, techniqueById.get(id), theoryById.get(id))).filter((item): item is HomeContent => Boolean(item)).slice(0, 3),
    [accessState, catalogRevision, historyIds],
  );
  const learning = useMemo(() => {
    const progress = learningStages.filter((stage) => isPaid || stage.number === 1).map((stage) => {
      const cases = learningCases.filter((item) => item.stage === stage.number);
      return { stage, cases, completed: cases.filter((item) => learningRecords[item.id]).length };
    });
    const active = progress.find((item) => item.completed > 0 && item.completed < item.cases.length) ?? progress.find((item) => item.completed < item.cases.length) ?? progress[0];
    if (!active) return null;
    return { ...active, nextCase: active.cases.find((item) => !learningRecords[item.id]) ?? active.cases[0] };
  }, [catalogRevision, isPaid, learningRecords]);

  const openContent = (item: HomeContent) => router.push(item.type === 'technique' ? techniqueRoute(item.card.id) : theoryRoute(item.card.tagId));
  const openLearning = () => learning?.nextCase
    ? router.push({ pathname: '/learn/[caseId]', params: { caseId: learning.nextCase.id, retry: '1' } })
    : router.push(APP_ROUTES.learn);

  return (
    <BookScreen contentContainerStyle={[styles.page, isDesktop && styles.pageDesktop]}>
      <View testID="home-intro-row" style={[styles.introRow, isDesktop && styles.introRowDesktop]}>
        <Text testID="home-greeting" style={[styles.greeting, isDesktop && styles.greetingDesktop]}>{greeting}</Text>
        <Text testID="home-intro-copy" style={[styles.copy, isDesktop && styles.copyDesktop]}>今日も、自分のペースで。ひとつ、うまく生きる知恵を。</Text>
      </View>

      <HomeHeroCarousel desktop={isDesktop} catalogRevision={catalogRevision} />

      <HomeSection title="あなたにおすすめ" action="すべて見る →" onAction={() => router.push(APP_ROUTES.discover)} testID="home-recommendations-section" compact>
        <ScrollView
          horizontal
          testID="home-recommendation-rail"
          accessibilityLabel="おすすめの処世術と理論"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendationRail}
        >
          {recommendations.map((item) => <RecommendationCard key={`${item.type}:${contentId(item)}`} item={item} desktop={isDesktop} onPress={() => openContent(item)} />)}
        </ScrollView>
      </HomeSection>

      <Pressable accessibilityRole="link" accessibilityLabel="処世術をつくる" testID="home-create-technique" onPress={() => router.push({ pathname: APP_ROUTES.myTechniques, params: { compose: '1' } })} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
        <View style={styles.createIcon}><Text style={styles.createIconText}>✎</Text></View>
        <View style={styles.createCopy}><Text style={styles.createTitle}>処世術をつくる</Text><Text style={styles.createBody}>自分なりの気づきを、ひとこと残す。</Text></View>
        <View style={styles.createCta}><Text style={styles.createCtaText}>＋ 作る</Text></View>
      </Pressable>

      <HomeSection title="続きから学ぶ" testID="home-continue-section">
        {learning ? <Pressable accessibilityRole="link" accessibilityLabel={`${learning.stage.title}の続きを学ぶ`} onPress={openLearning} style={({ pressed }) => [styles.learningCard, pressed && styles.pressed]}>
          <View style={styles.learningMark}><Text style={styles.learningMarkText}>{learning.stage.number}</Text></View>
          <View style={styles.learningCopy}><Text style={styles.learningStage}>Stage {learning.stage.number}</Text><Text numberOfLines={1} style={styles.learningTitle}>{learning.stage.title}</Text><View style={styles.progressRow}>{learning.cases.map((item, index) => <View key={item.id} style={[styles.progressDot, index < learning.completed && styles.progressDotActive]} />)}</View></View>
          <Text style={styles.progressCount}>{learning.completed} / {learning.cases.length}</Text>
          <View style={styles.learningCta}><Text style={styles.learningCtaText}>続きを学ぶ →</Text></View>
        </Pressable> : null}
      </HomeSection>

      <HomeSection title="最近見られているもの" action={recentContent.length ? 'すべて見る →' : undefined} onAction={() => router.push(APP_ROUTES.history)} testID="home-recent-section">
        {recentContent.length ? <View style={styles.recentList}>{recentContent.map((item) => <RecentRow key={`${item.type}:${contentId(item)}`} item={item} onPress={() => openContent(item)} />)}</View> : <View style={styles.emptyRecent}><Text style={styles.emptyRecentText}>読んだ処世術や理論が、ここに並びます。</Text></View>}
      </HomeSection>

      <Modal transparent visible={hydrated && homeWelcomePending} animationType="fade" onRequestClose={dismissHomeWelcome}>
        <View style={styles.modalBackdrop} testID="home-welcome-modal"><View style={styles.modalCard}>
          <Text style={styles.modalEyebrow}>処世術禄へようこそ</Text><Text style={styles.modalTitle}>判断に迷う日に、静かな手がかりを。</Text><Text style={styles.modalBody}>まずは今日の一枚から。気になった知恵は、蔵書へ残せます。</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="今日の一枚を見る" onPress={dismissHomeWelcome} style={styles.modalPrimary}><Text style={styles.modalPrimaryText}>今日の一枚を見る</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="あとで見る" onPress={dismissHomeWelcome} style={styles.modalSecondary}><Text style={styles.modalSecondaryText}>あとで見る</Text></Pressable>
        </View></View>
      </Modal>
    </BookScreen>
  );
}

function HomeSection({ title, action, onAction, testID, compact = false, children }: { title: string; action?: string; onAction?: () => void; testID: string; compact?: boolean; children: React.ReactNode }) {
  return <View testID={testID} style={[styles.section, compact && styles.sectionCompact]}><View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>{title}</Text>{action && onAction ? <Pressable accessibilityRole="link" accessibilityLabel={action.replace(' →', '')} onPress={onAction} style={({ pressed }) => [styles.sectionLinkButton, pressed && styles.pressed]}><Text style={styles.sectionLink}>{action}</Text></Pressable> : null}</View>{children}</View>;
}

function RecommendationCard({ item, desktop, onPress }: { item: HomeContent; desktop: boolean; onPress: () => void }) {
  const technique = item.type === 'technique' ? item.card : null;
  const label = technique ? categoryMeta[technique.categoryKey].label : getTheoryCategoryLabel(item.card as TheoryCard);
  const image = technique ? recommendationImages[technique.categoryKey] : recommendationImages.theory;
  return <Pressable accessibilityRole="link" accessibilityLabel={`${item.card.title}を開く`} testID="home-recommendation-card" onPress={onPress} style={({ pressed }) => [styles.recommendationCard, desktop && styles.recommendationCardDesktop, pressed && styles.pressed]}><Image source={image} resizeMode="cover" style={[styles.recommendationImage, desktop && styles.recommendationImageDesktop]} /><View style={[styles.recommendationBody, desktop && styles.recommendationBodyDesktop]}><Text numberOfLines={1} style={[styles.recommendationCategory, item.type === 'theory' && styles.recommendationCategoryTheory]}>{item.type === 'theory' ? '理論・' : ''}{label}</Text><View style={styles.recommendationTitleRow}><Text numberOfLines={2} style={[styles.recommendationTitle, desktop && styles.recommendationTitleDesktop]}>{item.card.title}</Text><Text style={styles.cardArrow}>›</Text></View></View></Pressable>;
}

function RecentRow({ item, onPress }: { item: HomeContent; onPress: () => void }) {
  const technique = item.type === 'technique' ? item.card : null;
  const label = technique ? categoryMeta[technique.categoryKey].label : '理論';
  const image = technique ? recommendationImages[technique.categoryKey] : recommendationImages.theory;
  return <Pressable accessibilityRole="link" accessibilityLabel={`${item.card.title}を開く`} testID="home-recent-row" onPress={onPress} style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}><Image source={image} resizeMode="cover" style={styles.recentImage} /><View style={styles.recentCopy}><Text numberOfLines={1} style={[styles.recentKind, item.type === 'theory' && styles.recentKindTheory]}>{label}</Text><Text numberOfLines={1} style={styles.recentTitle}>{item.card.title}</Text></View><Text style={styles.recentArrow}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 10, paddingBottom: 38 }, pageDesktop: { paddingTop: 22, paddingBottom: 52 },
  introRow: { marginBottom: 8 }, introRowDesktop: { alignItems: 'baseline', flexDirection: 'row', gap: 18, marginBottom: 14 },
  greeting: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, fontWeight: '600', letterSpacing: 2, lineHeight: 38 }, greetingDesktop: { fontSize: 35, lineHeight: 48 },
  copy: { color: '#7C8798', fontFamily: fonts.serif, fontSize: 11, letterSpacing: 0.35, lineHeight: 18 }, copyDesktop: { fontSize: 14, letterSpacing: 1, lineHeight: 24 },
  section: { marginTop: 22 }, sectionCompact: { marginTop: 8 },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, fontWeight: '600', letterSpacing: 1.25, lineHeight: 29 },
  sectionLinkButton: { minHeight: 30, paddingLeft: 10, alignItems: 'center', justifyContent: 'center' }, sectionLink: { color: '#B87408', fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', letterSpacing: 0.25 },
  recommendationRail: { gap: 8, paddingRight: 16 },
  recommendationCard: { width: 112, flexGrow: 0, flexShrink: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, ...bookCardShadow },
  recommendationCardDesktop: { width: 190 },
  recommendationImage: { width: '100%', height: 50, backgroundColor: '#E9E9E6' }, recommendationImageDesktop: { height: 72 }, recommendationBody: { minHeight: 69, paddingHorizontal: 9, paddingBottom: 8, paddingTop: 6 }, recommendationBodyDesktop: { minHeight: 78, paddingHorizontal: 11, paddingTop: 8 },
  recommendationCategory: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden', borderWidth: 1, borderColor: '#D59A36', borderRadius: 999, color: '#A86F0E', fontFamily: fonts.serif, fontSize: 8, lineHeight: 12 },
  recommendationCategoryTheory: { borderColor: '#687485', color: '#344258' },
  recommendationTitleRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', marginTop: 4 }, recommendationTitle: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', lineHeight: 17 }, recommendationTitleDesktop: { fontSize: 14, lineHeight: 20 },
  cardArrow: { color: '#C17E08', flexShrink: 0, fontFamily: fonts.serif, fontSize: 24, lineHeight: 25, marginLeft: 4 },
  createCard: { minHeight: 78, marginTop: 14, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, ...bookCardShadow },
  createIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7DDCE', borderRadius: 24, backgroundColor: '#FAF7F1' }, createIconText: { color: '#17202A', fontSize: 24, lineHeight: 28 },
  createCopy: { flex: 1, minWidth: 0 }, createTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', letterSpacing: 0.6, lineHeight: 25 }, createBody: { color: '#8792A3', fontFamily: fonts.serif, fontSize: 10, lineHeight: 16 },
  createCta: { minWidth: 82, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C6810C', borderRadius: 999, backgroundColor: '#FFFFFF' }, createCtaText: { color: '#B87408', fontFamily: fonts.serif, fontSize: 13, fontWeight: '600' },
  learningCard: { minHeight: 96, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, ...bookCardShadow },
  learningMark: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1D211F' }, learningMarkText: { color: '#E2B95F', fontFamily: fonts.serif, fontSize: 23, fontWeight: '600' },
  learningCopy: { flex: 1, minWidth: 0 }, learningStage: { color: '#B47A14', fontFamily: fonts.serif, fontSize: 10, lineHeight: 14 }, learningTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  progressRow: { flexDirection: 'row', gap: 4, marginTop: 7 }, progressDot: { flex: 1, maxWidth: 18, height: 6, borderRadius: 5, backgroundColor: '#DFDFDC' }, progressDotActive: { backgroundColor: '#BE8A26' }, progressCount: { color: colors.ink, flexShrink: 0, fontFamily: fonts.serif, fontSize: 11 },
  learningCta: { minHeight: 36, flexShrink: 0, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CA8A17', borderRadius: 999 }, learningCtaText: { color: '#AF730D', fontFamily: fonts.serif, fontSize: 10, fontWeight: '600' },
  recentList: { gap: 7 }, recentRow: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden', paddingRight: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface }, recentImage: { width: 96, height: 64, flexShrink: 0, backgroundColor: '#E9E9E6' },
  recentCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, recentKind: { flexShrink: 0, maxWidth: 78, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#D59A36', borderRadius: 999, color: '#A86F0E', fontFamily: fonts.serif, fontSize: 9 }, recentKindTheory: { borderColor: '#687485', color: '#344258' }, recentTitle: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, fontWeight: '600' }, recentArrow: { color: '#C17E08', flexShrink: 0, fontFamily: fonts.serif, fontSize: 25, lineHeight: 28 },
  emptyRecent: { minHeight: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface }, emptyRecentText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 11 },
  pressed: { opacity: 0.68 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(13, 11, 8, 0.55)', flex: 1, justifyContent: 'center', padding: 22 }, modalCard: { backgroundColor: colors.surface, borderColor: colors.gold, borderRadius: 16, borderWidth: 1, maxWidth: 430, padding: 28, width: '100%', ...bookCardShadow },
  modalEyebrow: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, letterSpacing: 1.2 }, modalTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 24, letterSpacing: 1, lineHeight: 37, marginTop: 14 }, modalBody: { color: colors.muted, fontFamily: fonts.serif, fontSize: 14, lineHeight: 25, marginTop: 15 },
  modalPrimary: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 999, marginTop: 24, paddingVertical: 13 }, modalPrimaryText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13 }, modalSecondary: { alignItems: 'center', marginTop: 8, paddingVertical: 11 }, modalSecondaryText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12 },
});
