import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../../access/access-config';
import { useAccess } from '../../access/access-state';
import { BookScreen, bookCardShadow } from '../../components/book-ui';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { categoryMeta, techniqueById, techniqueCards, theories } from '../../data/catalog';
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
  const { desktop: isDesktop, width: viewportWidth } = useResponsiveLayout();
  const { accessState, catalogRevision, isPaid } = useAccess();
  const { hydrated, historyIds, interests, savedIds, learningRecords, homeWelcomePending, dismissHomeWelcome } = useAppState();
  const [greeting, setGreeting] = useState('こんにちは');

  useEffect(() => setGreeting(localGreeting()), []);

  const recommendations = useMemo(
    () => buildRecommendations({ accessState, historyIds, interests, savedIds }),
    [accessState, catalogRevision, historyIds, interests, savedIds],
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

      <HomeSection title="続きから学ぶ" action="すべて見る →" onAction={() => router.push(APP_ROUTES.learn)} testID="home-continue-section" compact>
        {learning ? <Pressable accessibilityRole="link" accessibilityLabel={`${learning.stage.title}の続きを学ぶ`} onPress={openLearning} style={({ pressed }) => [styles.learningCard, pressed && styles.pressed]}>
          <View style={styles.learningMark}><Text style={styles.learningMarkText}>{learning.stage.number}</Text></View>
          <View style={styles.learningCopy}>
            <Text style={styles.learningStage}>Stage {learning.stage.number}</Text>
            <Text numberOfLines={2} style={styles.learningTitle}>{learning.stage.title}</Text>
            <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, learning.completed / Math.max(1, learning.cases.length) * 100)}%` }]} /></View><Text style={styles.progressCount}>{learning.completed} / {learning.cases.length}</Text></View>
          </View>
          <View style={styles.learningCta}><Text style={styles.learningCtaText}>続きから →</Text></View>
        </Pressable> : null}
      </HomeSection>

      <HomeSection title="あなたにおすすめ" action="すべて見る →" onAction={() => router.push(APP_ROUTES.discover)} testID="home-recommendations-section">
        <ScrollView
          horizontal
          testID="home-recommendation-rail"
          accessibilityLabel="おすすめの処世術と理論"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recommendationRail}
        >
          {recommendations.map((item) => <RecommendationCard key={`${item.type}:${contentId(item)}`} item={item} desktop={isDesktop} viewportWidth={viewportWidth} onPress={() => openContent(item)} />)}
        </ScrollView>
      </HomeSection>

      <Pressable accessibilityRole="link" accessibilityLabel="自分の処世術を残す" testID="home-create-technique" onPress={() => router.push({ pathname: APP_ROUTES.myTechniques, params: { compose: '1' } })} style={({ pressed }) => [styles.createCard, pressed && styles.pressed]}>
        <View style={styles.createIcon}><Text style={styles.createIconText}>✎</Text></View>
        <View style={styles.createCopy}><Text style={styles.createTitle}>自分の処世術を残す</Text><Text style={styles.createBody}>自分なりの気づきを、ひとこと残す。</Text></View>
        <View style={styles.createCta}><Text style={styles.createCtaText}>＋ 作る</Text></View>
      </Pressable>

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

function RecommendationCard({ item, desktop, viewportWidth, onPress }: { item: HomeContent; desktop: boolean; viewportWidth: number; onPress: () => void }) {
  const technique = item.type === 'technique' ? item.card : null;
  const label = technique ? categoryMeta[technique.categoryKey].label : getTheoryCategoryLabel(item.card as TheoryCard);
  const image = technique ? recommendationImages[technique.categoryKey] : recommendationImages.theory;
  const cardWidth = desktop ? 250 : Math.min(300, Math.max(220, viewportWidth * 0.68));
  return <Pressable accessibilityRole="link" accessibilityLabel={`${item.card.title}を開く`} testID="home-recommendation-card" onPress={onPress} style={({ pressed }) => [styles.recommendationCard, { width: cardWidth }, pressed && styles.pressed]}><Image source={image} resizeMode="cover" style={styles.recommendationImage} /><View style={styles.recommendationBody}><Text numberOfLines={1} style={[styles.recommendationCategory, item.type === 'theory' && styles.recommendationCategoryTheory]}>{item.type === 'theory' ? '理論・' : ''}{label}</Text><View style={styles.recommendationTitleRow}><Text numberOfLines={2} style={styles.recommendationTitle}>{item.card.title}</Text><Text style={styles.cardArrow}>›</Text></View></View></Pressable>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 6, paddingBottom: 28 }, pageDesktop: { paddingTop: 18, paddingBottom: 42 },
  introRow: { marginBottom: 7 }, introRowDesktop: { alignItems: 'baseline', flexDirection: 'row', gap: 18, marginBottom: 12 },
  greeting: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, fontWeight: '600', letterSpacing: 1.5, lineHeight: 36 }, greetingDesktop: { fontSize: 35, lineHeight: 46 },
  copy: { color: '#77808B', fontFamily: fonts.serif, fontSize: 12, letterSpacing: 0.1, lineHeight: 18 }, copyDesktop: { fontSize: 14, letterSpacing: 0.6, lineHeight: 23 },
  section: { marginTop: 19 }, sectionCompact: { marginTop: 7 },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, fontWeight: '600', letterSpacing: 0.8, lineHeight: 30 },
  sectionLinkButton: { minHeight: 30, paddingLeft: 10, alignItems: 'center', justifyContent: 'center' }, sectionLink: { color: '#A96F10', fontFamily: fonts.serif, fontSize: 12, fontWeight: '600', letterSpacing: 0.1 },
  recommendationRail: { gap: 12, paddingRight: 16 },
  recommendationCard: { flexGrow: 0, flexShrink: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface, ...bookCardShadow },
  recommendationImage: { width: '100%', height: 105, backgroundColor: '#E9E9E6' }, recommendationBody: { minHeight: 94, paddingHorizontal: 13, paddingBottom: 11, paddingTop: 9 },
  recommendationCategory: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#D59A36', borderRadius: 999, color: '#A86F0E', fontFamily: fonts.serif, fontSize: 11, lineHeight: 15 },
  recommendationCategoryTheory: { borderColor: '#687485', color: '#344258' },
  recommendationTitleRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', marginTop: 6 }, recommendationTitle: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  cardArrow: { color: '#C17E08', flexShrink: 0, fontFamily: fonts.serif, fontSize: 24, lineHeight: 25, marginLeft: 4 },
  createCard: { minHeight: 70, marginTop: 20, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  createIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E7DDCE', borderRadius: 21, backgroundColor: '#FAF7F1' }, createIconText: { color: '#17202A', fontSize: 21, lineHeight: 25 },
  createCopy: { flex: 1, minWidth: 0 }, createTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, fontWeight: '600', letterSpacing: 0.2, lineHeight: 22 }, createBody: { color: '#7D8794', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  createCta: { minWidth: 74, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C6810C', borderRadius: 999, backgroundColor: '#FFFFFF' }, createCtaText: { color: '#A96F10', fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  learningCard: { minHeight: 88, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, ...bookCardShadow },
  learningMark: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1D211F' }, learningMarkText: { color: '#E2B95F', fontFamily: fonts.serif, fontSize: 24, fontWeight: '600' },
  learningCopy: { flex: 1, minWidth: 0 }, learningStage: { color: '#A77217', fontFamily: fonts.serif, fontSize: 11, lineHeight: 16 }, learningTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 }, progressTrack: { flex: 1, height: 6, borderRadius: 5, backgroundColor: '#E8E4DC', overflow: 'hidden' }, progressFill: { height: 6, borderRadius: 5, backgroundColor: '#C49A51' }, progressCount: { color: '#737B87', flexShrink: 0, fontFamily: fonts.serif, fontSize: 11 },
  learningCta: { minHeight: 37, flexShrink: 0, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CA8A17', borderRadius: 999 }, learningCtaText: { color: '#A96F10', fontFamily: fonts.serif, fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.68 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(13, 11, 8, 0.55)', flex: 1, justifyContent: 'center', padding: 22 }, modalCard: { backgroundColor: colors.surface, borderColor: colors.gold, borderRadius: 16, borderWidth: 1, maxWidth: 430, padding: 28, width: '100%', ...bookCardShadow },
  modalEyebrow: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, letterSpacing: 1.2 }, modalTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 24, letterSpacing: 1, lineHeight: 37, marginTop: 14 }, modalBody: { color: colors.muted, fontFamily: fonts.serif, fontSize: 14, lineHeight: 25, marginTop: 15 },
  modalPrimary: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: 999, marginTop: 24, paddingVertical: 13 }, modalPrimaryText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13 }, modalSecondary: { alignItems: 'center', marginTop: 8, paddingVertical: 11 }, modalSecondaryText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12 },
});
