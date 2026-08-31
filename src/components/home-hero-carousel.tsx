import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { COMPLETE_LEARNING_CASE_COUNT, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { categoryMeta } from '@/data/catalog';
import { getHomeBrandContent, resolveHomeTheoryMapLinks, type HomePersona, type HomeTheoryMapItem } from '@/data/home-brand-content';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TechniqueCard, TheoryCard } from '@/data/types';
import { COMPLETE_EDITION_PRICE_JPY } from '@/lib/purchase';
import { APP_ROUTES, personaRoute, techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';
import { Rokumaru } from './rokumaru';
import { bookCardShadow } from './book-ui';
import { colors, fonts } from '@/constants/theme';

const techniqueImage = require('../../assets/home/machiya-night-hero.png');
const personaImage = require('../../assets/home/persona-washi-portrait.webp');
const lineageImage = require('../../assets/home/theory-lineage-washi.webp');
const systemImage = require('../../assets/home/system-atlas-washi.webp');
const completeMark = require('../../assets/upgrade/complete-mark.png');

const HOME_REEL_ID = 'brand';
const HOME_REEL_SLIDE_COUNT = 7;
const homeReelPositions = new Map<string, number>();

function readHomeReelPosition(reelId: string) {
  const cached = homeReelPositions.get(reelId);
  if (typeof cached === 'number') return cached;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 0;
  try {
    const value = window.sessionStorage.getItem(`shoseijutsu-roku:home-reel:${reelId}`);
    const index = value ? Number(JSON.parse(value).index) : 0;
    return Number.isInteger(index) ? Math.max(0, Math.min(HOME_REEL_SLIDE_COUNT - 1, index)) : 0;
  } catch {
    return 0;
  }
}

function writeHomeReelPosition(reelId: string, index: number) {
  homeReelPositions.set(reelId, index);
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`shoseijutsu-roku:home-reel:${reelId}`, JSON.stringify({ index }));
  } catch {
    // A private browser may reject sessionStorage. The in-memory position is
    // still enough for an in-app detail round trip.
  }
}

export type HomeHeroSlideType =
  | 'todayTechnique'
  | 'persona'
  | 'theory'
  | 'techniqueTheoryMap'
  | 'systemMap'
  | 'premium'
  | 'rokumaru';

type HomeHeroCarouselProps = {
  desktop: boolean;
  catalogRevision: number;
};

type SlideShellProps = {
  children: React.ReactNode;
  desktop: boolean;
  testID: string;
  tone?: 'paper' | 'dark' | 'navy';
};

function SlideShell({ children, desktop, testID, tone = 'paper' }: SlideShellProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.slide,
        !desktop && styles.slideMobile,
        tone === 'dark' && styles.slideDark,
        tone === 'navy' && styles.slideNavy,
      ]}
    >
      {children}
    </View>
  );
}

function Cta({ label, onPress, dark = false, testID }: { label: string; onPress: () => void; dark?: boolean; testID?: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label.replace(/\s*→$/, '')}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.cta, dark && styles.ctaDark, pressed && styles.pressed]}
    >
      <Text style={[styles.ctaText, dark && styles.ctaTextDark]}>{label}</Text>
    </Pressable>
  );
}

export function TechniqueHeroSlide({ card, desktop }: { card: TechniqueCard; desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-1" tone="dark">
      <Image source={techniqueImage} resizeMode="cover" accessibilityLabel="雨上がりの夜、暖かな灯りが残る町家の路地" style={styles.fullImage} />
      <View style={styles.techniqueShade} />
      <View style={[styles.techniqueCopy, desktop ? styles.techniqueCopyDesktop : styles.techniqueCopyMobile]}>
        <Text style={styles.darkEyebrow}>今日の一枚｜処世術</Text>
        <Text style={[styles.darkTitle, !desktop && styles.darkTitleMobile]}>{card.title}</Text>
        <Text style={styles.darkBody}>{card.essence}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.darkMeta}>{categoryMeta[card.categoryKey].label}</Text>
          <Cta label="読む　→" dark onPress={() => router.push(techniqueRoute(card.id))} testID="home-brand-technique-cta" />
        </View>
      </View>
    </SlideShell>
  );
}

