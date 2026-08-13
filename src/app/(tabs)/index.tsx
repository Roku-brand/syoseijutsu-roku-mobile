import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AppText, SegmentedControl } from '@/components/ui';
import { BookScreen, SaveDiamondButton, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, getTheoryDisplayId, techniqueCards as catalogTechniqueCards, theories as catalogTheories } from '@/data/catalog';
import { getTechniqueCount } from '@/data/technique-counts';
import { getTheoryCoverSummary } from '@/data/theory-display';
import { FREE_THEORY_IDS, isFreePersona } from '@/access/access-config';
import { AccessBadge } from '@/components/access-badge';
import { useAccess } from '@/access/access-state';
import type { TechniqueCard, TheoryCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { useAppToast } from '@/components/app-toast';
import { useResponsiveLayout, type ViewportDensity } from '@/hooks/use-responsive-layout';
import { COMPLETE_EDITION_PRICE_JPY, formatRemainingAccess } from '@/lib/purchase';

type PersonaReelItem = {
  kind: 'persona';
  persona: Persona;
  reelKey: string;
};

type UpgradeReelItem = {
  kind: 'upgrade';
  reelKey: string;
};

type TheoryReelItem = {
  kind: 'theory';
  card: TheoryCard;
  reelKey: string;
};

type ReelItem = PersonaReelItem | TheoryReelItem | UpgradeReelItem;
type Persona = { id: string; title: string; subtitle: string; category: 'interpersonal' | 'work' | 'life'; principleIds: string[]; techniqueCount: number };

const CIRCULAR_REEL_COPIES = 5;
const CIRCULAR_REEL_CENTER_COPY = Math.floor(CIRCULAR_REEL_COPIES / 2);
let lastReelPosition: Record<'techniques' | 'theories', number> = { techniques: 0, theories: 0 };

const techniqueShortcuts = [
  { label: '対人術', key: 'interpersonal' },
  { label: '仕事術', key: 'work' },
  { label: '人生術', key: 'life' },
] as const;

const theoryShortcuts = [
  { label: '心理学', key: 'psychology' },
  { label: '行動科学', key: 'behavioral-science' },
  { label: '組織・経営', key: 'organization-management' },
  { label: '戦略', key: 'strategy' },
  { label: '古典', key: 'classics-thought' },
  { label: '名言', key: 'maxims-experience' },
] as const;

function splitReelTitle(value: string) {
  const title = value.replace(/\*\*/g, '').trim();
  const characters = [...title];
  if (characters.length <= 15) return title;

  const midpoint = characters.length / 2;
  const minimum = Math.floor(characters.length * 0.34);
  const maximum = Math.ceil(characters.length * 0.66);
  const candidates: { index: number; penalty: number }[] = [];

  characters.forEach((character, index) => {
    const breakIndex = index + 1;
    if (breakIndex < minimum || breakIndex > maximum) return;

    if ('、，。！？：・'.includes(character)) {
      candidates.push({ index: breakIndex, penalty: 0 });
      return;
    }

    if ('はがをにへでとも'.includes(character)) {
      candidates.push({ index: breakIndex, penalty: 2.5 });
    }
  });

  const bestBreak =
    candidates.sort(
      (a, b) =>
        Math.abs(a.index - midpoint) +
        a.penalty -
        (Math.abs(b.index - midpoint) + b.penalty),
    )[0]?.index ?? Math.round(midpoint);

  return `${characters.slice(0, bestBreak).join('')}\n${characters
    .slice(bestBreak)
    .join('')}`;
}

function getReelTitleMetrics(title: string, reelWidth: number, density: ViewportDensity) {
  const lines = splitReelTitle(title).split('\n');
  const longestLine = Math.max(...lines.map((line) => [...line].length));
  const compact = reelWidth < 420;
  const horizontalPadding = compact ? spacing.md : spacing.xl;
  const availableWidth = reelWidth - horizontalPadding * 2 - 8;
  const maximumSize = density === 'veryCompact' ? 27 : density === 'compact' ? 30 : compact ? 29 : 34;
  const minimumSize = compact ? 10 : 18;
  const fittedSize = Math.round(
    availableWidth / Math.max(longestLine, 1),
  );
  const fontSize = Math.max(
    minimumSize,
    Math.min(maximumSize, fittedSize),
  );

  return {
    displayTitle: lines.join('\n'),
    horizontalPadding,
    fontSize,
    lineHeight: Math.round(fontSize * 1.48),
    letterSpacing: compact ? 0 : 1.2,
  };
}

export default function MainScreen() {
  const router = useRouter();
  const { width, height, density, desktop, narrow, verticalPadding, sectionGap } = useResponsiveLayout();
  const showToast = useAppToast();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [reelType, setReelType] = useState<'techniques' | 'theories'>('techniques');
  const [activeIndex, setActiveIndex] = useState(lastReelPosition.techniques);
  const activeIndexRef = useRef(lastReelPosition.techniques);
  const physicalIndexRef = useRef(0);
  const latestScrollOffsetRef = useRef(0);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { savedIds, savedTheoryIds, toggleSaved, toggleSavedTheory } = useAppState();
  // Paid content arrives after the server has verified the entitlement.  The
  // catalogue module is intentionally hydrated in place, so this revision is
  // the signal that makes the reel rebuild from its initial preview cards to
  // the full current theory catalog.
  const { isPaid, accessInfo, catalogRevision } = useAccess();
  const personas = useMemo<Persona[]>(() => categories.flatMap((category) => category.subcategories.map((group) => {
    const ids = group.items.map((item) => item.id);
    const lead = group.items[0];
    return {
      id: `${category.key}-${group.name}`,
      title: group.name,
      subtitle: lead?.title ?? 'なりたい自分から、必要な処世術を選ぶ。',
      category: category.key,
      principleIds: ids,
      techniqueCount: getTechniqueCount(category.key, group.name, ids.length),
    };
  })), [isPaid]);
  const visiblePersonas = personas;
  const visibleTheoryCards = useMemo(
    () => isPaid
      ? [...catalogTheories].sort((left, right) => {
          const categoryOrder = [
            'psychology',
            'behavioral-science',
            'organization-management',
            'strategy',
            'classics-thought',
            'maxims-experience',
          ];
          const leftCategory = categoryOrder.indexOf(left.categoryId);
          const rightCategory = categoryOrder.indexOf(right.categoryId);
          return (leftCategory === -1 ? categoryOrder.length : leftCategory)
            - (rightCategory === -1 ? categoryOrder.length : rightCategory);
        })
      : FREE_THEORY_IDS
          .map((id) => catalogTheories.find((card) => card.tagId === id))
          .filter((card): card is TheoryCard => Boolean(card)),
    [isPaid, catalogRevision],
  );

  const compactReel = !desktop && width < 520;
  const idealCardHeight = desktop
    ? isPaid ? 360 : 390
    : isPaid
      // 通常のiPhoneでは、リールを画面の主役として十分な高さにする。
      // これにより下部ショートカットの後ろに目的のない余白が残らず、
      // 画面をスクロールさせずに自然な密度で収まる。
      ? density === 'veryCompact' ? 218 : density === 'compact' ? 258 : 340
      : density === 'veryCompact' ? 228 : density === 'compact' ? 266 : 330;
  const cardHeight = Math.max(
    isPaid ? 206 : 216,
    // Reserve only the controls that are actually below the reel.  On a
    // normal iPhone this lets the home card use the available screen instead
    // of leaving a blank band above the persistent navigation.
    Math.min(idealCardHeight, height - (desktop ? (isPaid ? 380 : 350) : (isPaid ? 388 : 368))),
  );
  const reelPeek = desktop ? 30 : density === 'veryCompact' ? 12 : compactReel ? 18 : 30;
  const reelGap = desktop ? 14 : density === 'veryCompact' ? 8 : compactReel ? 10 : 14;
  const safeWidth = width || 390;
  const cardWidth = desktop
    ? Math.min(Math.max(safeWidth * 0.46, 420), 520)
    : Math.min(
        Math.max(safeWidth - (narrow ? spacing.sm : spacing.md) * 2 - reelPeek * 2, narrow ? 238 : 276),
        680,
      );
  const reelWidth = cardWidth + reelGap;
  const reelViewportWidth = Math.min(
    Math.max(safeWidth - (narrow ? spacing.sm : spacing.md) * 2, 1),
    cardWidth + reelPeek * 2,
  );
  const reelSideInset = Math.max(reelPeek - reelGap / 2, 0);
  const cardFrame = { paddingTop: density === 'veryCompact' ? 12 : density === 'compact' ? 17 : 22, paddingBottom: density === 'veryCompact' ? 10 : density === 'compact' ? 14 : 18 };
  const cardOrnament = { marginTop: density === 'veryCompact' ? 8 : density === 'compact' ? 10 : 14, marginBottom: density === 'veryCompact' ? 10 : density === 'compact' ? 14 : 20 };
  const categoryChip = { marginTop: density === 'veryCompact' ? 10 : density === 'compact' ? 14 : 20, minHeight: density === 'veryCompact' ? 28 : density === 'compact' ? 31 : 34 };
  const reelSaveButton = { bottom: density === 'veryCompact' ? 10 : density === 'compact' ? 15 : 22 };
  const baseReelItems = useMemo<ReelItem[]>(() => reelType === 'techniques'
    ? [
        ...visiblePersonas.map((persona) => ({ kind: 'persona' as const, persona, reelKey: `persona-${persona.id}` })),
        ...(!isPaid ? [{ kind: 'upgrade' as const, reelKey: 'upgrade' }] : []),
      ]
    : visibleTheoryCards.map((card) => ({ kind: 'theory' as const, card, reelKey: `theory-${card.tagId}` })),
  [isPaid, reelType, visiblePersonas, visibleTheoryCards]);
  // The circular reel contains several complete copies. It is reset to the
  // centre copy only after a swipe settles, so neither direction has an edge.
  const reelItems = useMemo<ReelItem[]>(() => {
    if (baseReelItems.length <= 1) return baseReelItems;
    return Array.from({ length: CIRCULAR_REEL_COPIES }, (_, loop) =>
      baseReelItems.map((item) => ({ ...item, reelKey: `loop-${loop}-${item.reelKey}` })),
    ).flat();
  }, [baseReelItems]);
  const activeItem = baseReelItems[activeIndex] ?? baseReelItems[0];
  const getCentralPhysicalIndex = (logicalIndex: number) =>
    baseReelItems.length > 1
      ? CIRCULAR_REEL_CENTER_COPY * baseReelItems.length + logicalIndex
      : logicalIndex;

  const scrollToPhysicalIndex = (index: number, animated: boolean) => {
    listRef.current?.scrollToOffset({
      offset: reelWidth * index,
      animated,
    });
  };

  useEffect(() => {
    const safeActiveIndex = Math.min(activeIndexRef.current, Math.max(baseReelItems.length - 1, 0));
    activeIndexRef.current = safeActiveIndex;
    if (safeActiveIndex !== activeIndex) setActiveIndex(safeActiveIndex);
    const physicalIndex = getCentralPhysicalIndex(safeActiveIndex);
    physicalIndexRef.current = physicalIndex;
    const frame = requestAnimationFrame(() => scrollToPhysicalIndex(physicalIndex, false));
    // React Native Web can finish laying out a virtualized horizontal list
    // after the first frame. A bounded retry keeps the first card visible and
    // then moves to the centre copy without gating the screen render.
    const retry = setTimeout(() => scrollToPhysicalIndex(physicalIndex, false), 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(retry);
    };
  }, [baseReelItems.length, reelType, reelWidth]);

  const moveTo = (index: number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(index, baseReelItems.length - 1));
    activeIndexRef.current = nextIndex;
    lastReelPosition[reelType] = nextIndex;
    setActiveIndex(nextIndex);
    const physicalIndex = getCentralPhysicalIndex(nextIndex);
    physicalIndexRef.current = physicalIndex;
    scrollToPhysicalIndex(physicalIndex, animated);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const switchReelType = (nextType: 'techniques' | 'theories') => {
    const nextIndex = lastReelPosition[nextType];
    setReelType(nextType);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  };

  const updateActiveCard = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    latestScrollOffsetRef.current = event.nativeEvent.contentOffset.x;
    if (baseReelItems.length <= 1) return;

    const physicalIndex = Math.round(event.nativeEvent.contentOffset.x / reelWidth);
    const nextIndex =
      baseReelItems.length > 1
        ? ((physicalIndex % baseReelItems.length) + baseReelItems.length) % baseReelItems.length
        : Math.max(0, Math.min(physicalIndex, baseReelItems.length - 1));

    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      lastReelPosition[reelType] = nextIndex;
      setActiveIndex(nextIndex);
    }
    physicalIndexRef.current = physicalIndex;
  };

  const clearScrollSettleTimer = () => {
    if (scrollSettleTimerRef.current) {
      clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
  };

  const snapToNearestCard = (offsetX: number, animated = true) => {
    if (baseReelItems.length <= 1) return;

    const cardCount = baseReelItems.length;
    const physicalIndex = Math.max(
      0,
      Math.min(Math.round(offsetX / reelWidth), reelItems.length - 1),
    );
    const logicalIndex = ((physicalIndex % cardCount) + cardCount) % cardCount;
    const targetOffset = physicalIndex * reelWidth;

    activeIndexRef.current = logicalIndex;
    lastReelPosition[reelType] = logicalIndex;
    setActiveIndex(logicalIndex);
    physicalIndexRef.current = physicalIndex;

    // Native's interval snap handles touch momentum. This explicit correction
    // also covers mouse/trackpad scrolling on web, where momentum can end
    // between two CSS snap points.
    if (Math.abs(offsetX - targetOffset) > 0.5) {
      scrollToPhysicalIndex(physicalIndex, animated);
    }
  };

  const scheduleNearestCardSnap = () => {
    clearScrollSettleTimer();
    scrollSettleTimerRef.current = setTimeout(() => {
      scrollSettleTimerRef.current = null;
      snapToNearestCard(latestScrollOffsetRef.current);
    }, 120);
  };

  const recenterReel = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (baseReelItems.length <= 1) return;

    clearScrollSettleTimer();
    const offsetX = event.nativeEvent.contentOffset.x;
    latestScrollOffsetRef.current = offsetX;
    const physicalIndex = Math.round(offsetX / reelWidth);
    const cardCount = baseReelItems.length;

    // Keep the user in the middle copy, after momentum has settled. Because
    // the destination contains the same card in the same visual position, the
    // jump is not perceptible.
    if (
      physicalIndex < cardCount * (CIRCULAR_REEL_CENTER_COPY - 1) ||
      physicalIndex >= cardCount * (CIRCULAR_REEL_CENTER_COPY + 2)
    ) {
      const centeredIndex = getCentralPhysicalIndex(
        ((physicalIndex % cardCount) + cardCount) % cardCount,
      );
      physicalIndexRef.current = centeredIndex;
      scrollToPhysicalIndex(centeredIndex, false);
    } else {
      snapToNearestCard(offsetX);
    }

    void Haptics.selectionAsync().catch(() => undefined);
  };

  useEffect(() => clearScrollSettleTimer, []);

  const jumpToTechniqueCategory = (categoryKey: (typeof techniqueShortcuts)[number]['key']) => {
    const targetIndex = visiblePersonas.findIndex((persona) => persona.category === categoryKey);
    if (targetIndex < 0) return;
    setReelType('techniques');
    activeIndexRef.current = targetIndex;
    lastReelPosition.techniques = targetIndex;
    setActiveIndex(targetIndex);
    if (reelType === 'techniques') {
      const physicalIndex = getCentralPhysicalIndex(targetIndex);
      physicalIndexRef.current = physicalIndex;
      scrollToPhysicalIndex(physicalIndex, true);
    }
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const jumpToTheoryCategory = (categoryId: (typeof theoryShortcuts)[number]['key']) => {
    const targetIndex = visibleTheoryCards.findIndex((card) => card.categoryId === categoryId);
    if (targetIndex < 0) return;
    setReelType('theories');
    activeIndexRef.current = targetIndex;
    lastReelPosition.theories = targetIndex;
    setActiveIndex(targetIndex);
    if (reelType === 'theories') {
      const physicalIndex = getCentralPhysicalIndex(targetIndex);
      physicalIndexRef.current = physicalIndex;
      scrollToPhysicalIndex(physicalIndex, true);
    }
    void Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <BookScreen scroll={false} contentContainerStyle={[styles.content, { paddingTop: verticalPadding, paddingBottom: verticalPadding }]}>
      {isPaid && accessInfo.accessType === 'thirty_day' ? <View style={styles.accessBadge}><AppText style={styles.accessBadgeLabel}>完全版</AppText><AppText style={styles.accessBadgeRemaining}>{formatRemainingAccess(accessInfo.accessExpiresAt)}</AppText></View> : null}
      <View style={styles.reelHeadingRow}>
        <View><AppText style={styles.reelHeading}>{reelType === 'techniques' ? '処世術' : '理論'}</AppText><View style={styles.reelHeadingUnderline} /></View>
        <View style={styles.personaCountPill}><AppText style={styles.personaCountIcon}>♙</AppText><AppText style={styles.personaCountText}>{reelType === 'techniques' ? `人物像 ${String(activeIndex + 1).padStart(2, '0')} / ${String(personas.length).padStart(2, '0')}` : `理論 ${String(activeIndex + 1).padStart(2, '0')} / ${String(baseReelItems.length).padStart(2, '0')}`}</AppText></View>
      </View>
      <SegmentedControl
        value={reelType}
        options={[
          { value: 'techniques', label: '処世術' },
          { value: 'theories', label: '理論' },
        ] as const}
        onChange={switchReelType}
      />
      <FlatList
        ref={listRef}
        horizontal
        snapToInterval={reelWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        showsHorizontalScrollIndicator={false}
        data={reelItems}
        keyExtractor={(item) => item.reelKey}
        getItemLayout={(_, index) => ({
          index,
          length: reelWidth,
          offset: reelWidth * index,
        })}
        initialNumToRender={5}
        windowSize={7}
        onScroll={(event) => {
          updateActiveCard(event);
          scheduleNearestCardSnap();
        }}
        onScrollBeginDrag={clearScrollSettleTimer}
        onScrollEndDrag={scheduleNearestCardSnap}
        onMomentumScrollEnd={recenterReel}
        onContentSizeChange={() => {
          requestAnimationFrame(() => {
            scrollToPhysicalIndex(getCentralPhysicalIndex(activeIndexRef.current), false);
          });
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: reelSideInset }}
        style={[styles.reel, { width: reelViewportWidth, marginTop: sectionGap }]}
        renderItem={({ item: reelItem }) => {
          if (reelItem.kind === 'upgrade') {
            return (
              <View style={[styles.reelItem, { width: reelWidth }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="処世術禄 完全版を購入する"
                  onPress={() => router.push({ pathname: '/upgrade', params: { source: 'reel-card' } })}
                  style={({ pressed }) => [
                    styles.upgradeReelCard,
                    { width: cardWidth, height: cardHeight, marginHorizontal: reelGap / 2 },
                    cardFrame,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="label" style={styles.upgradeReelEyebrow}>COMPLETE EDITION</AppText>
                  <AppText variant="serif" style={styles.upgradeReelTitle}>ここから先は、{`\n`}完全版。</AppText>
                  <View style={[styles.cardOrnament, cardOrnament]}>
                    <View style={styles.upgradeCardLine} />
                    <View style={styles.cardDiamond} />
                    <View style={styles.upgradeCardLine} />
                  </View>
                  <AppText style={styles.upgradeReelBody}>すべての処世術と理論を、{`\n`}あなたの手元へ。</AppText>
                  <View style={styles.upgradeCta}>
                    <AppText style={styles.upgradeCtaText}>¥{COMPLETE_EDITION_PRICE_JPY}で30日間利用　›</AppText>
                  </View>
                </Pressable>
              </View>
            );
          }

          if (reelItem.kind === 'theory') {
            const theory = reelItem.card;
            const theorySaved = savedTheoryIds.includes(theory.tagId);
            const isAccessible = reelItem.reelKey === `loop-${CIRCULAR_REEL_CENTER_COPY}-theory-${theory.tagId}`;
            return (
              <View accessibilityElementsHidden={!isAccessible} importantForAccessibility={isAccessible ? 'yes' : 'no-hide-descendants'} aria-hidden={!isAccessible} style={[styles.reelItem, { width: reelWidth }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${theory.title}を詳しく読む`} onPress={() => router.push({ pathname: '/theory/[id]', params: { id: theory.tagId, reelIndex: String(activeIndexRef.current) } })} style={({ pressed }) => [styles.techniqueCard, styles.theoryCard, cardFrame, { width: cardWidth, height: cardHeight, marginHorizontal: reelGap / 2 }, pressed && styles.pressed]}>
                  <AppText variant="label" style={styles.techniqueId}>{getTheoryDisplayId(theory)}</AppText>
                  <AppText numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.58} style={[styles.techniqueTitle, { fontSize: getReelTitleMetrics(theory.title, cardWidth, density).fontSize, lineHeight: getReelTitleMetrics(theory.title, cardWidth, density).lineHeight }]}>{getReelTitleMetrics(theory.title, cardWidth, density).displayTitle}</AppText>
                  <View style={[styles.cardOrnament, cardOrnament]}><View style={styles.cardLine} /><View style={styles.cardDiamond} /><View style={styles.cardLine} /></View>
                  <View style={[styles.categoryChip, categoryChip]}><AppText style={styles.categoryChipText}>〔 {theory.categoryTitle} 〕</AppText></View>
                  <AppText numberOfLines={density === 'veryCompact' ? 2 : 3} style={[styles.theorySummary, density !== 'normal' && styles.theorySummaryCompact]}>{getTheoryCoverSummary(theory.summary, theory.definition ?? '社会を生きるための知恵を、理論から読み解く。')}</AppText>
                </Pressable>
                <View style={[styles.reelSaveButton, reelSaveButton]}>
                  <SaveDiamondButton
                    saved={theorySaved}
                    compact
                    onPress={() => {
                      toggleSavedTheory(theory.tagId);
                      showToast(theorySaved ? '蔵書から外しました' : '蔵書に保存しました');
                    }}
                  />
                </View>
              </View>
            );
          }

          const persona = reelItem.persona;
          const personaLocked = !isPaid && !isFreePersona(persona.title);
          const titleMetrics = getReelTitleMetrics(persona.title, cardWidth, density);
          const isAccessible =
            reelItem.reelKey === `loop-${CIRCULAR_REEL_CENTER_COPY}-persona-${persona.id}`;
          return (
            <View
              accessibilityElementsHidden={!isAccessible}
              importantForAccessibility={
                isAccessible ? 'yes' : 'no-hide-descendants'
              }
              aria-hidden={!isAccessible}
              style={[styles.reelItem, { width: reelWidth }]}
            >
              <View
                style={[
                  styles.techniqueCard,
                  {
                    width: cardWidth,
                    height: cardHeight,
                    marginHorizontal: reelGap / 2,
                    paddingHorizontal: titleMetrics.horizontalPadding,
                  },
                  cardFrame,
                ]}
              >
                <View pointerEvents="none" style={styles.personaCornerTopLeft} />
                <View pointerEvents="none" style={styles.personaCornerTopRight} />
                <View pointerEvents="none" style={styles.personaCornerBottomLeft} />
                <View pointerEvents="none" style={styles.personaCornerBottomRight} />
                <View pointerEvents="none" style={styles.personaAccessBadge}>
                  <AccessBadge locked={personaLocked} compact />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${persona.title}${personaLocked ? '、完全版限定' : '、無料公開'}を詳しく見る`}
                  onPress={() => router.push({ pathname: '/subcategory/[category]/[name]', params: { category: persona.category, name: persona.title } })}
                  style={({ pressed }) => [styles.cardReadArea, pressed && styles.pressed]}
                >
                  <AppText variant="label" style={styles.techniqueId}>✦ {persona.category === 'interpersonal' ? '対人術' : persona.category === 'work' ? '仕事術' : '人生術'}</AppText>
                  <AppText
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.58}
                    style={[
                      styles.techniqueTitle,
                      {
                        fontSize: titleMetrics.fontSize,
                        lineHeight: titleMetrics.lineHeight,
                        letterSpacing: titleMetrics.letterSpacing,
                      },
                    ]}
                  >
                    {titleMetrics.displayTitle}
                  </AppText>
                  <View style={[styles.cardOrnament, cardOrnament]}>
                    <View style={styles.cardLine} />
                    <View style={styles.cardDiamond} />
                    <View style={styles.cardLine} />
                  </View>
                  <AppText numberOfLines={2} style={styles.personaSubtitle}>{persona.subtitle}</AppText>
                  <View style={styles.personaCta}><AppText style={styles.personaCtaText}>{persona.techniqueCount}つの処世術を見る</AppText><AppText style={styles.personaCtaChevron}>›</AppText></View>
                </Pressable>
            </View>
            </View>
          );
        }}
      />
      {!isPaid ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="処世術禄 完全版を購入する"
          onPress={() => router.push({ pathname: '/upgrade', params: { source: 'home' } })}
          style={({ pressed }) => [styles.unlockCard, density !== 'normal' && styles.unlockCardCompact, pressed && styles.pressed]}
        >
          <View style={styles.unlockCrown}><AppText style={styles.unlockCrownText}>♛</AppText></View>
          <View style={styles.unlockCopy}>
            <AppText style={styles.unlockTitle}>完全版を30日間利用　¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
            <AppText style={styles.unlockBody}>自動更新なし・{catalogTechniqueCards.length}の処世術と{catalogTheories.length}の理論</AppText>
          </View>
          <AppText style={styles.unlockChevron}>›</AppText>
        </Pressable>
      ) : null}
      <View style={styles.shortcuts}>
          {reelType === 'techniques' ? (
            <View style={styles.shortcutSection}>
              <View style={styles.shortcutSectionHeader}>
                <View style={styles.shortcutSectionRule} />
                <AppText style={styles.shortcutHeading}>なりたい自分から選ぶ</AppText>
              </View>
              <View style={styles.techniqueShortcutGrid}>
                {techniqueShortcuts.map((shortcut) => (
                  <Pressable
                    key={shortcut.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${shortcut.label}の先頭の処世術へ移動`}
                    onPress={() => jumpToTechniqueCategory(shortcut.key)}
                    style={({ pressed }) => [styles.techniqueShortcut, pressed && styles.pressed]}
                  >
                    <AppText style={styles.techniqueShortcutMark}>{shortcut.key === 'interpersonal' ? '♟' : shortcut.key === 'work' ? '▣' : '⚑'}</AppText>
                    <View style={styles.shortcutCopy}><AppText style={styles.techniqueShortcutText}>{shortcut.label}</AppText><AppText style={styles.techniqueShortcutSub}>{shortcut.key === 'interpersonal' ? '人間関係を築く' : shortcut.key === 'work' ? '成果と評価を得る' : '自分らしく生きる'}</AppText></View>
                    <AppText style={styles.shortcutChevron}>›</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.shortcutSection}>
              <View style={styles.shortcutSectionHeader}>
                <View style={styles.shortcutSectionRule} />
                <AppText style={styles.shortcutHeading}>理論から選ぶ</AppText>
                <AppText style={styles.shortcutSectionHint}>知識の入口</AppText>
              </View>
              <View style={styles.theoryShortcutGrid}>
                {theoryShortcuts.map((shortcut) => (
                  <Pressable
                    key={shortcut.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${shortcut.label}の先頭の理論へ移動`}
                    onPress={() => jumpToTheoryCategory(shortcut.key)}
                    style={({ pressed }) => [styles.theoryShortcut, pressed && styles.pressed]}
                  >
                    <AppText style={styles.theoryShortcutMark}>{shortcut.label.slice(0, 1)}</AppText>
                    <AppText numberOfLines={1} style={styles.theoryShortcutText}>{shortcut.label}</AppText>
                    <AppText style={styles.theoryShortcutArrow}>↗</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  reelHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  reelHeading: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: 1.4 },
  reelHeadingUnderline: { marginTop: 5, width: 54, height: 2, borderRadius: 2, backgroundColor: colors.gold },
  personaCountPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, height: 32, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FBF8F1' },
  personaCountIcon: { color: colors.ink, fontSize: 16, lineHeight: 18 },
  personaCountText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  accessBadge: { position: 'absolute', right: 0, top: 0, zIndex: 2, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: '#C7A55B', borderRadius: 999, backgroundColor: '#F4EEE2' },
  accessBadgeLabel: { color: '#7D5A1D', fontSize: 9, lineHeight: 14, fontWeight: '700' },
  accessBadgeRemaining: { color: colors.ink, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  catalogCount: { marginBottom: 6, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  catalogDivider: { color: colors.gold },
  reel: { alignSelf: 'center', flexGrow: 0, marginTop: spacing.sm },
  reelItem: { paddingVertical: 2 },
  techniqueCard: {
    position: 'relative',
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.charcoal,
    alignItems: 'stretch',
    ...bookCardShadow,
  },
  // 金箔を抽象化した細い曲線。カードの文字と競合しないよう四隅だけに留める。
  personaCornerTopLeft: { position: 'absolute', top: 13, left: 13, width: 54, height: 30, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(226, 194, 113, 0.54)', borderTopLeftRadius: 24, opacity: 0.72 },
  personaCornerTopRight: { position: 'absolute', top: 13, right: 13, width: 54, height: 30, borderTopWidth: 1, borderRightWidth: 1, borderColor: 'rgba(226, 194, 113, 0.54)', borderTopRightRadius: 24, opacity: 0.72 },
  personaCornerBottomLeft: { position: 'absolute', bottom: 13, left: 13, width: 54, height: 30, borderBottomWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(226, 194, 113, 0.38)', borderBottomLeftRadius: 24, opacity: 0.62 },
  personaCornerBottomRight: { position: 'absolute', bottom: 13, right: 13, width: 54, height: 30, borderBottomWidth: 1, borderRightWidth: 1, borderColor: 'rgba(226, 194, 113, 0.38)', borderBottomRightRadius: 24, opacity: 0.62 },
  theoryCard: {
    paddingHorizontal: spacing.lg,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theorySummary: {
    width: '100%',
    marginTop: 18,
    color: '#DED8CC',
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  personaSubtitle: { marginTop: 3, color: '#D9D4C8', fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  personaAccessBadge: { position: 'absolute', top: 14, right: 14, zIndex: 3 },
  theorySummaryCompact: { marginTop: 10, fontSize: 12, lineHeight: 18 },
  cardReadArea: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', paddingBottom: 3 },
  upgradeReelCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#CDA74F',
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    ...bookCardShadow,
  },
  upgradeReelEyebrow: {
    color: colors.goldLight,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 2.1,
  },
  upgradeReelTitle: {
    marginTop: 12,
    color: '#FFF9EC',
    fontSize: 25,
    lineHeight: 37,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  upgradeCardLine: { flex: 1, height: 1, backgroundColor: 'rgba(238,214,155,0.6)' },
  upgradeReelBody: {
    color: '#E4DDD1',
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  upgradeCta: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
  },
  upgradeCtaText: { color: '#FFFDF8', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  techniqueTitle: {
    width: '100%',
    fontFamily: fonts.serif,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.surface,
  },
  techniqueId: {
    marginBottom: 14,
    color: colors.gold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.3,
  },
  cardOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '76%',
    gap: 8,
    marginTop: 14,
    marginBottom: 20,
  },
  cardLine: { flex: 1, height: 1, backgroundColor: colors.goldLight },
  cardDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  categoryChip: {
    marginTop: 20,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(196,148,50,0.55)',
    backgroundColor: 'rgba(184,138,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personaCta: { marginTop: 18, minWidth: '72%', height: 45, paddingHorizontal: 17, borderRadius: 24, borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(84,61,22,0.35)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  personaCtaText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700', letterSpacing: .5 },
  personaCtaChevron: { color: colors.goldLight, fontSize: 25, lineHeight: 26 },
  categoryChipText: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.2,
    color: colors.goldLight,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(196,148,50,0.7)',
    backgroundColor: 'rgba(24,24,23,0.88)',
  },
  saveButtonSaved: { backgroundColor: colors.gold },
  // カード中央下の意匠を、そのまま蔵書保存の操作に置き換える。
  reelSaveButton: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  bookmark: { color: colors.goldLight, fontSize: 20, lineHeight: 24 },
  saveTextSaved: { color: colors.surface },
  unlockCard: { minHeight: 72, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, ...bookCardShadow },
  unlockCardCompact: { minHeight: 64, marginTop: 5, paddingHorizontal: 12, gap: 10 },
  unlockCrown: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  unlockCrownText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 23, lineHeight: 27 },
  unlockCopy: { flex: 1, minWidth: 0 },
  unlockTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  unlockBody: { marginTop: 2, color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  unlockChevron: { color: colors.ink, fontSize: 30, lineHeight: 34 },
  shortcuts: { marginTop: 12, gap: 10, paddingHorizontal: 2 },
  shortcutSection: { gap: 6 },
  shortcutSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  shortcutSectionRule: { width: 3, height: 15, borderRadius: 2, backgroundColor: colors.gold },
  shortcutHeading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 16, letterSpacing: 1, fontWeight: '700' },
  shortcutSectionHint: { marginLeft: 'auto', color: colors.muted, fontSize: 9, lineHeight: 14, letterSpacing: 0.8 },
  techniqueShortcutGrid: { flexDirection: 'row', gap: 8 },
  techniqueShortcut: { flex: 1, minWidth: 0, height: 86, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: '#FCF9F3', flexDirection: 'row', alignItems: 'center', gap: 5, ...bookCardShadow },
  techniqueShortcutMark: { width: 22, color: colors.gold, fontFamily: fonts.serif, fontSize: 21, lineHeight: 25, textAlign: 'center' },
  shortcutCopy: { flex: 1, minWidth: 0 },
  techniqueShortcutText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  techniqueShortcutSub: { marginTop: 3, color: colors.muted, fontSize: 8, lineHeight: 12 },
  shortcutChevron: { color: colors.gold, fontSize: 21, lineHeight: 23 },
  theoryShortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  theoryShortcut: { width: '31.8%', height: 37, paddingHorizontal: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 5 },
  theoryShortcutMark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  theoryShortcutText: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  theoryShortcutArrow: { color: colors.muted, fontSize: 12, lineHeight: 15 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
});
