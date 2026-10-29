import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent, type NativeScrollEvent, type NativeSyntheticEvent, type TextStyle, type ViewStyle } from 'react-native';

import { FREE_LEARNING_CASE_ID_SET, COMPLETE_LEARNING_CASE_COUNT, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { categories, techniqueById, theoryById, categoryMeta, techniqueCards, theories } from '@/data/catalog';
import { getHomeBrandContent, getHomeDayKey, resolveHomeTheoryMapLinks, type HomePersona, type HomeTheoryMapItem } from '@/data/home-brand-content';
import { getTheoryDisplayId } from '@/data/catalog';
import { useFeatures, type FeatureArticle } from '@/data/features';
import { featureImageAlt, featureImageSource } from '@/data/feature-images';
import type { TechniqueCard, TheoryCard } from '@/data/types';
import { COMPLETE_EDITION_PRICE_JPY } from '@/lib/purchase';
import { APP_ROUTES, featureRoute, personaRoute, techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';
import { learningCases } from '@/data/learning';
import { Rokumaru } from './rokumaru';
import { bookCardShadow } from './book-ui';
import { colors, fonts } from '@/constants/theme';
import { TechniqueTitle } from './technique-title';

const techniqueImage = require('../../assets/home/quiet-dialogue-hero.webp');
const personaImage = require('../../assets/home/persona-washi-portrait.webp');
const lineageImage = require('../../assets/home/theory-lineage-washi.webp');
const systemImage = require('../../assets/home/system-atlas-washi.webp');
const completeMark = require('../../assets/upgrade/complete-mark.png');

const HOME_REEL_ID = 'home-editorial-v4';
const HOME_REEL_SLIDE_COUNT = 4;
const featuredTechnique = techniqueCards.find((card) => card.title === '小さな頼み事で相手を巻き込む');
const secondTheory = theories.find((theory) => FREE_THEORY_IDS.includes(theory.tagId));
const homeReelPositions = new Map<string, number>();
const webTouchRailStyle = Platform.OS === 'web'
  ? ({ overscrollBehaviorX: 'contain', scrollSnapType: 'x mandatory', touchAction: 'pan-x pan-y' } as unknown as ViewStyle)
  : undefined;
const webTouchSlideStyle = Platform.OS === 'web'
  ? ({ scrollSnapAlign: 'start', scrollSnapStop: 'always' } as unknown as ViewStyle)
  : undefined;

function singleLineTitleSize(title: string, desktop: boolean, desktopBase: number, mobileBase: number, desktopCharacters: number, mobileCharacters: number) {
  const base = desktop ? desktopBase : mobileBase;
  const comfortableCharacters = desktop ? desktopCharacters : mobileCharacters;
  const minimum = desktop ? Math.min(13, desktopBase) : Math.min(7, mobileBase);
  return {
    fontSize: Math.max(minimum, Math.min(base, (base * comfortableCharacters) / Math.max(title.length, comfortableCharacters))),
    ...(Platform.OS === 'web' ? { overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' } : null),
  } as TextStyle;
}

function wrapHomeReelIndex(index: number) {
  return ((index % HOME_REEL_SLIDE_COUNT) + HOME_REEL_SLIDE_COUNT) % HOME_REEL_SLIDE_COUNT;
}

function HeroTitle({ title, desktop, mobileSize, style, testID }: { title: string; desktop: boolean; mobileSize: number; style: TextStyle[]; testID?: string }) {
  const [width, setWidth] = useState(0);
  // Keep complete titles readable: fit one line where possible, then allow
  // two lines rather than shrinking unusually long titles to tiny text.
  const characterWidth = [...title].reduce((sum, char) => sum + (/^[\x20-\x7e]$/.test(char) ? 0.55 : 1), 0);
  const size = width ? Math.max(14, Math.min(mobileSize, (width - characterWidth * 0.2) / Math.max(1, characterWidth))) : mobileSize;
  return <Text testID={testID} numberOfLines={desktop ? undefined : 2}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    style={[...style, !desktop && { fontSize: size, lineHeight: Math.ceil(size * 1.4), letterSpacing: 0.2, alignSelf: 'stretch' }]}>{title}</Text>;
}

function getTouchPoint(event: GestureResponderEvent) {
  const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
    changedTouches?: ArrayLike<{ pageX: number; pageY: number }>;
    touches?: ArrayLike<{ pageX: number; pageY: number }>;
  };
  const touch = nativeEvent.changedTouches?.[0] ?? nativeEvent.touches?.[0];
  return {
    x: touch?.pageX ?? nativeEvent.pageX,
    y: touch?.pageY ?? nativeEvent.pageY,
  };
}

function readHomeReelPosition(reelId: string) {
  const cached = homeReelPositions.get(reelId);
  if (typeof cached === 'number') return cached;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 0;
  try {
    const value = window.sessionStorage.getItem(`shoseijutsu-roku:home-reel:${reelId}`);
    const index = value ? Number(JSON.parse(value).index) : 0;
    return Number.isInteger(index) ? wrapHomeReelIndex(index) : 0;
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
  | 'question'
  | 'todayTechnique'
  | 'persona'
  | 'theory'
  | 'techniqueTheoryMap'
  | 'feature'
  | 'secondTechnique'
  | 'secondTheory';

type HomeHeroCarouselProps = {
  desktop: boolean;
  catalogRevision: number;
};

type SlideShellProps = {
  children: React.ReactNode;
  desktop: boolean;
  testID: string;
  tone?: 'paper' | 'dark' | 'navy';
  onPress: () => void;
  label: string;
};

function SlideShell({ children, desktop, testID, tone = 'paper', onPress, label }: SlideShellProps) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const draggedAt = useRef(0);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessible={Platform.OS === 'web' || testID !== 'home-brand-slide-4'}
      onTouchStart={(event) => { touch.current = getTouchPoint(event); }}
      onTouchMove={(event) => {
        const point = getTouchPoint(event);
        if (touch.current && Math.hypot(point.x - touch.current.x, point.y - touch.current.y) > 10) draggedAt.current = Date.now();
      }}
      onPress={() => { if (Date.now() - draggedAt.current > 500) onPress(); }}
      testID={testID}
      style={[
        styles.slide,
        !desktop && styles.slideMobile,
        tone === 'dark' && styles.slideDark,
        tone === 'navy' && styles.slideNavy,
      ]}
    >
      {children}
    </Pressable>
  );
}

// The whole slide owns the primary link; its CTA is a visual label.
function Cta({ label, dark = false, compact = false, centered = false, testID }: { label: string; dark?: boolean; compact?: boolean; centered?: boolean; testID?: string }) {
  return <View testID={testID} style={[styles.cta, compact && styles.ctaCompact, centered && styles.ctaCentered, dark && styles.ctaDark]}>
    <Text style={[styles.ctaText, compact && styles.ctaTextCompact, dark && styles.ctaTextDark]}>{label}</Text>
  </View>;
}

export function TechniqueHeroSlide({ card, desktop, slideIndex = 1 }: { card: TechniqueCard; desktop: boolean; slideIndex?: number }) {
  const router = useRouter();
  const second = slideIndex === 6;
  return (
    <SlideShell desktop={desktop} testID={`home-brand-slide-${slideIndex}`} tone="dark" label={`${card.title}を読む`} onPress={() => router.push(techniqueRoute(card.id))}>
      <Image source={techniqueImage} resizeMode="cover" accessibilityLabel="静かな部屋で、得意分野について相談する二人" style={styles.fullImage} />
      <View style={styles.techniqueShade} />
      <View style={[styles.techniqueCopy, desktop ? styles.techniqueCopyDesktop : styles.techniqueCopyMobile]}>
        <Text numberOfLines={1} style={[styles.darkEyebrow, !desktop && styles.darkEyebrowMobile]}>
          {second ? '処世術②' : '今日の一枚｜処世術'}｜{card.subcategory}
        </Text>
        <View style={[styles.techniqueTitleGroup, !desktop && styles.techniqueTitleGroupMobile]}>
          <TechniqueTitle
            title={card.title}
            minimumFontSize={14}
            testID={second ? 'home-brand-technique-title-2' : 'home-brand-technique-title'}
            style={[
              styles.darkTitle,
              ...(desktop ? [singleLineTitleSize(card.title, desktop, 39, 21, 10, 11)] : [styles.darkTitleMobile]),
            ]}
          />
          <View testID={second ? 'home-brand-technique-rule-2' : 'home-brand-technique-rule'} accessibilityElementsHidden style={styles.techniqueTitleRule} />
        </View>
        <Text numberOfLines={desktop ? undefined : 2} style={[styles.darkBody, !desktop && styles.darkBodyMobile]}>{card.essence}</Text>
        <View style={[styles.metaRow, !desktop && styles.metaRowMobile]}>
          <Text testID={second ? 'home-brand-technique-domain-2' : 'home-brand-technique-domain'} style={[styles.darkMeta, !desktop && styles.darkMetaMobile]}>{categoryMeta[card.categoryKey].label}</Text>
          <Cta label="読む →" dark compact={!desktop} testID={second ? 'home-brand-technique-cta-2' : 'home-brand-technique-cta'} />
        </View>
      </View>
    </SlideShell>
  );
}

export function PersonaHeroSlide({ persona, desktop }: { persona: HomePersona; desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-2" label={`${persona.name}の人物像を見る`} onPress={() => router.push(personaRoute(persona.categoryKey, persona.name))}>
      <Image source={personaImage} resizeMode="cover" accessibilityLabel="和紙と墨で描いた人物像の横顔" style={styles.fullImage} />
      <View style={[styles.paperCopy, !desktop && styles.paperCopyMobile]}>
        <Text testID="home-brand-persona-domain" style={styles.goldEyebrow}>人物像｜{persona.categoryName}</Text>
        <HeroTitle title={persona.name} desktop={desktop} mobileSize={20} style={[styles.paperTitle, ...(desktop ? [] : [styles.paperTitleMobile])]} />
        <Text style={[styles.personaDescription, !desktop && styles.personaDescriptionMobile]}>{persona.description}</Text>
        <View style={[styles.personaCountRow, !desktop && styles.personaCountRowMobile]}>
          <Text style={[styles.personaCount, !desktop && styles.personaCountMobile]}>{persona.techniqueCount}</Text>
          <Text style={styles.personaCountLabel}>処世術で構成</Text>
        </View>
        <Cta label="人物像を見る　→" compact={!desktop} testID="home-brand-persona-cta" />
      </View>
    </SlideShell>
  );
}

function firstDefinitionSentence(summary: string) {
  return summary.match(/^.*?。/u)?.[0] ?? summary;
}

export function TheoryHeroSlide({ theory, domainLabel, desktop, slideIndex = 3 }: { theory: TheoryCard; domainLabel: string; desktop: boolean; slideIndex?: number }) {
  const router = useRouter();
  const second = slideIndex === 7;
  return (
    <SlideShell desktop={desktop} testID={`home-brand-slide-${slideIndex}`} tone="navy" label={`${theory.title}の理論を見る`} onPress={() => router.push(theoryRoute(theory.tagId))}>
      <View style={styles.theoryFrame} />
      <View style={[styles.theoryCopy, !desktop && styles.theoryCopyMobile]}>
        <View style={styles.theoryMetaRow}>
          <View>
            <Text testID={second ? 'home-brand-theory-domain-2' : 'home-brand-theory-domain'} style={styles.darkEyebrow}>{second ? '理論②' : '理論'}｜{domainLabel}</Text>
            <Text style={styles.theoryCategory}>{theory.categoryTitle}</Text>
          </View>
          <Text style={styles.theoryId}>{getTheoryDisplayId(theory)}</Text>
        </View>
        <HeroTitle testID={second ? 'home-brand-theory-title-2' : undefined} title={theory.title} desktop={desktop} mobileSize={22} style={[styles.theoryTitle, ...(desktop ? [] : [styles.theoryTitleMobile])]} />
        <View style={[styles.theoryRule, !desktop && styles.theoryRuleMobile]}><View style={styles.theoryRuleLine} /><View style={styles.theoryRuleDiamond} /><View style={styles.theoryRuleLine} /></View>
        <Text testID="home-brand-theory-summary" numberOfLines={desktop ? 2 : 2} style={[styles.theorySummary, !desktop && styles.theorySummaryMobile]}>{firstDefinitionSentence(theory.summary)}</Text>
        <Cta label="理論を見る　→" dark compact={!desktop} centered testID={second ? 'home-brand-theory-cta-2' : 'home-brand-theory-cta'} />
      </View>
    </SlideShell>
  );
}

export function FeatureHeroSlide({ article, desktop, slideIndex }: { article: FeatureArticle | undefined; desktop: boolean; slideIndex: number }) {
  const router = useRouter();
  const label = article ? `${article.title}の特集を読む` : '特集一覧を見る';
  return (
    <SlideShell desktop={desktop} testID={`home-brand-slide-${slideIndex}`} tone="dark" label={label} onPress={() => router.push(article ? featureRoute(article.slug) : '/features')}>
      {article ? <Image source={featureImageSource(article)} resizeMode="cover" accessibilityLabel={featureImageAlt(article)} style={styles.fullImage} /> : null}
      <View accessibilityElementsHidden style={styles.featureShade} />
      <View style={[styles.featureCopy, !desktop && styles.featureCopyMobile]}>
        <Text style={[styles.darkEyebrow, !desktop && styles.darkEyebrowMobile]}>特集｜処世術禄の読みもの</Text>
        <HeroTitle title={article?.title ?? '知恵を、別の角度から。'} desktop={desktop} mobileSize={21} style={[styles.featureTitle, ...(!desktop ? [styles.featureTitleMobile] : [])]} />
        {article?.lead ? <Text numberOfLines={desktop ? 2 : 2} style={[styles.featureLead, !desktop && styles.featureLeadMobile]}>{article.lead}</Text> : <Text style={styles.featureLead}>処世術と理論をつなぐ特集を読む</Text>}
        <Cta label="特集を読む　→" dark compact={!desktop} testID={`home-brand-feature-cta-${slideIndex}`} />
      </View>
      {article ? <Text style={[styles.featureNumber, !desktop && styles.featureNumberMobile]}>特集</Text> : null}
    </SlideShell>
  );
}

function TheoryNode({ item, index, compact, onPress }: { item: HomeTheoryMapItem; index: number; compact: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${item.title}を開く`}
      testID={`home-brand-map-theory-${index + 1}`}
      onPress={(event) => { event.stopPropagation(); onPress(); }}
      style={({ pressed }) => [styles.theoryNode, compact && styles.theoryNodeMobile, pressed && styles.pressed]}
    >
      <View accessibilityElementsHidden style={[styles.theoryNodeEdge, compact && styles.theoryNodeEdgeMobile]} />
      <View accessibilityElementsHidden style={[styles.theoryNodeInnerFrame, compact && styles.theoryNodeInnerFrameMobile]} />
      <View style={styles.theoryNodeCopy}>
        <Text style={[styles.theoryNodeCategory, compact && styles.theoryNodeCategoryMobile]}>{item.categoryTitle}</Text>
        <Text
          numberOfLines={3}
          adjustsFontSizeToFit={false}
          minimumFontScale={0.4}
          style={[
            styles.theoryNodeTitle,
            compact && styles.theoryNodeTitleMobile,
            compact ? { fontSize: 12, lineHeight: 18 } : singleLineTitleSize(item.title, true, 17, 12, 13, 12),
          ]}
        >
          {item.title}
        </Text>
      </View>
    </Pressable>
  );
}

export function TechniqueTheoryMapSlide({ techniqueId, personaName, techniqueTitle, theories, desktop }: { techniqueId: string; personaName: string; techniqueTitle: string; theories: HomeTheoryMapItem[]; desktop: boolean }) {
  const router = useRouter();
  const techniqueDestination = FREE_REEL_TECHNIQUE_IDS.includes(techniqueId)
    ? techniqueRoute(techniqueId)
    : upgradeRoute('discover_technique');
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-4" label={`${techniqueTitle}を開く`} onPress={() => router.push(techniqueDestination)}>
      <Image source={lineageImage} resizeMode="cover" accessibilityLabel="和紙に細い金線で描いた知識の系譜" style={styles.fullImage} />
      <View accessibilityElementsHidden style={[styles.paperTextureWash, styles.mapTextureWash]} />
      <View style={[styles.mapContent, !desktop && styles.mapContentMobile]}>
        <View style={styles.mapHeadingGroup}>
          <Text style={[styles.mapHeading, !desktop && styles.mapHeadingMobile]}>ひとつの処世術を、複数の理論から読む</Text>
          <View accessibilityElementsHidden style={[styles.mapHeadingRule, !desktop && styles.mapHeadingRuleMobile]}>
            <View style={styles.mapHeadingRuleLine} />
          </View>
        </View>
        <View style={[styles.mapLayout, !desktop && styles.mapLayoutMobile]}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${techniqueTitle}を開く`}
            testID="home-brand-map-technique-cta"
            onPress={(event) => { event.stopPropagation(); router.push(techniqueDestination); }}
            style={({ pressed }) => [styles.mapTechnique, !desktop && styles.mapTechniqueMobile, pressed && styles.pressed]}
          >
            <View accessibilityElementsHidden style={[styles.mapTechniqueInnerFrame, !desktop && styles.mapTechniqueInnerFrameMobile]} />
            <Text style={styles.mapTechniqueLabel}>処世術</Text>
            <View style={[styles.mapPersonaRow, !desktop && styles.mapPersonaRowMobile]}>
              <Text accessibilityElementsHidden style={[styles.mapPersonaBullet, !desktop && styles.mapPersonaBulletMobile]}>•</Text>
              <Text testID="home-brand-map-persona" style={[styles.mapTechniquePersona, !desktop && styles.mapTechniquePersonaMobile]}>人物像｜{personaName}</Text>
            </View>
            <View accessibilityElementsHidden style={[styles.mapTechniqueRule, !desktop && styles.mapTechniqueRuleMobile]}>
              <View style={styles.mapTechniqueRuleLine} />
              <View style={styles.mapTechniqueRuleLine} />
            </View>
            <Text
              testID="home-brand-map-technique-title"
              numberOfLines={3}
              adjustsFontSizeToFit={false}
              minimumFontScale={0.4}
              style={[
                styles.mapTechniqueTitle,
                !desktop && styles.mapTechniqueTitleMobile,
                desktop ? singleLineTitleSize(techniqueTitle, true, 22, 14, 13, 13) : { fontSize: 14, lineHeight: 22 },
              ]}
            >
              {techniqueTitle}
            </Text>
            <View accessibilityElementsHidden style={[styles.mapTechniqueRule, styles.mapTechniqueRuleBottom, !desktop && styles.mapTechniqueRuleMobile]}>
              <View style={styles.mapTechniqueRuleLine} />
              <View style={styles.mapTechniqueRuleLine} />
            </View>
          </Pressable>
          <View testID="home-brand-map-connectors" accessibilityElementsHidden style={[styles.mapConnector, !desktop && styles.mapConnectorMobile]}>
            <View style={styles.mapConnectorRoot} />
            <View testID="home-brand-map-connector-spine" style={styles.mapConnectorSpine} />
            <View style={[styles.mapConnectorBranch, styles.mapConnectorBranch1]} />
            <View style={[styles.mapConnectorBranch, styles.mapConnectorBranch2]} />
            <View style={[styles.mapConnectorBranch, styles.mapConnectorBranch3]} />
            <View style={[styles.mapConnectorBranch, styles.mapConnectorBranch4]} />
          </View>
          <View style={[styles.theoryNodes, !desktop && styles.theoryNodesMobile]}>
            {theories.map((item, index) => <TheoryNode key={item.tagId} item={item} index={index} compact={!desktop} onPress={() => router.push(theoryRoute(item.tagId))} />)}
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
    <SlideShell desktop={desktop} testID="home-brand-slide-5" label="処世術禄の体系を見る" onPress={() => router.push(APP_ROUTES.personas)}>
      <Image source={systemImage} resizeMode="cover" accessibilityLabel="和紙に描かれた知識地図と山並み" style={styles.fullImage} />
      <View accessibilityElementsHidden style={styles.paperTextureWash} />
      <View style={[styles.systemContent, !desktop && styles.systemContentMobile]}>
        <Text style={[styles.systemTitle, !desktop && styles.systemTitleMobile]}>処世術禄の体系</Text>
        <Text style={[styles.systemLead, !desktop && styles.systemLeadMobile]}>人生をうまく生きる方法を、ひとつの体系に。</Text>
        <View style={[styles.systemStats, !desktop && styles.systemStatsMobile]}>
          {stats.map((stat, index) => (
            <View key={stat.label} testID={`home-brand-system-stat-${index + 1}`} style={[styles.systemStatFlow, !desktop && styles.systemStatFlowMobile]}>
              <View style={[styles.systemStatWrap, !desktop && styles.systemStatWrapMobile]}>
                <View style={[styles.systemStat, !desktop && styles.systemStatMobile, index === 2 && styles.systemStatGold, index === 3 && styles.systemStatDark]}>
                  <Text style={[styles.systemValue, !desktop && styles.systemValueMobile, index >= 2 && styles.systemValueReverse]}>{stat.value}</Text>
                  <Text style={[styles.systemLabel, !desktop && styles.systemLabelMobile, index >= 2 && styles.systemLabelReverse]}>{stat.label}</Text>
                </View>
                <Text style={[styles.systemNote, !desktop && styles.systemNoteMobile]}>{stat.note}</Text>
              </View>
              {index < stats.length - 1 ? <Text accessibilityElementsHidden style={[styles.systemArrow, !desktop && styles.systemArrowMobile]}>{index === 2 ? '↔' : '→'}</Text> : null}
            </View>
          ))}
        </View>
        <Cta label="体系を見る　→" compact={!desktop} centered={!desktop} testID="home-brand-system-cta" />
      </View>
    </SlideShell>
  );
}

export function PremiumHeroSlide({ desktop, counts }: { desktop: boolean; counts: { techniques: number; theories: number } }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-6" label="完全版を見る" onPress={() => router.push(upgradeRoute('home_carousel'))}>
      <View style={[styles.premiumOrnament, !desktop && styles.premiumOrnamentMobile]} />
      <View style={[styles.premiumContent, !desktop && styles.premiumContentMobile]}>
        <View style={styles.premiumCopy}>
          <Text style={[styles.goldEyebrow, !desktop && styles.goldEyebrowMobile]}>処世術禄　完全版</Text>
          <HeroTitle title="抜粋から、完全体系へ。" desktop={desktop} mobileSize={20} style={[styles.premiumTitle, ...(desktop ? [] : [styles.premiumTitleMobile])]} />
          <View style={[styles.premiumPriceRow, !desktop && styles.premiumPriceRowMobile]}>
          <Text style={[styles.premiumPrice, !desktop && styles.premiumPriceMobile]}>¥{COMPLETE_EDITION_PRICE_JPY}</Text>
            <View><Text style={[styles.premiumDuration, !desktop && styles.premiumDurationMobile]}>30日間</Text><Text style={[styles.premiumCondition, !desktop && styles.premiumConditionMobile]}>一回払い・自動更新なし</Text></View>
          </View>
          {desktop ? (
            <View style={styles.editionCompare}>
              <View><Text style={styles.editionLabel}>無料版・体系の抜粋</Text><Text style={styles.editionText}>処世術 {FREE_REEL_TECHNIQUE_IDS.length}件　理論 {FREE_THEORY_IDS.length}件</Text></View>
              <Text style={styles.editionArrow}>→</Text>
              <View><Text style={[styles.editionLabel, styles.editionLabelComplete]}>完全版・全体系</Text><Text style={styles.editionText}>{counts.techniques}処世術・{counts.theories}理論・全{COMPLETE_LEARNING_CASE_COUNT}ケース</Text></View>
            </View>
          ) : (
            <Text style={styles.premiumMobileSummary}>{counts.techniques}処世術・{counts.theories}理論・全{COMPLETE_LEARNING_CASE_COUNT}ケース</Text>
          )}
          <Cta label="完全版を見る　→" compact={!desktop} testID="home-brand-premium-cta" />
        </View>
        <View style={[styles.premiumMarkWrap, !desktop && styles.premiumMarkWrapMobile]}>
          <Image source={completeMark} resizeMode="contain" accessibilityLabel="処世術禄完全版の禄マーク" style={[styles.premiumMark, !desktop && styles.premiumMarkMobile]} />
        </View>
      </View>
    </SlideShell>
  );
}

export function RokumaruSlide({ desktop }: { desktop: boolean }) {
  const router = useRouter();
  return (
    <SlideShell desktop={desktop} testID="home-brand-slide-7" label="学ぶを開く" onPress={() => router.push(APP_ROUTES.learn)}>
      <View style={[styles.rokumaruHalo, !desktop && styles.rokumaruHaloMobile]} />
      <View style={[styles.rokumaruCopy, !desktop && styles.rokumaruCopyMobile]}>
        <Text style={styles.rokumaruEyebrow}>禄丸からひと言</Text>
        <HeroTitle title="焦らず、一歩ずつ。" desktop={desktop} mobileSize={23} style={[styles.rokumaruQuote, ...(desktop ? [] : [styles.rokumaruQuoteMobile])]} />
        <Text style={[styles.rokumaruMessage, !desktop && styles.rokumaruMessageMobile]}>今日の一枚も、立派な前進だよ。</Text>
      </View>
      <Rokumaru mood="encourage" testID="home-rokumaru" style={[styles.rokumaru, !desktop && styles.rokumaruMobile]} />
    </SlideShell>
  );
}

export function HomeHeroCarousel({ desktop, catalogRevision }: HomeHeroCarouselProps) {
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  const [foreground, setForeground] = useState(true);
  const [touching, setTouching] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoplayRevision, setAutoplayRevision] = useState(0);
  const [activeIndex, setActiveIndex] = useState(() => readHomeReelPosition(HOME_REEL_ID));
  const [viewportWidth, setViewportWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dayKey, setDayKey] = useState(() => getHomeDayKey());
  const { articles: featureArticles } = useFeatures();
  const railRef = useRef<ScrollView>(null);
  const activeIndexRef = useRef(activeIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const content = useMemo(() => getHomeBrandContent(), [catalogRevision, dayKey]);
  const homeFeatures = useMemo(() => [...featureArticles]
    .sort((left, right) => Number(right.is_featured) - Number(left.is_featured) || left.display_order - right.display_order || left.id.localeCompare(right.id))
    .slice(0, 3), [featureArticles]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const refreshDay = () => setDayKey((current) => {
      const next = getHomeDayKey();
      return next === current ? current : next;
    });
    const timer = setInterval(refreshDay, 60_000);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshDay);
    }
    return () => {
      clearInterval(timer);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshDay);
      }
    };
  }, []);

  const commitIndex = useCallback((index: number) => {
    const nextIndex = wrapHomeReelIndex(index);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    writeHomeReelPosition(HOME_REEL_ID, nextIndex);
    return nextIndex;
  }, []);

  const moveTo = useCallback((index: number, animated = true) => {
    setAutoplayRevision((revision) => revision + 1);
    const nextIndex = commitIndex(index);
    const crossedEdge = index < 0 || index >= HOME_REEL_SLIDE_COUNT;
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
    programmaticScrollTimerRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
      programmaticScrollTimerRef.current = null;
    }, 500);
    railRef.current?.scrollTo({ x: nextIndex * viewportWidth, animated: animated && !reduceMotion && !crossedEdge });
  }, [commitIndex, reduceMotion, viewportWidth]);

  const settleAtOffset = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticScrollRef.current) {
      programmaticScrollRef.current = false;
      if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = null;
      return;
    }
    if (!viewportWidth) return;
    const rawIndex = event.nativeEvent.contentOffset.x / viewportWidth;
    commitIndex(Math.max(0, Math.min(HOME_REEL_SLIDE_COUNT - 1, Math.round(rawIndex))));
  }, [commitIndex, viewportWidth]);

  const syncIndicatorWithOffset = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticScrollRef.current) return;
    if (!viewportWidth) return;
    const rawIndex = event.nativeEvent.contentOffset.x / viewportWidth;
    const nextIndex = Math.max(0, Math.min(HOME_REEL_SLIDE_COUNT - 1, Math.round(rawIndex)));
    if (nextIndex !== activeIndexRef.current) commitIndex(nextIndex);
  }, [commitIndex, viewportWidth]);

  const rememberTouchStart = useCallback((event: GestureResponderEvent) => {
    setTouching(true);
    touchStartRef.current = getTouchPoint(event);
  }, []);

  const wrapEdgeTouch = useCallback((event: GestureResponderEvent) => {
    setTouching(false);
    setAutoplayRevision((revision) => revision + 1);
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const end = getTouchPoint(event);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    if (activeIndexRef.current === 0 && deltaX > 0) moveTo(-1);
    if (activeIndexRef.current === HOME_REEL_SLIDE_COUNT - 1 && deltaX < 0) moveTo(HOME_REEL_SLIDE_COUNT);
  }, [moveTo]);

  useEffect(() => {
    writeHomeReelPosition(HOME_REEL_ID, activeIndexRef.current);
    return () => {
      if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!viewportWidth) return;
    railRef.current?.scrollTo({ x: activeIndexRef.current * viewportWidth, animated: false });
  }, [viewportWidth]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('[data-testid="home-brand-carousel"]')) return;
      if (event.key === 'ArrowLeft') moveTo(activeIndexRef.current - 1);
      if (event.key === 'ArrowRight') moveTo(activeIndexRef.current + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveTo]);

  useEffect(() => {
    const sync = () => setForeground(AppState.currentState === 'active'
      && (Platform.OS !== 'web' || document.visibilityState !== 'hidden'));
    sync();
    const subscription = AppState.addEventListener('change', sync);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', sync);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  useEffect(() => {
    if (!focused || !foreground || touching || paused || reduceMotion || !viewportWidth) return;
    const timer = setTimeout(() => moveTo(activeIndexRef.current + 1), activeIndex === 3 ? 16_000 : 10_000);
    return () => clearTimeout(timer);
  }, [focused, foreground, touching, paused, reduceMotion, viewportWidth, activeIndex, autoplayRevision, moveTo]);

  const question = learningCases.filter(item => FREE_LEARNING_CASE_ID_SET.has(item.id))[dayKey % Math.max(1, learningCases.filter(item => FREE_LEARNING_CASE_ID_SET.has(item.id)).length)];
  const linked = techniqueById.get(content.techniqueTheoryMap.techniqueId);
  const linkedTheories = linked?.theoryTagIds?.map(id => theoryById.get(id)).filter(Boolean) ?? [];
  const personaExists = categories.some(category => category.key === content.persona.categoryKey && category.subcategories.some(persona => persona.name === content.persona.name));
  const feature = homeFeatures[0];
  const slides: Array<{ type: HomeHeroSlideType; node: React.ReactNode }> = [
    { type: 'feature', node: <EditorialBanner desktop={desktop} index={1} eyebrow="編集部の特集" title={feature?.title ?? 'ひとつの問いから、\n知恵をつなぐ。'} description={feature?.lead ?? '処世術と理論を、いつもと違う角度から。'} image={feature ? featureImageSource(feature) : require('../../assets/home/editorial-window-v1.webp')} label="特集を読む" onPress={() => router.push(feature ? featureRoute(feature.slug) : APP_ROUTES.features)} /> },
    { type: 'persona', node: <EditorialBanner desktop={desktop} index={2} eyebrow="注目の人物像" title={content.persona.name} description={content.persona.description} image={personaImage} label="人物像から知恵をひらく" onPress={() => router.push(personaExists ? personaRoute(content.persona.categoryKey, content.persona.name) : APP_ROUTES.personas)} /> },
    { type: 'techniqueTheoryMap', node: <EditorialBanner desktop={desktop} index={3} eyebrow="知識のつながり" title={linked?.title ?? '実践と理論。そのつながりを辿る。'} description={linkedTheories.length ? linkedTheories.slice(0, 2).map(item => item!.title).join(' × ') : '行動の奥にある仕組みを、関連する知識から読み解く。'} image={lineageImage} label="実践と理論をつなぐ" onPress={() => router.push(linked ? techniqueRoute(linked.id) : APP_ROUTES.discover)} /> },
    { type: 'question', node: <EditorialBanner desktop={desktop} index={4} eyebrow="今日の問い" title={question?.question ?? 'こんなとき、あなたならどうする？'} description={question?.situation ?? '身近な場面から、次の一手を考える。'} image={techniqueImage} label="ケースで考える" onPress={() => router.push(question ? { pathname: '/learn/[caseId]', params: { caseId: question.id } } : APP_ROUTES.learn)} /> },
  ];

  return (
    <View testID="home-brand-carousel" style={styles.carousel}>
      <View style={[styles.carouselRow, !desktop && styles.carouselRowMobile]}>
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
            pagingEnabled={Platform.OS !== 'web'}
            disableIntervalMomentum={Platform.OS !== 'web'}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={Platform.OS !== 'web' ? viewportWidth || undefined : undefined}
            style={webTouchRailStyle}
            testID="home-brand-viewport"
            accessibilityLabel="特集・人物像・知識のつながり・今日の問い"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={syncIndicatorWithOffset}
            onMomentumScrollEnd={settleAtOffset}
            onScrollEndDrag={settleAtOffset}
            onTouchStart={rememberTouchStart}
            onTouchEnd={wrapEdgeTouch}
            onTouchCancel={() => { touchStartRef.current = null; setTouching(false); setAutoplayRevision((revision) => revision + 1); }}
          >
            {viewportWidth ? slides.map((slide) => <View key={slide.type} style={[{ width: viewportWidth }, webTouchSlideStyle]}>{slide.node}</View>) : null}
          </ScrollView>
          <View pointerEvents="box-none" style={styles.dotsOverlay}>
            <Pressable accessibilityRole="button" accessibilityLabel={paused ? '自動切り替えを再開' : '自動切り替えを停止'} onPress={() => setPaused(value => !value)} style={styles.pause}><Text style={styles.pauseText}>{paused ? '再開' : '停止'}</Text></Pressable>
            <View testID="home-brand-indicators" accessibilityRole="tablist" style={styles.dots}>
              {slides.map((slide, index) => (
                <Pressable
                  key={slide.type}
                  accessibilityRole="tab"
                  accessibilityLabel={`${index + 1}枚目を表示`}
                  accessibilityState={{ selected: index === activeIndex }}
                  aria-selected={index === activeIndex}
                  hitSlop={{ top: 9, bottom: 9 }}
                  onPress={() => moveTo(index, false)}
                  style={styles.dotTouch}
                ><View testID="home-brand-indicator-dot" style={[styles.dot, index === activeIndex && styles.dotActive]} /></Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function EditorialBanner({ desktop, index, eyebrow, title, description, image, label, onPress }: {
  desktop: boolean; index: number; eyebrow: string; title: string; description: string;
  image: import('react-native').ImageSourcePropType; label: string; onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  const tablet = !desktop && width >= 600;
  const titleSize = desktop ? Math.max(36, Math.min(48, width * 0.033)) : Math.max(23, Math.min(36, width * 0.068));
  const touch = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  return <Pressable testID={`home-brand-slide-${index}`} accessibilityRole="link" accessibilityLabel={`${eyebrow}：${title}`} onPress={() => { if (!moved.current) onPress(); }}
    onTouchStart={event => { touch.current = getTouchPoint(event); moved.current = false; }} onTouchMove={event => { const point = getTouchPoint(event); if (touch.current && Math.hypot(point.x - touch.current.x, point.y - touch.current.y) > 10) moved.current = true; }}
    style={[styles.editorial, desktop && styles.editorialDesktop]}>
    <Image source={image} resizeMode="cover" style={styles.fullImage} />
    <View style={[styles.editorialShade, Platform.OS === 'web' && ({ backgroundImage: 'linear-gradient(90deg, rgba(12,14,12,.86) 0%, rgba(12,14,12,.55) 56%, rgba(12,14,12,.12) 100%)', backgroundColor: 'transparent' } as unknown as ViewStyle)]} />
    <View testID={`home-editorial-copy-${index}`} style={[styles.editorialCopy, narrow && styles.editorialCopyNarrow, tablet && styles.editorialCopyTablet, desktop && styles.editorialCopyDesktop]}>
      <Text style={[styles.editorialEyebrow, desktop && styles.editorialEyebrowDesktop]}>{eyebrow}</Text>
      <TechniqueTitle testID={`home-editorial-title-${index}`} title={title.replace(/\n/g, '')} minimumFontSize={titleSize * 0.9} maxLines={2}
        style={[styles.editorialTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.3) }]} />
      <Text numberOfLines={2} style={[styles.editorialDescription, narrow && styles.editorialDescriptionNarrow, tablet && styles.editorialDescriptionTablet, desktop && styles.editorialDescriptionDesktop]}>{description}</Text>
      <Text testID={`home-editorial-cta-${index}`} style={[styles.editorialCta, tablet && styles.editorialCtaTablet, desktop && styles.editorialCtaDesktop]}>{label} →</Text>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  editorial: { aspectRatio: 1.7, minHeight: 205, backgroundColor: '#282A26', overflow: 'hidden' },
  editorialDesktop: { height: 380, minHeight: 380, aspectRatio: undefined },
  editorialShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(12,14,12,.64)' },
  // Reserve the bottom strip for the pager; center the copy in the space above
  // it instead of leaving a short block pinned to the top of a large image.
  editorialCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 42, width: '100%' },
  editorialCopyNarrow: { paddingHorizontal: 16 },
  editorialCopyTablet: { paddingHorizontal: 36, paddingTop: 24, paddingBottom: 56, maxWidth: 720 },
  editorialCopyDesktop: { paddingHorizontal: 0, marginLeft: 52, paddingTop: 28, paddingBottom: 60, width: '68%', maxWidth: 860 },
  editorialEyebrow: { fontFamily: fonts.serif, fontSize: 11, lineHeight: 16, color: '#E9CF9A', letterSpacing: 1.1, marginBottom: 5 },
  editorialEyebrowDesktop: { fontSize: 13, lineHeight: 20, letterSpacing: 1.7, marginBottom: 10 },
  editorialTitle: { fontFamily: fonts.serif, fontWeight: '600', color: '#FFFDF6', letterSpacing: 0.3 },
  editorialDescription: { fontSize: 13, lineHeight: 20, color: '#E4E0D6', marginTop: 6 },
  editorialDescriptionNarrow: { fontSize: 12, lineHeight: 18 },
  editorialDescriptionTablet: { fontSize: 16, lineHeight: 26, marginTop: 12 },
  editorialDescriptionDesktop: { fontSize: 17, lineHeight: 27, marginTop: 14, maxWidth: 740 },
  editorialCta: { fontFamily: fonts.serif, color: '#E9CF9A', fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 8 },
  editorialCtaTablet: { fontSize: 15, lineHeight: 24, marginTop: 16 },
  editorialCtaDesktop: { fontSize: 15, lineHeight: 24, marginTop: 20 },
  carousel: { width: '100%' },
  carouselRow: { width: '100%', flexDirection: 'row', alignItems: 'center', position: 'relative' },
  carouselRowMobile: { gap: 0, position: 'relative' },
  viewport: { flex: 1, minWidth: 0, overflow: 'hidden' },
  slide: { backgroundColor: '#FCF8EF', minHeight: 380, overflow: 'hidden', position: 'relative' },
  slideMobile: { aspectRatio: 1.7, minHeight: 205 },
  slideDark: { backgroundColor: '#12110E', borderColor: '#3D321F' },
  slideNavy: { backgroundColor: '#07182D', borderColor: '#34435A' },
  fullImage: { height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  paperTextureWash: { backgroundColor: 'rgba(250,247,240,0.5)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  mapTextureWash: { backgroundColor: 'rgba(250,247,240,0.57)' },
  pressed: { opacity: 0.82 },
  cta: { alignItems: 'center', alignSelf: 'flex-start', borderColor: '#B98A31', borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginTop: 20, minHeight: 44, paddingHorizontal: 23 },
  ctaCompact: { marginTop: 8, minHeight: 34, paddingHorizontal: 17 },
  ctaCentered: { alignSelf: 'center' },
  ctaDark: { borderColor: '#C59A45' },
  ctaText: { color: '#80580E', fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', letterSpacing: 0.8 },
  ctaTextCompact: { fontSize: 12, letterSpacing: 0.5 },
  ctaTextDark: { color: '#E1BD68' },
  techniqueShade: { backgroundColor: 'rgba(6,5,4,0.15)', height: '100%', left: 0, position: 'absolute', top: 0, width: '100%' },
  featureShade: { backgroundColor: 'rgba(6,5,4,0.34)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  featureCopy: { backgroundColor: 'rgba(8,7,5,0.76)', borderBottomRightRadius: 150, borderTopRightRadius: 150, justifyContent: 'center', minHeight: 380, paddingHorizontal: 35, paddingVertical: 35, width: '64%', zIndex: 1 },
  featureCopyMobile: { backgroundColor: 'transparent', borderRadius: 0, flex: 1, minHeight: 205, paddingHorizontal: 20, paddingVertical: 13, width: '100%' },
  featureTitle: { color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 34, fontWeight: '700', lineHeight: 48, letterSpacing: 1.3, marginTop: 15 },
  featureTitleMobile: { fontSize: 21, lineHeight: 29, letterSpacing: 0.3, marginTop: 7 },
  featureLead: { color: '#F4EEDF', fontFamily: fonts.serif, fontSize: 15, lineHeight: 26, marginTop: 11, maxWidth: 620 },
  featureLeadMobile: { fontSize: 13, lineHeight: 21, marginTop: 6 },
  featureNumber: { bottom: 24, color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 14, letterSpacing: 2, position: 'absolute', right: 30, zIndex: 1 },
  featureNumberMobile: { display: 'none' },
  techniqueCopy: { justifyContent: 'center', minHeight: 520, paddingHorizontal: 35, paddingVertical: 42, zIndex: 1 },
  techniqueCopyDesktop: { backgroundColor: 'rgba(8,7,5,0.82)', borderBottomRightRadius: 170, borderTopRightRadius: 170, minHeight: 380, width: '58%' },
  techniqueCopyMobile: { flex: 1, minHeight: 205, paddingHorizontal: 20, paddingVertical: 14 },
  darkEyebrow: { color: '#D4A94E', fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.4 },
  darkEyebrowMobile: { fontSize: 11, letterSpacing: 0.5 },
  darkTitle: { color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 39, fontWeight: '600', letterSpacing: 2.4, lineHeight: 57, marginTop: 22 },
  darkTitleMobile: { fontSize: 20, fontWeight: '700', letterSpacing: 0.4, lineHeight: 26, marginTop: 5 },
  techniqueTitleGroup: { alignSelf: 'flex-start', maxWidth: 480 },
  techniqueTitleGroupMobile: { alignSelf: 'stretch', maxWidth: '100%' },
  techniqueTitleRule: { alignSelf: 'stretch', width: '100%', height: 1, marginTop: 7, marginBottom: 2, borderRadius: 1, backgroundColor: '#D2A64A' },
  darkBody: { color: '#DED5C7', fontFamily: fonts.serif, fontSize: 16, letterSpacing: 1, lineHeight: 29, marginTop: 15, maxWidth: 480 },
  darkBodyMobile: { color: '#D8CEBF', fontSize: 12, letterSpacing: 0.15, lineHeight: 17, marginTop: 6, maxWidth: 330 },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 5 },
  metaRowMobile: { flexWrap: 'nowrap', gap: 10, marginTop: 0 },
  darkMeta: { borderColor: '#A57B2D', borderRadius: 999, borderWidth: 1, color: '#E1BD68', fontFamily: fonts.serif, fontSize: 11, marginTop: 20, paddingHorizontal: 13, paddingVertical: 6 },
  darkMetaMobile: { marginTop: 5, paddingHorizontal: 10, paddingVertical: 3 },
  paperCopy: { justifyContent: 'center', minHeight: 380, paddingHorizontal: 40, paddingVertical: 32, width: '58%' },
  paperCopyMobile: { backgroundColor: 'rgba(252,248,239,0.84)', flex: 1, justifyContent: 'flex-end', minHeight: 178, paddingBottom: 10, paddingHorizontal: 28, paddingTop: 26, width: '100%' },
  goldEyebrow: { color: '#A77824', fontFamily: fonts.serif, fontSize: 13, letterSpacing: 1.4 },
  goldEyebrowMobile: { fontSize: 10, letterSpacing: 0.7, lineHeight: 14 },
  paperTitle: { color: '#171717', fontFamily: fonts.serif, fontSize: 37, letterSpacing: 2.2, lineHeight: 51, marginTop: 15 },
  paperTitleMobile: { fontSize: 20, letterSpacing: 0.8, lineHeight: 28, marginTop: 7 },
  personaDescription: { color: '#5E584F', fontFamily: fonts.serif, fontSize: 14, lineHeight: 25, marginTop: 8, maxWidth: 420 },
  personaDescriptionMobile: { fontSize: 12, lineHeight: 19, marginTop: 4, maxWidth: 300 },
  personaCountRow: { alignItems: 'baseline', flexDirection: 'row', gap: 7, marginTop: 12 },
  personaCountRowMobile: { marginTop: 5 },
  personaCount: { color: '#A77824', fontFamily: fonts.serif, fontSize: 34, lineHeight: 40 },
  personaCountMobile: { fontSize: 26, lineHeight: 31 },
  personaCountLabel: { color: '#6D6253', fontFamily: fonts.serif, fontSize: 12 },
  theoryFrame: { borderColor: 'rgba(197,154,69,0.55)', borderRadius: 14, borderWidth: 1, bottom: 10, left: 10, position: 'absolute', right: 10, top: 10 },
  theoryCopy: { alignSelf: 'center', justifyContent: 'center', maxWidth: 860, minHeight: 380, paddingHorizontal: 48, paddingVertical: 32, width: '100%' },
  theoryCopyMobile: { flex: 1, minHeight: 178, paddingHorizontal: 25, paddingVertical: 10 },
  theoryMetaRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  theoryCategory: { color: '#DDBD75', fontFamily: fonts.serif, fontSize: 12, marginTop: 7 },
  theoryId: { borderColor: '#A77D31', borderRadius: 999, borderWidth: 1, color: '#E1BD68', fontFamily: fonts.serif, fontSize: 12, paddingHorizontal: 15, paddingVertical: 7 },
  theoryTitle: { color: '#FFFDF6', fontFamily: fonts.serif, fontSize: 38, letterSpacing: 2, lineHeight: 53, marginTop: 24, textAlign: 'center' },
  theoryTitleMobile: { fontSize: 22, lineHeight: 28, marginTop: 5 },
  theoryRule: { alignItems: 'center', flexDirection: 'row', gap: 8, marginVertical: 9 },
  theoryRuleMobile: { marginVertical: 5 },
  theoryRuleLine: { backgroundColor: 'rgba(196,148,57,0.65)', flex: 1, height: 1 },
  theoryRuleDiamond: { backgroundColor: '#C69A46', height: 7, transform: [{ rotate: '45deg' }], width: 7 },
  theorySummary: { alignSelf: 'center', color: '#EDE8DD', fontFamily: fonts.serif, fontSize: 15, lineHeight: 28, maxWidth: 760, textAlign: 'center' },
  theorySummaryMobile: { fontSize: 12, letterSpacing: 0.1, lineHeight: 19, maxWidth: '100%', width: '100%' },
  mapContent: { minHeight: 380, paddingHorizontal: 48, paddingVertical: 17 },
  mapContentMobile: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 },
  mapHeadingGroup: { alignItems: 'center' },
  mapHeading: { color: '#72500E', fontFamily: fonts.serif, fontSize: 21, fontWeight: '600', letterSpacing: 1.65, lineHeight: 30, textAlign: 'center' },
  mapHeadingMobile: { fontSize: 13, letterSpacing: 0, lineHeight: 20 },
  mapHeadingRule: { alignItems: 'center', flexDirection: 'row', marginTop: 5, maxWidth: 540, width: '58%' },
  mapHeadingRuleMobile: { marginTop: 2, width: '56%' },
  mapHeadingRuleLine: { backgroundColor: 'rgba(155,108,23,0.4)', flex: 1, height: 1 },
  mapLayout: { alignItems: 'center', flex: 1, flexDirection: 'row', justifyContent: 'center', marginTop: 10, minHeight: 0, position: 'relative' },
  mapLayoutMobile: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 4, minHeight: 0 },
  mapTechnique: { alignItems: 'center', backgroundColor: '#0B1B2C', borderColor: '#B88A2A', borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', minHeight: 180, paddingHorizontal: 24, paddingVertical: 18, position: 'relative', width: '35%', zIndex: 2, ...bookCardShadow },
  mapTechniqueMobile: { alignSelf: 'stretch', borderRadius: 11, minHeight: 0, paddingHorizontal: 7, paddingVertical: 7, width: '36%' },
  mapTechniqueInnerFrame: { borderColor: 'rgba(218,181,101,0.55)', borderRadius: 13, borderWidth: 1, bottom: 6, left: 6, position: 'absolute', right: 6, top: 6 },
  mapTechniqueInnerFrameMobile: { borderRadius: 8, bottom: 3, left: 3, right: 3, top: 3 },
  mapTechniqueLabel: { color: '#DAB565', fontFamily: fonts.serif, fontSize: 13, fontWeight: '600', letterSpacing: 1.8 },
  mapPersonaRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 8 },
  mapPersonaRowMobile: { gap: 3, marginTop: 3 },
  mapPersonaBullet: { color: '#E0B85E', fontFamily: fonts.serif, fontSize: 15, lineHeight: 17 },
  mapPersonaBulletMobile: { fontSize: 8, lineHeight: 9 },
  mapTechniquePersona: { color: '#EEE1C4', fontFamily: fonts.serif, fontSize: 11, letterSpacing: 0.85, lineHeight: 17 },
  mapTechniquePersonaMobile: { fontSize: 12, letterSpacing: 0, lineHeight: 18 },
  mapTechniqueRule: { alignItems: 'center', flexDirection: 'row', marginTop: 10, width: '72%' },
  mapTechniqueRuleBottom: { marginTop: 13 },
  mapTechniqueRuleMobile: { marginTop: 5, width: '76%' },
  mapTechniqueRuleLine: { backgroundColor: 'rgba(218,181,101,0.52)', flex: 1, height: 1 },
  mapTechniqueTitle: { color: '#FFFDF7', fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', letterSpacing: 0.55, lineHeight: 33, marginTop: 13, maxWidth: '100%', textAlign: 'center' },
  mapTechniqueTitleMobile: { fontSize: 8.4, letterSpacing: 0, lineHeight: 12, marginTop: 6, width: '100%' },
  mapConnector: { alignSelf: 'stretch', position: 'relative', width: '11%' },
  mapConnectorMobile: { alignSelf: 'stretch', minHeight: 0, width: '9%' },
  mapConnectorRoot: { backgroundColor: 'rgba(152,105,20,0.34)', height: 1, left: 0, position: 'absolute', right: '54%', top: '50%' },
  mapConnectorSpine: { borderColor: 'rgba(152,105,20,0.3)', borderLeftWidth: 1, bottom: '12.5%', left: '46%', position: 'absolute', top: '12.5%' },
  mapConnectorBranch: { backgroundColor: 'rgba(152,105,20,0.3)', height: 1, left: '46%', position: 'absolute', right: 0 },
  mapConnectorBranch1: { top: '12.5%' },
  mapConnectorBranch2: { top: '37.5%' },
  mapConnectorBranch3: { top: '62.5%' },
  mapConnectorBranch4: { top: '87.5%' },
  theoryNodes: { alignSelf: 'stretch', justifyContent: 'space-around', width: '42%' },
  theoryNodesMobile: { alignSelf: 'stretch', flexGrow: 0, flexShrink: 0, justifyContent: 'space-around', width: '52%' },
  theoryNode: { backgroundColor: 'rgba(255,253,248,0.94)', borderColor: '#B88A2A', borderRadius: 12, borderWidth: 1.2, justifyContent: 'center', minHeight: 58, overflow: 'hidden', paddingHorizontal: 21, paddingVertical: 8, position: 'relative' },
  theoryNodeMobile: { borderRadius: 7, flexGrow: 0, minHeight: 0, paddingHorizontal: 8, paddingVertical: 3 },
  theoryNodeEdge: { backgroundColor: 'rgba(184,138,42,0.72)', bottom: 14, left: 0, position: 'absolute', top: 14, width: 2 },
  theoryNodeEdgeMobile: { bottom: 6, top: 6, width: 1 },
  theoryNodeInnerFrame: { borderColor: 'rgba(184,138,42,0.34)', borderRadius: 8, borderWidth: 1, bottom: 5, left: 5, position: 'absolute', right: 5, top: 5 },
  theoryNodeInnerFrameMobile: { borderRadius: 5, bottom: 2, left: 2, right: 2, top: 2 },
  theoryNodeCopy: { minWidth: 0 },
  theoryNodeCategory: { color: '#9A712B', fontFamily: fonts.serif, fontSize: 10, letterSpacing: 0.9 },
  theoryNodeCategoryMobile: { display: 'none' },
  theoryNodeTitle: { color: '#171A1E', fontFamily: fonts.serif, fontSize: 17, fontWeight: '500', lineHeight: 23, marginTop: 3 },
  theoryNodeTitleMobile: { fontSize: 9, lineHeight: 11, marginTop: 0 },
  systemContent: { alignItems: 'center', minHeight: 380, paddingHorizontal: 34, paddingVertical: 20 },
  systemContentMobile: { flex: 1, justifyContent: 'center', minHeight: 0, paddingHorizontal: 14, paddingTop: 4, paddingBottom: 30 },
  systemTitle: { color: '#1C1A17', fontFamily: fonts.serif, fontSize: 27, letterSpacing: 2, lineHeight: 38 },
  systemTitleMobile: { fontSize: 18, lineHeight: 23 },
  systemLead: { color: '#766B5A', fontFamily: fonts.serif, fontSize: 12, marginTop: 3 },
  systemLeadMobile: { fontSize: 9, lineHeight: 12, marginTop: 1, textAlign: 'center' },
  systemStats: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'center', marginTop: 30, width: '100%' },
  systemStatsMobile: { alignItems: 'flex-start', flexWrap: 'nowrap', justifyContent: 'center', marginTop: 6 },
  systemStatFlow: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  systemStatFlowMobile: { flex: 1, minWidth: 0 },
  systemStatWrap: { alignItems: 'center', flex: 1, minWidth: 0 },
  systemStatWrapMobile: { flex: 1, minWidth: 0 },
  systemStat: { alignItems: 'center', backgroundColor: 'rgba(255,253,248,0.82)', borderColor: '#CDB789', borderRadius: 58, borderWidth: 1, aspectRatio: 1, justifyContent: 'center', width: 116 },
  systemStatMobile: { borderRadius: 999, width: '100%', maxWidth: 56 },
  systemStatGold: { backgroundColor: '#B88A2A', borderColor: '#DAB967' },
  systemStatDark: { backgroundColor: '#171717', borderColor: '#B88A2A' },
  systemValue: { color: '#1B1A17', fontFamily: fonts.serif, fontSize: 31, lineHeight: 37 },
  systemValueMobile: { fontSize: 15, lineHeight: 18 },
  systemValueReverse: { color: '#FFF9ED' },
  systemLabel: { color: '#665A49', fontFamily: fonts.serif, fontSize: 12 },
  systemLabelMobile: { fontSize: 8 },
  systemLabelReverse: { color: '#F1D99F' },
  systemNote: { color: '#746A5B', fontFamily: fonts.serif, fontSize: 9, lineHeight: 14, marginTop: 9, minHeight: 28, paddingHorizontal: 3, textAlign: 'center', width: 116 },
  systemNoteMobile: { width: '100%', fontSize: 7, lineHeight: 10, marginTop: 4, minHeight: 20, paddingHorizontal: 0 },
  systemArrow: { color: '#B88A2A', flexShrink: 0, fontFamily: fonts.serif, fontSize: 23, marginHorizontal: 5, textAlign: 'center', width: 24 },
  systemArrowMobile: { fontSize: 13, marginHorizontal: 1, width: 10, alignSelf: 'flex-start', marginTop: 18 },
  premiumOrnament: { borderColor: 'rgba(184,138,42,0.26)', borderRadius: 300, borderWidth: 1, height: 360, position: 'absolute', right: 18, top: -72, width: 360 },
  premiumOrnamentMobile: { height: 188, right: 2, top: -12, width: 188 },
  premiumContent: { alignItems: 'center', flexDirection: 'row', minHeight: 380, paddingHorizontal: 48, paddingVertical: 26 },
  premiumContentMobile: { flex: 1, flexDirection: 'row', justifyContent: 'center', minHeight: 176, paddingHorizontal: 24, paddingVertical: 7 },
  premiumCopy: { flex: 1, minWidth: 0 },
  premiumTitle: { color: '#1A1815', fontFamily: fonts.serif, fontSize: 31, lineHeight: 43, marginTop: 11 },
  premiumTitleMobile: { fontSize: 18, lineHeight: 23, marginTop: 3 },
  premiumPriceRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 10 },
  premiumPriceRowMobile: { gap: 7, marginTop: 4 },
  premiumPrice: { color: '#B4770B', fontFamily: fonts.serif, fontSize: 44, lineHeight: 50 },
  premiumPriceMobile: { fontSize: 24, lineHeight: 28 },
  premiumDuration: { borderColor: '#C89434', borderRadius: 6, borderWidth: 1, color: '#8F641C', fontFamily: fonts.serif, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3 },
  premiumDurationMobile: { fontSize: 8, paddingHorizontal: 5, paddingVertical: 1 },
  premiumCondition: { color: '#776B5B', fontFamily: fonts.serif, fontSize: 9, marginTop: 4 },
  premiumConditionMobile: { fontSize: 7, marginTop: 2 },
  editionCompare: { alignItems: 'center', borderTopColor: '#D9C9AC', borderTopWidth: 1, flexDirection: 'row', gap: 13, marginTop: 15, paddingTop: 13 },
  editionLabel: { color: '#7C7163', fontFamily: fonts.serif, fontSize: 10 },
  editionLabelComplete: { color: '#A66C0C' },
  editionText: { color: '#302B24', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, marginTop: 2 },
  editionArrow: { color: '#B88A2A', fontFamily: fonts.serif, fontSize: 18 },
  premiumMobileSummary: { borderTopColor: '#D9C9AC', borderTopWidth: 1, color: '#5F5548', fontFamily: fonts.serif, fontSize: 8, lineHeight: 11, marginTop: 4, paddingTop: 3 },
  premiumMarkWrap: { alignItems: 'center', justifyContent: 'center', width: '33%' },
  premiumMarkWrapMobile: { height: '100%', width: '28%' },
  premiumMark: { height: 172, width: 172 },
  premiumMarkMobile: { height: 74, width: 74 },
  rokumaruHalo: { backgroundColor: 'rgba(201,153,55,0.13)', borderRadius: 190, height: 380, position: 'absolute', right: 25, top: 0, width: 380 },
  rokumaruHaloMobile: { borderRadius: 88, height: 176, right: 0, top: 0, width: 176 },
  rokumaruCopy: { justifyContent: 'center', minHeight: 380, paddingHorizontal: 52, width: '61%' },
  rokumaruCopyMobile: { flex: 1, justifyContent: 'flex-start', minHeight: 178, paddingLeft: 28, paddingRight: 0, paddingTop: 18, width: '60%', zIndex: 2 },
  rokumaruEyebrow: { color: '#6D5531', fontFamily: fonts.serif, fontSize: 14, letterSpacing: 1.2 },
  rokumaruQuote: { color: '#1B1916', fontFamily: fonts.serif, fontSize: 37, letterSpacing: 2, lineHeight: 53, marginTop: 20 },
  rokumaruQuoteMobile: { fontSize: 23, lineHeight: 32, marginTop: 11 },
  rokumaruMessage: { color: '#4E473E', fontFamily: fonts.serif, fontSize: 18, lineHeight: 31, marginTop: 7 },
  rokumaruMessageMobile: { fontSize: 12, lineHeight: 20, marginTop: 4, maxWidth: 112 },
  rokumaru: { bottom: 0, height: 380, position: 'absolute', right: 22, width: 380 },
  rokumaruMobile: { bottom: 0, height: 150, right: 0, width: 150 },
  pause: { position: 'absolute', right: 0, bottom: 0, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  pauseText: { color: '#FFFDF6', fontSize: 12, lineHeight: 18, backgroundColor: 'rgba(22,20,17,0.6)', borderRadius: 4, paddingHorizontal: 5 },
  dotsOverlay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', bottom: 4, left: 0, position: 'absolute', right: 0, zIndex: 3 },
  dots: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  dotTouch: { alignItems: 'center', height: 44, justifyContent: 'center', width: 32 },
  dot: { backgroundColor: '#E9E3D8', borderRadius: 2, height: 3, width: 3 },
  dotActive: { backgroundColor: '#D9AF60', width: 8 },
});