export function PersonaHeroSlide({ persona, desktop }: { persona: HomePersona; desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-2">
      <Image source={personaImage} resizeMode="cover" accessibilityLabel="和紙と墨で描いた人物像の横顔" style={styles.fullImage} />
      <View style={[styles.paperCopy, !desktop && styles.paperCopyMobile]}>
        <Text style={styles.goldEyebrow}>人物像｜{persona.categoryName}</Text>
        <Text style={[styles.paperTitle, !desktop && styles.paperTitleMobile]}>{persona.name}</Text>
        <Text style={styles.personaDescription}>{persona.description}</Text>
        <View style={styles.personaCountRow}>
          <Text style={styles.personaCount}>{persona.techniqueCount}</Text>
          <Text style={styles.personaCountLabel}>処世術で構成</Text>
        </View>
        <Cta
          label="人物像を見る　→"
          onPress={() => router.push(personaRoute(persona.categoryKey, persona.name))}
          testID="home-brand-persona-cta"
        />
      </View>
    </SlideShell>
  );
}

export function TheoryHeroSlide({ theory, desktop }: { theory: TheoryCard; desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-3" tone="navy">
      <View style={styles.theoryFrame} />
      <View style={[styles.theoryCopy, !desktop && styles.theoryCopyMobile]}>
        <View style={styles.theoryMetaRow}>
          <View>
            <Text style={styles.darkEyebrow}>理論</Text>
            <Text style={styles.theoryCategory}>{theory.categoryTitle}</Text>
          </View>
          <Text style={styles.theoryId}>{getTheoryDisplayId(theory)}</Text>
        </View>
        <Text style={[styles.theoryTitle, !desktop && styles.theoryTitleMobile]}>{theory.title}</Text>
        <View style={styles.theoryRule}><View style={styles.theoryRuleLine} /><View style={styles.theoryRuleDiamond} /><View style={styles.theoryRuleLine} /></View>
        <Text style={styles.theorySummary}>{theory.summary}</Text>
        <Cta label="理論を見る　→" dark onPress={() => router.push(theoryRoute(theory.tagId))} testID="home-brand-theory-cta" />
      </View>
    </SlideShell>
  );
}

function TheoryNode({ item, index, onPress }: { item: HomeTheoryMapItem; index: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${item.title}を開く`}
      testID={`home-brand-map-theory-${index + 1}`}
      onPress={onPress}
      style={({ pressed }) => [styles.theoryNode, pressed && styles.pressed]}
    >
      <Text style={styles.theoryNodeCategory}>{item.categoryTitle}</Text>
      <Text style={styles.theoryNodeTitle}>{item.title}</Text>
    </Pressable>
  );
}

export function TechniqueTheoryMapSlide({ techniqueId, techniqueTitle, theories, desktop }: { techniqueId: string; techniqueTitle: string; theories: HomeTheoryMapItem[]; desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-4">
      <Image source={lineageImage} resizeMode="cover" accessibilityLabel="和紙に細い金線で描いた知識の系譜" style={styles.fullImage} />
      <View style={[styles.mapContent, !desktop && styles.mapContentMobile]}>
        <Text style={styles.mapHeading}>ひとつの処世術を、複数の理論から読む</Text>
        <View style={[styles.mapLayout, !desktop && styles.mapLayoutMobile]}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${techniqueTitle}を開く`}
            testID="home-brand-map-technique-cta"
            onPress={() => router.push(techniqueRoute(techniqueId))}
            style={({ pressed }) => [styles.mapTechnique, !desktop && styles.mapTechniqueMobile, pressed && styles.pressed]}
          >
            <Text style={styles.mapTechniqueLabel}>処世術</Text>
            <Text style={[styles.mapTechniqueTitle, !desktop && styles.mapTechniqueTitleMobile]}>{techniqueTitle}</Text>
          </Pressable>
          <View accessibilityElementsHidden style={[styles.mapConnector, !desktop && styles.mapConnectorMobile]}><Text style={styles.mapConnectorGlyph}>{desktop ? '───' : '↓'}</Text></View>
          <View style={[styles.theoryNodes, !desktop && styles.theoryNodesMobile]}>
            {theories.map((item, index) => <TheoryNode key={item.tagId} item={item} index={index} onPress={() => router.push(theoryRoute(item.tagId))} />)}
          </View>
        </View>
      </View>
    </SlideShell>
  );
}

