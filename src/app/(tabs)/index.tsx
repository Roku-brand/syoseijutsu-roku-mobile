import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BookScreen, SaveDiamondButton, bookCardShadow } from '../../components/book-ui';
import { useAccess } from '../../access/access-state';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import {
  techniqueCards,
  theories,
  categoryMeta,
} from '../../data/catalog';
import type { TechniqueCard, TheoryCard } from '../../data/types';
import { getTheoryCategoryLabel, getTheoryCoverSummary, isLockedTheoryShell } from '../../data/theory-display';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../../access/access-config';
import { loadTrendingContent, TrendingContent } from '../../lib/content-events';
import { selectHomeTechniques, selectHomeTheories } from '../../lib/home-recommendations';
import { useAppState } from '../../state/app-state';
import { colors, fonts } from '../../constants/theme';

type HomeMode = 'techniques' | 'theories';
type HomeContent =
  | { type: 'technique'; card: TechniqueCard }
  | { type: 'theory'; card: TheoryCard };

const HERO_IMAGE = require('../../../assets/home/machiya-night-hero.png');
const palette = colors;
const typography = fonts;

function contentCardId(card: TechniqueCard | TheoryCard) {
  return 'tagId' in card ? card.tagId : card.id;
}

function localGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'おはようございます';
  if (hour >= 12 && hour < 18) return 'こんにちは';
  return 'こんばんは';
}

function dateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const { desktop: isDesktop, width } = useResponsiveLayout();
  const { accessState, isPaid, catalogRevision } = useAccess();
  const {
    hydrated,
    savedIds,
    savedTheoryIds,
    toggleSaved,
    toggleSavedTheory,
    contentActivity,
    homeImpressions,
    recordHomeImpressions,
    homeWelcomePending,
    dismissHomeWelcome,
  } = useAppState();
  const [mode, setMode] = useState<HomeMode>('techniques');
  const [activeIndex, setActiveIndex] = useState(0);
  const [greeting, setGreeting] = useState('こんにちは');
  const [trending, setTrending] = useState<TrendingContent[] | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [curatedTechniques, setCuratedTechniques] = useState<TechniqueCard[]>([]);
  const [curatedTheories, setCuratedTheories] = useState<TheoryCard[]>([]);
  const curatedRailRef = useRef<ScrollView>(null);
  const [curatedRailWidth, setCuratedRailWidth] = useState(0);
  const recommendationKeyRef = useRef('');
  const impressionKeyRef = useRef('');

  useEffect(() => setGreeting(localGreeting()), []);

  useEffect(() => {
    let active = true;
    loadTrendingContent(12)
      .then((items) => {
        if (active) setTrending(items);
      })
      .finally(() => {
        if (active) setTrendingLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || accessState === 'checking') return;
    const key = `${dateKey()}:${isPaid ? 'paid' : 'free'}:${catalogRevision}:${
      trending?.map((item) => `${item.contentType}:${item.contentId}`).join(',') ?? 'none'
    }`;
    if (recommendationKeyRef.current === key) return;
    recommendationKeyRef.current = key;
    setCuratedTechniques(
      selectHomeTechniques({
        isPaid,
        activity: contentActivity,
        impressions: homeImpressions,
        trending: trending ?? [],
        limit: 4,
      }),
    );
    setCuratedTheories(
      selectHomeTheories({
        isPaid,
        activity: contentActivity,
        impressions: homeImpressions,
        trending: trending ?? [],
        limit: 4,
      }),
    );
  }, [accessState, catalogRevision, contentActivity, homeImpressions, hydrated, isPaid, trending, trendingLoading]);

  const curated = mode === 'techniques' ? curatedTechniques : curatedTheories;

  useEffect(() => {
    setActiveIndex(0);
    curatedRailRef.current?.scrollTo({ x: 0, animated: false });
  }, [mode]);

  useEffect(() => {
    if (!curated.length) return;
    const key = `${dateKey()}:${mode}`;
    if (impressionKeyRef.current.includes(key)) return;
    impressionKeyRef.current = `${impressionKeyRef.current}|${key}`;
    recordHomeImpressions(
      curated.map((card) => mode === 'techniques' ? (card as TechniqueCard).id : (card as TheoryCard).tagId),
    );
  }, [curated, mode, recordHomeImpressions]);

  const trendingContent = useMemo<HomeContent[]>(() => {
    if (!trending) return [];
    const techniques = new Map(techniqueCards.map((card) => [card.id, card]));
    const theoryLookup = new Map(theories.map((card) => [card.tagId, card]));
    const result: HomeContent[] = [];
    trending.forEach((item) => {
      if (item.contentType === 'technique') {
        const card = techniques.get(item.contentId);
        if (card && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))) {
          result.push({ type: 'technique', card });
        }
      } else {
        const card = theoryLookup.get(item.contentId);
        if (card && !isLockedTheoryShell(card) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(card.tagId))) {
          result.push({ type: 'theory', card });
        }
      }
    });
    return result.slice(0, 4);
  }, [accessState, catalogRevision, trending]);

  const isTheory = mode === 'theories';
  const railCardWidth = isDesktop ? Math.max(214, Math.min(276, (width - 230) / 4)) : 276;
  const moveCuratedRail = (index: number) => {
    if (!curated.length) return;
    const nextIndex = (index + curated.length) % curated.length;
    setActiveIndex(nextIndex);
    curatedRailRef.current?.scrollTo({ x: nextIndex * curatedRailWidth, animated: true });
  };
  const goPrevious = () => moveCuratedRail(activeIndex - 1);
  const goNext = () => moveCuratedRail(activeIndex + 1);

  return (
    <BookScreen>
      <View style={[styles.introRow, !isDesktop && styles.introRowMobile]}>
        <View>
          <Text style={[styles.greeting, !isDesktop && styles.greetingMobile]}>{greeting}</Text>
          <Text style={styles.copy}>今日も、少しだけ判断を磨く。</Text>
        </View>
        <View style={[styles.modeTabs, !isDesktop && styles.modeTabsMobile]}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'techniques' }} onPress={() => setMode('techniques')} style={[styles.modeTab, mode === 'techniques' && styles.modeTabActive]}>
            <Text style={[styles.modeTabText, mode === 'techniques' && styles.modeTabTextActive]}>処世術</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'theories' }} onPress={() => setMode('theories')} style={[styles.modeTab, mode === 'theories' && styles.modeTabTheoryActive]}>
            <Text style={[styles.modeTabText, mode === 'theories' && styles.modeTabTheoryTextActive]}>理論</Text>
          </Pressable>
        </View>
      </View>

      {!isPaid && accessState !== 'checking' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="完全版を購入する"
          testID="home-upgrade-cta"
          onPress={() => router.push({ pathname: '/upgrade', params: { source: 'home' } })}
          style={styles.upgradeCta}
        >
          <View style={styles.upgradeCtaCopy}>
            <Text style={styles.upgradeCtaLabel}>完全版</Text>
            <Text style={styles.upgradeCtaText}>全336処世術・630理論を、いつでも手元に。</Text>
          </View>
          <Text style={styles.upgradeCtaAction}>購入する　›</Text>
        </Pressable>
      ) : null}

      {curated.length ? (
        <>
          <View testID="home-curated-reel" style={styles.curatedReelFrame}>
            {isDesktop ? <Pressable accessibilityRole="button" accessibilityLabel="前の厳選" onPress={goPrevious} style={[styles.reelSideArrow, styles.reelSideArrowPrevious]}><Text style={styles.arrowText}>‹</Text></Pressable> : null}
            <ScrollView
              ref={curatedRailRef}
              horizontal
              pagingEnabled
              testID="home-curated-viewport"
              accessibilityLabel="厳選した知恵の横スクロール一覧"
              showsHorizontalScrollIndicator={false}
              onLayout={(event) => setCuratedRailWidth(event.nativeEvent.layout.width)}
              onMomentumScrollEnd={(event) => {
                if (curatedRailWidth) setActiveIndex(Math.max(0, Math.min(curated.length - 1, Math.round(event.nativeEvent.contentOffset.x / curatedRailWidth))));
              }}
              style={styles.curatedViewport}
            >
              {curatedRailWidth ? curated.map((card, index) => {
                const cardIsTheory = mode === 'theories';
                const cardId = contentCardId(card);
                return (
                  <Pressable key={cardId} testID={`home-curated-slide-${index + 1}`} accessibilityRole="link" onPress={() => router.push(cardIsTheory ? `/theory/${cardId}` : `/card/${cardId}`)} style={[styles.hero, cardIsTheory && styles.heroTheory, !isDesktop && styles.heroMobile, { width: curatedRailWidth }]}>
                    {index === 0 ? <><Image source={HERO_IMAGE} resizeMode="cover" accessibilityLabel="雨上がりの静かな町家" style={styles.heroImage} /><View style={styles.heroImageShade} /></> : null}
                    <View style={[styles.heroCopy, isDesktop && index === 0 && styles.heroCopyDesktop]}>
                      <Text style={styles.heroKicker}>{index === 0 ? '✦  今日の一枚' : `今日の厳選  ${index + 1} / ${curated.length}`}{'  |  '}{cardIsTheory ? getTheoryCategoryLabel(card as TheoryCard) : categoryMeta[(card as TechniqueCard).categoryKey].label}</Text>
                      <Text numberOfLines={isDesktop ? 2 : 3} style={[styles.heroTitle, !isDesktop && styles.heroTitleMobile]}>{card.title}</Text>
                      <Text numberOfLines={isDesktop ? 3 : 4} style={styles.heroBody}>{cardIsTheory ? getTheoryCoverSummary((card as TheoryCard).summary) : (card as TechniqueCard).essence}</Text>
                      <View style={styles.heroFooter}>
                        <View style={styles.heroButton}><Text style={styles.heroButtonText}>{cardIsTheory ? '詳しく見る' : '読む'}　→</Text></View>
                        <SaveDiamondButton compact saved={cardIsTheory ? savedTheoryIds.includes(cardId) : savedIds.includes(cardId)} onPress={() => cardIsTheory ? toggleSavedTheory(cardId) : toggleSaved(cardId)} />
                      </View>
                    </View>
                  </Pressable>
                );
              }) : null}
            </ScrollView>
            {isDesktop ? <Pressable accessibilityRole="button" accessibilityLabel="次の厳選" onPress={goNext} style={[styles.reelSideArrow, styles.reelSideArrowNext]}><Text style={styles.arrowText}>›</Text></Pressable> : null}
          </View>
          <View style={styles.reelControls}>
            <View style={styles.dots}>
              {curated.map((card, index) => (
                <Pressable key={contentCardId(card)} accessibilityLabel={`厳選 ${index + 1}`} onPress={() => moveCuratedRail(index)} style={[styles.dot, index === activeIndex && styles.dotActive]} />
              ))}
            </View>
          </View>
        </>
      ) : (
        <View style={[styles.hero, styles.heroSkeleton]} testID="home-curated-loading">
          <View style={styles.skeletonLineShort} /><View style={styles.skeletonTitle} /><View style={styles.skeletonLine} /><View style={styles.skeletonLine} />
        </View>
      )}

      {trendingContent.length > 0 ? (
        <View style={styles.trendingSection}>
          <View style={styles.sectionHeadingRow}>
            <View><Text style={styles.sectionTitle}>いま読まれているもの</Text><Text style={styles.sectionCaption}>直近14日の閲覧と保存から</Text></View>
            <Pressable onPress={() => router.push('/discover')}><Text style={styles.sectionLink}>探すへ　›</Text></Pressable>
          </View>
          <ScrollView horizontal testID="home-trending-rail" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRail}>
            {trendingContent.map((item) => {
              const theory = item.type === 'theory';
              const itemId = contentCardId(item.card);
              const summary = theory ? getTheoryCoverSummary((item.card as TheoryCard).summary) : (item.card as TechniqueCard).essence;
              const group = theory ? getTheoryCategoryLabel(item.card as TheoryCard) : `${categoryMeta[(item.card as TechniqueCard).categoryKey].label}・${(item.card as TechniqueCard).subcategory}`;
              const saved = theory ? savedTheoryIds.includes(itemId) : savedIds.includes(itemId);
              return (
                <Pressable key={`${item.type}:${itemId}`} onPress={() => router.push(theory ? `/theory/${itemId}` : `/card/${itemId}`)} style={[styles.trendingCard, { width: railCardWidth }]}>
                  <View style={styles.trendingTopRow}><Text style={styles.trendingKind}>{theory ? '理論' : '処世術'}</Text><SaveDiamondButton compact saved={saved} onPress={() => theory ? toggleSavedTheory(itemId) : toggleSaved(itemId)} /></View>
                  <Text numberOfLines={2} style={styles.trendingTitle}>{item.card.title}</Text>
                  <Text numberOfLines={3} style={styles.trendingSummary}>{summary}</Text>
                  <View style={styles.trendingFooter}><Text numberOfLines={1} style={styles.trendingGroup}>{group}</Text><Text style={styles.trendingArrow}>›</Text></View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Modal transparent visible={hydrated && homeWelcomePending} animationType="fade" onRequestClose={dismissHomeWelcome}>
        <View style={styles.modalBackdrop} testID="home-welcome-modal">
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>処世術禄へようこそ</Text>
            <Text style={styles.modalTitle}>判断に迷う日に、静かな手がかりを。</Text>
            <Text style={styles.modalBody}>まずは今日の一枚から。気になった知恵は、蔵書へ残せます。</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="今日の一枚を見る" onPress={dismissHomeWelcome} style={styles.modalPrimary}><Text style={styles.modalPrimaryText}>今日の一枚を見る</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="あとで見る" onPress={dismissHomeWelcome} style={styles.modalSecondary}><Text style={styles.modalSecondaryText}>あとで見る</Text></Pressable>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  introRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginTop: 8, marginBottom: 22 },
  introRowMobile: { alignItems: 'stretch', flexDirection: 'column', gap: 18, marginTop: 0 },
  greeting: { color: palette.ink, fontFamily: typography.serif, fontSize: 32, letterSpacing: 2 },
  greetingMobile: { fontSize: 27 },
  copy: { color: palette.muted, fontFamily: typography.serif, fontSize: 14, letterSpacing: 1.4, marginTop: 9 },
  modeTabs: { borderColor: palette.line, borderRadius: 999, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', width: 224 },
  modeTabsMobile: { alignSelf: 'stretch', width: '100%' },
  modeTab: { alignItems: 'center', flex: 1, paddingHorizontal: 18, paddingVertical: 11 },
  modeTabActive: { backgroundColor: palette.ink },
  modeTabTheoryActive: { backgroundColor: '#081d35' },
  modeTabText: { color: palette.ink, fontFamily: typography.serif, fontSize: 14 },
  modeTabTextActive: { color: palette.gold },
  modeTabTheoryTextActive: { color: '#f3d17d' },
  upgradeCta: { alignItems: 'center', backgroundColor: '#17140f', borderColor: '#9f742d', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 20, paddingVertical: 14 },
  upgradeCtaCopy: { flex: 1, minWidth: 0 },
  upgradeCtaLabel: { color: '#dbb65e', fontFamily: typography.serif, fontSize: 11, letterSpacing: 1.3 },
  upgradeCtaText: { color: '#fffaf0', fontFamily: typography.serif, fontSize: 14, letterSpacing: 0.7, marginTop: 4 },
  upgradeCtaAction: { color: '#e1ba62', fontFamily: typography.serif, fontSize: 13, marginLeft: 14 },
  curatedReelFrame: { overflow: 'visible', position: 'relative' },
  curatedViewport: { minHeight: 364, overflow: 'hidden' },
  hero: { backgroundColor: '#15130f', borderColor: '#302819', borderRadius: 20, borderWidth: 1, minHeight: 364, overflow: 'hidden', position: 'relative', ...bookCardShadow },
  heroTheory: { backgroundColor: '#071a31', borderColor: '#263b52' },
  heroMobile: { minHeight: 416 },
  heroImage: { height: '100%', position: 'absolute', right: 0, top: 0, width: '100%' },
  heroImageShade: { backgroundColor: 'rgba(5, 5, 4, 0.34)', height: '100%', position: 'absolute', right: 0, top: 0, width: '100%' },
  heroCopy: { justifyContent: 'center', minHeight: 364, paddingHorizontal: 28, paddingVertical: 36, zIndex: 2 },
  heroCopyDesktop: { backgroundColor: 'rgba(9, 8, 6, 0.78)', borderBottomRightRadius: 140, borderTopRightRadius: 140, width: '57%' },
  heroKicker: { color: '#d5ab55', fontFamily: typography.serif, fontSize: 14, letterSpacing: 1.2 },
  heroTitle: { color: '#fffdf7', fontFamily: typography.serif, fontSize: 38, letterSpacing: 2.2, lineHeight: 55, marginTop: 25 },
  heroTitleMobile: { fontSize: 30, lineHeight: 43, marginTop: 20 },
  heroBody: { color: '#f5f0e6', fontFamily: typography.serif, fontSize: 17, letterSpacing: 1.2, lineHeight: 30, marginTop: 18, maxWidth: 520 },
  heroFooter: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 27 },
  heroButton: { borderColor: '#b9903f', borderRadius: 999, borderWidth: 1, paddingHorizontal: 27, paddingVertical: 12 },
  heroButtonText: { color: '#ddb85e', fontFamily: typography.serif, fontSize: 14, letterSpacing: 1 },
  reelControls: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  reelSideArrow: { alignItems: 'center', backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: 'center', position: 'absolute', top: '50%', transform: [{ translateY: -24 }], width: 48, zIndex: 3, ...bookCardShadow },
  reelSideArrowPrevious: { left: -58 },
  reelSideArrowNext: { right: -58 },
  arrowText: { color: palette.ink, fontFamily: typography.serif, fontSize: 31, lineHeight: 36 },
  dots: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 10 },
  dot: { backgroundColor: '#ded6c8', borderRadius: 999, height: 8, width: 8 },
  dotActive: { backgroundColor: palette.gold, width: 20 },
  heroSkeleton: { justifyContent: 'center', padding: 36 },
  skeletonLineShort: { backgroundColor: '#37332c', borderRadius: 3, height: 13, width: 142 },
  skeletonTitle: { backgroundColor: '#413b31', borderRadius: 4, height: 42, marginTop: 30, width: '58%' },
  skeletonLine: { backgroundColor: '#302c25', borderRadius: 3, height: 14, marginTop: 16, width: '72%' },
  trendingSection: { marginTop: 24 },
  sectionHeadingRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, letterSpacing: 1.5 },
  sectionCaption: { color: palette.muted, fontFamily: typography.serif, fontSize: 11, letterSpacing: 0.8, marginTop: 5 },
  sectionLink: { color: palette.gold, fontFamily: typography.serif, fontSize: 12 },
  trendingRail: { gap: 14, paddingBottom: 10, paddingRight: 2 },
  trendingCard: { backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 14, borderWidth: 1, minHeight: 240, padding: 19, ...bookCardShadow },
  trendingTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  trendingKind: { color: palette.gold, fontFamily: typography.serif, fontSize: 12, letterSpacing: 1 },
  trendingTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 20, letterSpacing: 1, lineHeight: 29, marginTop: 16, minHeight: 58 },
  trendingSummary: { color: palette.muted, fontFamily: typography.serif, fontSize: 13, lineHeight: 23, marginTop: 10 },
  trendingFooter: { alignItems: 'center', borderTopColor: palette.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14 },
  trendingGroup: { color: palette.muted, flex: 1, fontFamily: typography.serif, fontSize: 11 },
  trendingArrow: { color: palette.gold, fontFamily: typography.serif, fontSize: 23, marginLeft: 8 },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(13, 11, 8, 0.55)', flex: 1, justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: palette.paper, borderColor: palette.gold, borderRadius: 16, borderWidth: 1, maxWidth: 430, padding: 28, width: '100%', ...bookCardShadow },
  modalEyebrow: { color: palette.gold, fontFamily: typography.serif, fontSize: 12, letterSpacing: 1.2 },
  modalTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 24, letterSpacing: 1, lineHeight: 37, marginTop: 14 },
  modalBody: { color: palette.muted, fontFamily: typography.serif, fontSize: 14, lineHeight: 25, marginTop: 15 },
  modalPrimary: { alignItems: 'center', backgroundColor: palette.ink, borderRadius: 999, marginTop: 24, paddingVertical: 13 },
  modalPrimaryText: { color: palette.gold, fontFamily: typography.serif, fontSize: 13 },
  modalSecondary: { alignItems: 'center', marginTop: 8, paddingVertical: 11 },
  modalSecondaryText: { color: palette.muted, fontFamily: typography.serif, fontSize: 12 },
});
