import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../../access/access-config';
import { useAccess } from '../../access/access-state';
import { BookScreen, SaveDiamondButton, bookCardShadow } from '../../components/book-ui';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { categoryMeta, techniqueCards, theories } from '../../data/catalog';
import { getTheoryCategoryLabel, getTheoryCoverSummary, isLockedTheoryShell } from '../../data/theory-display';
import type { TechniqueCard, TheoryCard } from '../../data/types';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { loadTrendingContent, TrendingContent } from '../../lib/content-events';
import { useAppState } from '../../state/app-state';
import { colors, fonts } from '../../constants/theme';
import { APP_ROUTES, techniqueRoute, theoryRoute } from '../../navigation/app-routes';

type HomeContent =
  | { type: 'technique'; card: TechniqueCard }
  | { type: 'theory'; card: TheoryCard };

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

export default function HomeScreen() {
  const router = useRouter();
  const { desktop: isDesktop, width } = useResponsiveLayout();
  const { accessState, catalogRevision } = useAccess();
  const {
    hydrated,
    savedIds,
    savedTheoryIds,
    toggleSaved,
    toggleSavedTheory,
    homeWelcomePending,
    dismissHomeWelcome,
  } = useAppState();
  const [greeting, setGreeting] = useState('こんにちは');
  const [trending, setTrending] = useState<TrendingContent[] | null>(null);

  useEffect(() => setGreeting(localGreeting()), []);

  useEffect(() => {
    let active = true;
    loadTrendingContent(12).then((items) => {
      if (active) setTrending(items);
    }).catch(() => {
      if (active) setTrending([]);
    });
    return () => { active = false; };
  }, []);

  const trendingContent = useMemo<HomeContent[]>(() => {
    if (!trending) return [];
    const techniques = new Map(techniqueCards.map((card) => [card.id, card]));
    const theoryLookup = new Map(theories.map((card) => [card.tagId, card]));
    const result: HomeContent[] = [];
    trending.forEach((item) => {
      if (item.contentType === 'technique') {
        const card = techniques.get(item.contentId);
        if (card && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))) result.push({ type: 'technique', card });
      } else {
        const card = theoryLookup.get(item.contentId);
        if (card && !isLockedTheoryShell(card) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(card.tagId))) result.push({ type: 'theory', card });
      }
    });
    return result.slice(0, 4);
  }, [accessState, catalogRevision, trending]);

  const railCardWidth = isDesktop ? Math.max(210, Math.min(238, (width - 260) / 4)) : 276;

  return (
    <BookScreen>
      <View testID="home-intro-row" style={[styles.introRow, !isDesktop && styles.introRowMobile]}>
        <Text testID="home-greeting" style={[styles.greeting, !isDesktop && styles.greetingMobile]}>{greeting}</Text>
        <Text testID="home-intro-copy" style={[styles.copy, !isDesktop && styles.copyMobile]}>今日も、自分のペースで。ひとつ、うまく生きる知恵を。</Text>
      </View>

      <HomeHeroCarousel desktop={isDesktop} catalogRevision={catalogRevision} />

      {trendingContent.length > 0 ? (
        <View testID="home-trending-section" style={[styles.trendingSection, isDesktop && styles.trendingSectionDesktop]}>
          <View style={styles.sectionHeadingRow}>
            <View><Text style={styles.sectionTitle}>いま読まれているもの</Text><Text style={styles.sectionCaption}>直近14日の閲覧と保存から</Text></View>
            <Pressable accessibilityRole="link" onPress={() => router.push(APP_ROUTES.discover)}><Text style={styles.sectionLink}>探すへ　›</Text></Pressable>
          </View>
          <ScrollView horizontal testID="home-trending-rail" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRail}>
            {trendingContent.map((item) => {
              const theory = item.type === 'theory';
              const itemId = contentCardId(item.card);
              const summary = theory ? getTheoryCoverSummary((item.card as TheoryCard).summary) : (item.card as TechniqueCard).essence;
              const group = theory ? getTheoryCategoryLabel(item.card as TheoryCard) : `${categoryMeta[(item.card as TechniqueCard).categoryKey].label}・${(item.card as TechniqueCard).subcategory}`;
              const saved = theory ? savedTheoryIds.includes(itemId) : savedIds.includes(itemId);
              return (
                <Pressable testID="home-trending-card" key={`${item.type}:${itemId}`} accessibilityRole="link" onPress={() => router.push(theory ? theoryRoute(itemId) : techniqueRoute(itemId))} style={[styles.trendingCard, isDesktop && styles.trendingCardDesktop, { width: railCardWidth }]}>
                  <View style={styles.trendingTopRow}><Text style={styles.trendingKind}>{theory ? '理論' : '処世術'}</Text><SaveDiamondButton compact saved={saved} onPress={() => theory ? toggleSavedTheory(itemId) : toggleSaved(itemId)} /></View>
                  <Text numberOfLines={2} style={[styles.trendingTitle, isDesktop && styles.trendingTitleDesktop]}>{item.card.title}</Text>
                  <Text numberOfLines={3} style={[styles.trendingSummary, isDesktop && styles.trendingSummaryDesktop]}>{summary}</Text>
                  <View style={[styles.trendingFooter, isDesktop && styles.trendingFooterDesktop]}><Text numberOfLines={1} style={styles.trendingGroup}>{group}</Text><Text style={styles.trendingArrow}>›</Text></View>
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
  introRow: { alignItems: 'baseline', flexDirection: 'row', gap: 22, marginBottom: 12, marginTop: 0 },
  introRowMobile: { alignItems: 'stretch', flexDirection: 'column', gap: 2, marginBottom: 13, marginTop: 0 },
  greeting: { color: palette.ink, fontFamily: typography.serif, fontSize: 32, letterSpacing: 2 },
  greetingMobile: { flexShrink: 0, fontSize: 26, lineHeight: 35 },
  copy: { color: palette.muted, flexShrink: 1, fontFamily: typography.serif, fontSize: 14, letterSpacing: 1.4, lineHeight: 23 },
  copyMobile: { flex: 0, fontSize: 11, letterSpacing: 0.45, lineHeight: 18, paddingTop: 0 },
  trendingSection: { marginTop: 24 },
  trendingSectionDesktop: { marginTop: 16 },
  sectionHeadingRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 22, letterSpacing: 1.5 },
  sectionCaption: { color: palette.muted, fontFamily: typography.serif, fontSize: 11, letterSpacing: 0.8, marginTop: 5 },
  sectionLink: { color: palette.gold, fontFamily: typography.serif, fontSize: 12 },
  trendingRail: { gap: 14, paddingBottom: 10, paddingRight: 2 },
  trendingCard: { backgroundColor: palette.paper, borderColor: palette.line, borderRadius: 14, borderWidth: 1, minHeight: 240, padding: 19, ...bookCardShadow },
  trendingCardDesktop: { minHeight: 210, padding: 16 },
  trendingTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  trendingKind: { color: palette.gold, fontFamily: typography.serif, fontSize: 12, letterSpacing: 1 },
  trendingTitle: { color: palette.ink, fontFamily: typography.serif, fontSize: 20, letterSpacing: 1, lineHeight: 29, marginTop: 16, minHeight: 58 },
  trendingTitleDesktop: { fontSize: 18, lineHeight: 26, marginTop: 12, minHeight: 52 },
  trendingSummary: { color: palette.muted, fontFamily: typography.serif, fontSize: 13, lineHeight: 23, marginTop: 10 },
  trendingSummaryDesktop: { fontSize: 12, lineHeight: 20, marginTop: 7 },
  trendingFooter: { alignItems: 'center', borderTopColor: palette.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 14 },
  trendingFooterDesktop: { paddingTop: 11 },
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