export function SystemMapSlide({ desktop, counts }: { desktop: boolean; counts: { domains: number; domainNames: string[]; personas: number; techniques: number; theories: number } }) {
  const router = useRouter();
  const stats = [
    { value: counts.domains, label: '領域', note: counts.domainNames.join('・') },
    { value: counts.personas, label: '人物像', note: '知恵を「人の型」に整理' },
    { value: counts.techniques, label: '処世術', note: '実践できる判断の知恵' },
    { value: counts.theories, label: '理論', note: '背景の原理まで深く読む' },
  ];
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-5">
      <Image source={systemImage} resizeMode="cover" accessibilityLabel="和紙に描かれた知識地図と山並み" style={styles.fullImage} />
      <View style={[styles.systemContent, !desktop && styles.systemContentMobile]}>
        <Text style={styles.systemTitle}>処世術禄の体系</Text>
        <Text style={styles.systemLead}>人生をうまく生きる方法を、ひとつの体系に。</Text>
        <View style={[styles.systemStats, !desktop && styles.systemStatsMobile]}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={[styles.systemStatWrap, !desktop && styles.systemStatWrapMobile]}>
              <View style={[styles.systemStat, index === 2 && styles.systemStatGold, index === 3 && styles.systemStatDark]}>
                <Text style={[styles.systemValue, index >= 2 && styles.systemValueReverse]}>{stat.value}</Text>
                <Text style={[styles.systemLabel, index >= 2 && styles.systemLabelReverse]}>{stat.label}</Text>
              </View>
              {desktop ? <Text style={styles.systemNote}>{stat.note}</Text> : null}
              {index < stats.length - 1 ? <Text style={[styles.systemArrow, !desktop && styles.systemArrowMobile]}>{index === 2 ? '↔' : '→'}</Text> : null}
            </View>
          ))}
        </View>
        <Cta label="体系を見る　→" onPress={() => router.push(APP_ROUTES.personas)} testID="home-brand-system-cta" />
      </View>
    </SlideShell>
  );
}

export function PremiumHeroSlide({ desktop, counts }: { desktop: boolean; counts: { techniques: number; theories: number } }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-6">
      <View style={styles.premiumOrnament} />
      <View style={[styles.premiumContent, !desktop && styles.premiumContentMobile]}>
        <View style={styles.premiumCopy}>
          <Text style={styles.goldEyebrow}>処世術禄　完全版</Text>
          <Text style={[styles.premiumTitle, !desktop && styles.premiumTitleMobile]}>30日間、すべての知恵を。</Text>
          <View style={styles.premiumPriceRow}>
            <Text style={styles.premiumPrice}>¥{COMPLETE_EDITION_PRICE_JPY}</Text>
            <View><Text style={styles.premiumDuration}>30日間</Text><Text style={styles.premiumCondition}>一回払い・自動更新なし</Text></View>
          </View>
          <View style={[styles.editionCompare, !desktop && styles.editionCompareMobile]}>
            <View><Text style={styles.editionLabel}>無料版</Text><Text style={styles.editionText}>処世術 {FREE_REEL_TECHNIQUE_IDS.length}件　理論 {FREE_THEORY_IDS.length}件</Text></View>
            <Text style={styles.editionArrow}>→</Text>
            <View><Text style={[styles.editionLabel, styles.editionLabelComplete]}>完全版</Text><Text style={styles.editionText}>{counts.techniques}処世術・{counts.theories}理論・全{COMPLETE_LEARNING_CASE_COUNT}ケース</Text></View>
          </View>
          <Cta label="完全版を見る　→" onPress={() => router.push(upgradeRoute('home_carousel'))} testID="home-brand-premium-cta" />
        </View>
        <View style={[styles.premiumMarkWrap, !desktop && styles.premiumMarkWrapMobile]}>
          <Image source={completeMark} resizeMode="contain" accessibilityLabel="処世術禄完全版の禄マーク" style={styles.premiumMark} />
        </View>
      </View>
    </SlideShell>
  );
}

export function RokumaruSlide({ desktop }: { desktop: boolean }) {
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-7">
      <View style={styles.rokumaruHalo} />
      <View style={[styles.rokumaruCopy, !desktop && styles.rokumaruCopyMobile]}>
        <Text style={styles.rokumaruEyebrow}>禄丸からひと言</Text>
        <Text style={[styles.rokumaruQuote, !desktop && styles.rokumaruQuoteMobile]}>焦らず、一歩ずつ。</Text>
        <Text style={styles.rokumaruMessage}>今日の一枚も、立派な前進だよ。</Text>
      </View>
      <Rokumaru mood="encourage" testID="home-rokumaru" style={[styles.rokumaru, !desktop && styles.rokumaruMobile]} />
    </SlideShell>
  );
}

export function HomeHeroCarousel({ desktop, catalogRevision }: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(() => readHomeReelPosition(HOME_REEL_ID));
  const [viewportWidth, setViewportWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const railRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(activeIndex);
  const content = useMemo(() => getHomeBrandContent(), [catalogRevision]);
  const theoryLinks = useMemo(() => resolveHomeTheoryMapLinks(), [catalogRevision]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const commitIndex = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(HOME_REEL_SLIDE_COUNT - 1, index));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    writeHomeReelPosition(HOME_REEL_ID, nextIndex);
    return nextIndex;
  }, []);

  const moveTo = useCallback((index: number, animated = true) => {
    const nextIndex = commitIndex(index);
    railRef.current?.scrollTo({ x: nextIndex * viewportWidth, animated: animated && !reduceMotion });
  }, [commitIndex, reduceMotion, viewportWidth]);

  const settleAtOffset = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!viewportWidth) return;
    commitIndex(Math.round(event.nativeEvent.contentOffset.x / viewportWidth));
  }, [commitIndex, viewportWidth]);

  useEffect(() => {
    writeHomeReelPosition(HOME_REEL_ID, activeIndexRef.current);
  }, []);

  useEffect(() => {
    if (!viewportWidth) return;
    railRef.current?.scrollTo({ x: activeIndexRef.current * viewportWidth, animated: false });
  }, [viewportWidth]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') moveTo(activeIndexRef.current - 1);
      if (event.key === 'ArrowRight') moveTo(activeIndexRef.current + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveTo]);

  if (!content.technique || !content.persona || !content.theory) return null;

  const slides: Array<{ type: HomeHeroSlideType; node: React.ReactNode }> = [
    { type: 'todayTechnique', node: <TechniqueHeroSlide card={content.technique} desktop={desktop} /> },
    { type: 'persona', node: <PersonaHeroSlide persona={content.persona} desktop={desktop} /> },
    { type: 'theory', node: <TheoryHeroSlide theory={content.theory} desktop={desktop} /> },
    { type: 'techniqueTheoryMap', node: <TechniqueTheoryMapSlide techniqueId={content.techniqueTheoryMap.techniqueId} techniqueTitle={content.techniqueTheoryMap.title} theories={theoryLinks} desktop={desktop} /> },
    { type: 'systemMap', node: <SystemMapSlide counts={content.counts} desktop={desktop} /> },
    { type: 'premium', node: <PremiumHeroSlide desktop={desktop} counts={content.counts} /> },
    { type: 'rokumaru', node: <RokumaruSlide desktop={desktop} /> },
  ];

  return (
    <View testID="home-brand-carousel" style={styles.carousel}>
      <View style={[styles.carouselRow, !desktop && styles.carouselRowMobile]}>
        <Pressable
          disabled={activeIndex === 0}
          accessibilityRole="button"
          accessibilityLabel="前のスライド"
          accessibilityState={{ disabled: activeIndex === 0 }}
          onPress={() => moveTo(activeIndexRef.current - 1)}
          style={({ pressed }) => [styles.arrow, !desktop && styles.arrowMobile, activeIndex === 0 && styles.arrowDisabled, pressed && activeIndex > 0 && styles.pressed]}
        ><Text style={[styles.arrowText, !desktop && styles.arrowTextMobile]}>‹</Text></Pressable>
        <View
          style={styles.viewport}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setViewportWidth((current) => Math.abs(current - nextWidth) > 0.5 ? nextWidth : current);
          }}
        >
          <ScrollView
            ref={railRef}
            horizontal
            pagingEnabled
            disableIntervalMomentum
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={viewportWidth || undefined}
            testID="home-brand-viewport"
            accessibilityLabel="処世術禄の魅力を7つの切り口で紹介"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={settleAtOffset}
            onScrollEndDrag={settleAtOffset}
            onContentSizeChange={() => {
              if (viewportWidth) railRef.current?.scrollTo({ x: activeIndexRef.current * viewportWidth, animated: false });
            }}
          >
            {viewportWidth ? slides.map((slide) => <View key={slide.type} style={{ width: viewportWidth }}>{slide.node}</View>) : null}
          </ScrollView>
        </View>
        <Pressable
          disabled={activeIndex === slides.length - 1}
          accessibilityRole="button"
          accessibilityLabel="次のスライド"
          accessibilityState={{ disabled: activeIndex === slides.length - 1 }}
          onPress={() => moveTo(activeIndexRef.current + 1)}
          style={({ pressed }) => [styles.arrow, !desktop && styles.arrowMobile, activeIndex === slides.length - 1 && styles.arrowDisabled, pressed && activeIndex < slides.length - 1 && styles.pressed]}
        ><Text style={[styles.arrowText, !desktop && styles.arrowTextMobile]}>›</Text></Pressable>
      </View>
      <View accessibilityRole="tablist" style={styles.dots}>
        {slides.map((slide, index) => (
          <Pressable
            key={slide.type}
            accessibilityRole="tab"
            accessibilityLabel={`${index + 1}枚目を表示`}
            accessibilityState={{ selected: index === activeIndex }}
            aria-selected={index === activeIndex}
            onPress={() => moveTo(index)}
            style={[styles.dotTouch, index === activeIndex && styles.dotTouchActive]}
          ><View style={[styles.dot, index === activeIndex && styles.dotActive]} /></Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { width: '100%' },
  carouselRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  carouselRowMobile: { gap: 6 },
  viewport: { flex: 1, minWidth: 0, overflow: 'hidden' },
  slide: { backgroundColor: '#FCF8EF', borderColor: '#D8C9AE', borderRadius: 20, borderWidth: 1, minHeight: 410, overflow: 'hidden', position: 'relative', ...bookCardShadow },
  slideMobile: { borderRadius: 17, minHeight: 520 },
  slideDark: { backgroundColor: '#12110E', borderColor: '#3D321F' },
  slideNavy: { backgroundColor: '#07182D', borderColor: '#34435A' },
  fullImage: { height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  pressed: { opacity: 0.82 },
  cta: { alignItems: 'center', alignSelf: 'flex-start', borderColor: '#B98A31', borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginTop: 20, minHeight: 44, paddingHorizontal: 23 },
  ctaDark: { borderColor: '#C59A45' },
  ctaText: { color: '#80580E', fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', letterSpacing: 0.8 },
  ctaTextDark: { color: '#E1BD68' },
  techniqueShade: { backgroundColor: 'rgba(6,5,4,0.42)', height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  techniqueCopy: { justifyContent: 'center', minHeight: 520, paddingHorizontal: 35, paddingVertical: 42, zIndex: 1 },
  techniqueCopyDesktop: { backgroundColor: 'rgba(8,7,5,0.82)', borderBottomRightRadius: 170, borderTopRightRadius: 170, minHeight: 410, width: '58%' },
  techniqueCopyMobile: { paddingHorizontal: 30 },
  darkEyebrow: { color: '#D4A94E', fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.4 },
  darkTitle: { color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 39, letterSpacing: 2.4, lineHeight: 57, marginTop: 22 },
  darkTitleMobile: { fontSize: 31, lineHeight: 46, maxWidth: 280 },
  darkBody: { color: '#F7F0E4', fontFamily: fonts.serif, fontSize: 16, letterSpacing: 1, lineHeight: 29, marginTop: 15, maxWidth: 480 },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 5 },
  darkMeta: { borderColor: '#A57B2D', borderRadius: 999, borderWidth: 1, color: '#E1BD68', fontFamily: fonts.serif, fontSize: 11, marginTop: 20, paddingHorizontal: 13, paddingVertical: 6 },
  paperCopy: { justifyContent: 'center', minHeight: 410, paddingHorizontal: 40, paddingVertical: 34, width: '58%' },
  paperCopyMobile: { backgroundColor: 'rgba(252,248,239,0.88)', justifyContent: 'flex-end', minHeight: 520, paddingBottom: 34, paddingHorizontal: 27, paddingTop: 215, width: '100%' },
  goldEyebrow: { color: '#A77824', fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.4 },
  paperTitle: { color: '#171717', fontFamily: fonts.serif, fontSize: 37, letterSpacing: 2.2, lineHeight: 51, marginTop: 15 },
  paperTitleMobile: { fontSize: 30, lineHeight: 41 },
  personaDescription: { color: '#5E584F', fontFamily: fonts.serif, fontSize: 14, lineHeight: 25, marginTop: 8, maxWidth: 420 },
  personaCountRow: { alignItems: 'baseline', flexDirection: 'row', gap: 7, marginTop: 12 },
  personaCount: { color: '#A77824', fontFamily: fonts.serif, fontSize: 34, lineHeight: 40 },
  personaCountLabel: { color: '#6D6253', fontFamily: fonts.serif, fontSize: 12 },
  theoryFrame: { borderColor: 'rgba(197,154,69,0.55)', borderRadius: 14, borderWidth: 1, bottom: 10, left: 10, position: 'absolute', right: 10, top: 10 },
  theoryCopy: { alignSelf: 'center', justifyContent: 'center', maxWidth: 860, minHeight: 410, paddingHorizontal: 48, paddingVertical: 40, width: '100%' },
  theoryCopyMobile: { minHeight: 520, paddingHorizontal: 29, paddingVertical: 38 },
  theoryMetaRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  theoryCategory: { color: '#DDBD75', fontFamily: fonts.serif, fontSize: 12, marginTop: 7 },
  theoryId: { borderColor: '#A77D31', borderRadius: 999, borderWidth: 1, color: '#E1BD68', fontFamily: fonts.serif, fontSize: 12, paddingHorizontal: 15, paddingVertical: 7 },
  theoryTitle: { color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 38, letterSpacing: 2, lineHeight: 53, marginTop: 24, textAlign: 'center' },
  theoryTitleMobile: { fontSize: 30, lineHeight: 43 },
  theoryRule: { alignItems: 'center', flexDirection: 'row', gap: 8, marginVertical: 14 },
  theoryRuleLine: { backgroundColor: 'rgba(196,148,57,0.65)', flex: 1, height: 1 },
  theoryRuleDiamond: { backgroundColor: '#C69A46', height: 7, transform: [{ rotate: '45deg' }], width: 7 },
  theorySummary: { alignSelf: 'center', color: '#EDE8DD', fontFamily: fonts.serif, fontSize: 15, lineHeight: 28, maxWidth: 760, textAlign: 'center' },
  mapContent: { minHeight: 410, paddingHorizontal: 36, paddingVertical: 27 },
  mapContentMobile: { minHeight: 520, paddingHorizontal: 24, paddingVertical: 25 },
  mapHeading: { color: '#9D6E1B', fontFamily: fonts.serif, fontSize: 16, letterSpacing: 1.6, textAlign: 'center' },
  mapLayout: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  mapLayoutMobile: { flexDirection: 'column', justifyContent: 'flex-start', marginTop: 19 },
  mapTechnique: { alignItems: 'center', backgroundColor: '#101B29', borderColor: '#B88A2A', borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 145, padding: 20, width: '30%' },
  mapTechniqueMobile: { minHeight: 92, padding: 14, width: '100%' },
  mapTechniqueLabel: { color: '#DAB565', fontFamily: fonts.serif, fontSize: 11, letterSpacing: 1.5 },
  mapTechniqueTitle: { color: '#FFFDF7', fontFamily: fonts.serif, fontSize: 25, lineHeight: 37, marginTop: 11, textAlign: 'center' },
  mapTechniqueTitleMobile: { fontSize: 20, lineHeight: 29 },
  mapConnector: { alignItems: 'center', width: '10%' },
  mapConnectorMobile: { height: 28, justifyContent: 'center', width: '100%' },
  mapConnectorGlyph: { color: '#B88A2A', fontFamily: fonts.serif, fontSize: 18 },
  theoryNodes: { gap: 10, width: '43%' },
  theoryNodesMobile: { flex: 1, gap: 7, width: '100%' },
  theoryNode: { backgroundColor: 'rgba(255,253,248,0.94)', borderColor: '#CDAA67', borderRadius: 10, borderWidth: 1, minHeight: 58, paddingHorizontal: 17, paddingVertical: 9 },
  theoryNodeCategory: { color: '#9A712B', fontFamily: fonts.serif, fontSize: 9, letterSpacing: 0.8 },
  theoryNodeTitle: { color: '#1D2024', fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, marginTop: 2 },
  systemContent: { alignItems: 'center', minHeight: 410, paddingHorizontal: 34, paddingVertical: 24 },
  systemContentMobile: { minHeight: 520, paddingHorizontal: 20, paddingVertical: 24 },
  systemTitle: { color: '#1C1A17', fontFamily: fonts.serif, fontSize: 27, letterSpacing: 2, lineHeight: 38 },
  systemLead: { color: '#766B5A', fontFamily: fonts.serif, fontSize: 12, marginTop: 3 },
  systemStats: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 30, width: '100%' },
  systemStatsMobile: { flexWrap: 'wrap', marginTop: 20, rowGap: 11 },
  systemStatWrap: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minWidth: 0, width: '25%' },
  systemStatWrapMobile: { width: '50%' },
  systemStat: { alignItems: 'center', backgroundColor: 'rgba(255,253,248,0.82)', borderColor: '#CDB789', borderRadius: 58, borderWidth: 1, height: 116, justifyContent: 'center', width: 116 },
  systemStatGold: { backgroundColor: '#B88A2A', borderColor: '#DAB967' },
  systemStatDark: { backgroundColor: '#171717', borderColor: '#B88A2A' },
  systemValue: { color: '#1B1A17', fontFamily: fonts.serif, fontSize: 31, lineHeight: 37 },
  systemValueReverse: { color: '#FFF9ED' },
  systemLabel: { color: '#665A49', fontFamily: fonts.serif, fontSize: 12 },
  systemLabelReverse: { color: '#F1D99F' },
  systemNote: { color: '#746A5B', fontFamily: fonts.serif, fontSize: 9, lineHeight: 14, marginLeft: -116, marginTop: 126, position: 'absolute', textAlign: 'center', width: 116 },
  systemArrow: { color: '#B88A2A', fontFamily: fonts.serif, fontSize: 23, marginHorizontal: 5 },
  systemArrowMobile: { fontSize: 17, marginHorizontal: 2 },
  premiumOrnament: { borderColor: 'rgba(184,138,42,0.26)', borderRadius: 300, borderWidth: 1, height: 430, position: 'absolute', right: -80, top: -120, width: 430 },
  premiumContent: { alignItems: 'center', flexDirection: 'row', minHeight: 410, paddingHorizontal: 48, paddingVertical: 32 },
  premiumContentMobile: { flexDirection: 'column-reverse', justifyContent: 'center', minHeight: 520, paddingHorizontal: 27, paddingVertical: 29 },
  premiumCopy: { flex: 1, minWidth: 0 },
  premiumTitle: { color: '#1A1815', fontFamily: fonts.serif, fontSize: 31, lineHeight: 43, marginTop: 11 },
  premiumTitleMobile: { fontSize: 25, lineHeight: 35 },
  premiumPriceRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 10 },
  premiumPrice: { color: '#B4770B', fontFamily: fonts.serif, fontSize: 44, lineHeight: 50 },
  premiumDuration: { borderColor: '#C89434', borderRadius: 6, borderWidth: 1, color: '#8F641C', fontFamily: fonts.serif, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3 },
  premiumCondition: { color: '#776B5B', fontFamily: fonts.serif, fontSize: 9, marginTop: 4 },
  editionCompare: { alignItems: 'center', borderTopColor: '#D9C9AC', borderTopWidth: 1, flexDirection: 'row', gap: 13, marginTop: 15, paddingTop: 13 },
  editionCompareMobile: { alignItems: 'flex-start', gap: 7 },
  editionLabel: { color: '#7C7163', fontFamily: fonts.serif, fontSize: 10 },
  editionLabelComplete: { color: '#A66C0C' },
  editionText: { color: '#302B24', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, marginTop: 2 },
  editionArrow: { color: '#B88A2A', fontFamily: fonts.serif, fontSize: 18 },
  premiumMarkWrap: { alignItems: 'center', justifyContent: 'center', width: '33%' },
  premiumMarkWrapMobile: { height: 105, width: '100%' },
  premiumMark: { height: 172, width: 172 },
  rokumaruHalo: { backgroundColor: 'rgba(201,153,55,0.13)', borderRadius: 230, height: 460, position: 'absolute', right: 25, top: -20, width: 460 },
  rokumaruCopy: { justifyContent: 'center', minHeight: 410, paddingHorizontal: 52, width: '61%' },
  rokumaruCopyMobile: { justifyContent: 'flex-start', minHeight: 520, paddingHorizontal: 28, paddingTop: 48, width: '100%' },
  rokumaruEyebrow: { color: '#6D5531', fontFamily: fonts.serif, fontSize: 14, letterSpacing: 1.2 },
  rokumaruQuote: { color: '#1B1916', fontFamily: fonts.serif, fontSize: 37, letterSpacing: 2, lineHeight: 53, marginTop: 20 },
  rokumaruQuoteMobile: { fontSize: 28, lineHeight: 40 },
  rokumaruMessage: { color: '#4E473E', fontFamily: fonts.serif, fontSize: 18, lineHeight: 31, marginTop: 7 },
  rokumaru: { bottom: -14, height: 390, position: 'absolute', right: 22, width: 390 },
  rokumaruMobile: { bottom: -22, height: 295, right: -24, width: 295 },
  arrow: { alignItems: 'center', backgroundColor: 'rgba(255,253,248,0.96)', borderColor: '#D3C4A9', borderRadius: 23, borderWidth: 1, flexShrink: 0, height: 46, justifyContent: 'center', width: 46, ...bookCardShadow },
  arrowMobile: { borderRadius: 17, height: 34, width: 34 },
  arrowDisabled: { opacity: 0.28 },
  arrowText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 34 },
  arrowTextMobile: { fontSize: 25, lineHeight: 28 },
  dots: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dotTouch: { alignItems: 'center', height: 34, justifyContent: 'center', width: 25 },
  dotTouchActive: { width: 35 },
  dot: { backgroundColor: '#D8D1C5', borderRadius: 4, height: 7, width: 7 },
  dotActive: { backgroundColor: '#B88A2A', width: 18 },
});
