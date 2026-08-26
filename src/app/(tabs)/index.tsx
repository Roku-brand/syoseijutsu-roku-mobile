import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
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
  const reelScrollX = useRef(new Animated.Value(0)).current;
  const reelEntrance = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
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
  const reelPeek = desktop ? 34 : density === 'veryCompact' ? 14 : compactReel ? 22 : 34;
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
  const activeTechniqueCategory = activeItem?.kind === 'persona' ? activeItem.persona.category : undefined;
  const activeTheoryCategory = activeItem?.kind === 'theory' ? activeItem.card.categoryId : undefined;
  const getCentralPhysicalIndex = (logicalIndex: number) =>
    baseReelItems.length > 1
      ? CIRCULAR_REEL_CENTER_COPY * baseReelItems.length + logicalIndex
      : logicalIndex;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      reelEntrance.setValue(1);
      return;
    }
    reelEntrance.setValue(0);
    Animated.timing(reelEntrance, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, reelEntrance, reelType]);

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

  const focusPhysicalItem = (physicalIndex: number, logicalIndex: number) => {
    activeIndexRef.current = logicalIndex;
    lastReelPosition[reelType] = logicalIndex;
    setActiveIndex(logicalIndex);
    physicalIndexRef.current = physicalIndex;
    scrollToPhysicalIndex(physicalIndex, !reduceMotion);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const openWhenCentered = (physicalIndex: number, logicalIndex: number, open: () => void) => {
    if (physicalIndex !== physicalIndexRef.current) {
      focusPhysicalItem(physicalIndex, logicalIndex);
      return;
    }
    open();
  };

  const getCurvedReelItemStyle = (physicalIndex: number) => {
    if (reduceMotion) return undefined;

    const inputRange = [-2, -1, 0, 1, 2].map(
      (distance) => (physicalIndex + distance) * reelWidth,
    );
    const sideScale = desktop ? 0.89 : 0.94;
    const farScale = desktop ? 0.82 : 0.89;
    const sideTilt = desktop ? 17 : 11;
    const farTilt = desktop ? 25 : 17;
    const sideDrop = desktop ? 13 : 8;
    const farDrop = desktop ? 24 : 15;
    // Scaling pulls each neighbour away from the viewport. Offset that loss,
    // then tuck the inner edge back under the centre card to keep a visible
    // curved preview on both sides.
    const sideShift = desktop ? 43 : 26;
    const farShift = desktop ? 72 : 42;

    return {
      opacity: reelScrollX.interpolate({
        inputRange,
        outputRange: [0.38, desktop ? 0.9 : 0.86, 1, desktop ? 0.9 : 0.86, 0.38],
        extrapolate: 'clamp',
      }),
      transform: [
        { perspective: desktop ? 1100 : 780 },
        {
          translateX: reelScrollX.interpolate({
            inputRange,
            outputRange: [-farShift, -sideShift, 0, sideShift, farShift],
            extrapolate: 'clamp',
          }),
        },
        {
          translateY: reelScrollX.interpolate({
            inputRange,
            outputRange: [farDrop, sideDrop, 0, sideDrop, farDrop],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: reelScrollX.interpolate({
            inputRange,
            outputRange: [farScale, sideScale, 1, sideScale, farScale],
            extrapolate: 'clamp',
          }),
        },
        {
          rotateY: reelScrollX.interpolate({
            inputRange,
            outputRange: [`${farTilt}deg`, `${sideTilt}deg`, '0deg', `-${sideTilt}deg`, `-${farTilt}deg`],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
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
        <View style={styles.personaCountPill}><AppText style={styles.personaCountText}>{reelType === 'techniques' ? `人物像 ${String(activeIndex + 1).padStart(2, '0')} / ${String(personas.length).padStart(2, '0')}` : `理論 ${String(activeIndex + 1).padStart(2, '0')} / ${String(baseReelItems.length).padStart(2, '0')}`}</AppText></View>
      </View>
      <SegmentedControl
        value={reelType}
        options={[
          { value: 'techniques', label: '処世術' },
          { value: 'theories', label: '理論' },
        ] as const}
        onChange={switchReelType}
      />
      <Animated.View
        style={[
          styles.reelStage,
          { width: reelViewportWidth, marginTop: sectionGap },
          {
            opacity: reelEntrance,
            transform: [{
              translateY: reelEntrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            }],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.reelArc} />
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
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: reelScrollX } } }],
            {
              useNativeDriver: true,
              listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                updateActiveCard(event);
                scheduleNearestCardSnap();
              },
            },
          )}
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
          style={[styles.reel, { width: reelViewportWidth }]}
          renderItem={({ item: reelItem, index: physicalIndex }) => {
            const logicalIndex = baseReelItems.length > 0
              ? physicalIndex % baseReelItems.length
              : 0;
            const curvedItemStyle = getCurvedReelItemStyle(physicalIndex);
          if (reelItem.kind === 'upgrade') {
            return (
              <Animated.View style={[styles.reelItem, { width: reelWidth }, curvedItemStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="処世術禄 完全版を購入する"
                  onPress={() => openWhenCentered(physicalIndex, logicalIndex, () => {
                    router.push({ pathname: '/upgrade', params: { source: 'reel-card' } });
                  })}
                  style={({ pressed }) => [
                    styles.upgradeReelCard,
                    { width: cardWidth, height: cardHeight, marginHorizontal: reelGap / 2 },
                    cardFrame,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="label" style={styles.upgradeReelEyebrow}>完全版</AppText>
                  <AppText variant="serif" style={styles.upgradeReelTitle}>全人物像・全カードを{`\n`}30日間利用</AppText>
                  <View style={[styles.cardRule, cardOrnament]} />
                  <AppText style={styles.upgradeReelBody}>{catalogTechniqueCards.length}の処世術・{catalogTheories.length}の理論{`\n`}全21ケースを収録</AppText>
                  <View style={styles.upgradeCta}>
                    <AppText style={styles.upgradeCtaText}>内容を見る　¥{COMPLETE_EDITION_PRICE_JPY}／30日</AppText>
                  </View>
                </Pressable>
              </Animated.View>
            );
          }

          if (reelItem.kind === 'theory') {
            const theory = reelItem.card;
            const theorySaved = savedTheoryIds.includes(theory.tagId);
            const isAccessible = reelItem.reelKey === `loop-${CIRCULAR_REEL_CENTER_COPY}-theory-${theory.tagId}`;
            return (
              <Animated.View accessibilityElementsHidden={!isAccessible} importantForAccessibility={isAccessible ? 'yes' : 'no-hide-descendants'} aria-hidden={!isAccessible} style={[styles.reelItem, { width: reelWidth }, curvedItemStyle]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${theory.title}を詳しく読む`} onPress={() => openWhenCentered(physicalIndex, logicalIndex, () => {
                  router.push({ pathname: '/theory/[id]', params: { id: theory.tagId, reelIndex: String(activeIndexRef.current) } });
                })} style={({ pressed }) => [styles.techniqueCard, styles.theoryCard, cardFrame, { width: cardWidth, height: cardHeight, marginHorizontal: reelGap / 2 }, pressed && styles.pressed]}>
                  <AppText variant="label" style={styles.techniqueId}>{getTheoryDisplayId(theory)}</AppText>
                  <AppText style={[styles.techniqueTitle, { fontSize: getReelTitleMetrics(theory.title, cardWidth, density).fontSize, lineHeight: getReelTitleMetrics(theory.title, cardWidth, density).lineHeight }]}>{getReelTitleMetrics(theory.title, cardWidth, density).displayTitle}</AppText>
                  <View style={[styles.cardRule, cardOrnament]} />
                  <View style={[styles.categoryChip, categoryChip]}><AppText style={styles.categoryChipText}>〔 {theory.categoryTitle} 〕</AppText></View>
                  <AppText style={[styles.theorySummary, density !== 'normal' && styles.theorySummaryCompact]}>{getTheoryCoverSummary(theory.summary, theory.definition ?? '社会を生きるための知恵を、理論から読み解く。')}</AppText>
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
              </Animated.View>
            );
          }

          const persona = reelItem.persona;
          const personaLocked = !isPaid && !isFreePersona(persona.title);
          const titleMetrics = getReelTitleMetrics(persona.title, cardWidth, density);
          const isAccessible =
            reelItem.reelKey === `loop-${CIRCULAR_REEL_CENTER_COPY}-persona-${persona.id}`;
          return (
            <Animated.View
              accessibilityElementsHidden={!isAccessible}
              importantForAccessibility={
                isAccessible ? 'yes' : 'no-hide-descendants'
              }
              aria-hidden={!isAccessible}
              style={[styles.reelItem, { width: reelWidth }, curvedItemStyle]}
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
                {!isPaid ? (
                  <View pointerEvents="none" style={styles.personaAccessBadge}>
                    <AccessBadge locked={personaLocked} compact />
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${persona.title}${personaLocked ? '、完全版限定' : '、無料公開'}を詳しく見る`}
                  onPress={() => openWhenCentered(physicalIndex, logicalIndex, () => {
                    router.push({ pathname: '/subcategory/[category]/[name]', params: { category: persona.category, name: persona.title } });
                  })}
                  style={({ pressed }) => [styles.cardReadArea, pressed && styles.pressed]}
                >
                  <AppText variant="label" style={styles.techniqueId}>{persona.category === 'interpersonal' ? '対人術' : persona.category === 'work' ? '仕事術' : '人生術'}</AppText>
                  <AppText
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
                  <View style={[styles.cardRule, cardOrnament]} />
                  <AppText style={styles.personaSubtitle}>{persona.subtitle}</AppText>
                  <View style={styles.personaCta}><AppText style={styles.personaCtaText}>{persona.techniqueCount}つの処世術を見る</AppText><AppText style={styles.personaCtaChevron}>›</AppText></View>
                </Pressable>
            </View>
            </Animated.View>
          );
          }}
        />
      </Animated.View>
      <View style={styles.shortcuts}>
        {reelType === 'techniques' ? (
          <View style={styles.techniqueShortcutGrid} accessibilityRole="tablist" accessibilityLabel="人物像の領域へ移動">
            {techniqueShortcuts.map((shortcut) => {
              const active = activeTechniqueCategory === shortcut.key;
              return (
                <Pressable
                  key={shortcut.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  aria-selected={active}
                  accessibilityLabel={`${shortcut.label}の先頭の人物像へ移動`}
                  onPress={() => jumpToTechniqueCategory(shortcut.key)}
                  style={({ pressed }) => [styles.shortcutTab, active && styles.shortcutTabActive, pressed && styles.pressed]}
                >
                  <AppText style={[styles.shortcutTabText, active && styles.shortcutTabTextActive]}>{shortcut.label}</AppText>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.theoryShortcutGrid} accessibilityRole="tablist" accessibilityLabel="理論分類へ移動">
            {theoryShortcuts.map((shortcut) => {
              const active = activeTheoryCategory === shortcut.key;
              return (
                <Pressable
                  key={shortcut.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  aria-selected={active}
                  accessibilityLabel={`${shortcut.label}の先頭の理論へ移動`}
                  onPress={() => jumpToTheoryCategory(shortcut.key)}
                  style={({ pressed }) => [styles.theoryShortcut, active && styles.shortcutTabActive, pressed && styles.pressed]}
                >
                  <AppText style={[styles.theoryShortcutText, active && styles.shortcutTabTextActive]}>{shortcut.label}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      {!isPaid ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="完全版の内容を見る、280円で30日間"
          onPress={() => router.push({ pathname: '/upgrade', params: { source: 'home' } })}
          style={({ pressed }) => [styles.unlockCard, density !== 'normal' && styles.unlockCardCompact, pressed && styles.pressed]}
        >
          <View style={styles.unlockCopy}>
            <AppText style={styles.unlockTitle}>完全版の内容を見る</AppText>
            <AppText style={styles.unlockBody}>{catalogTechniqueCards.length}の処世術・{catalogTheories.length}の理論・全21ケース</AppText>
          </View>
          <View style={styles.unlockPrice}><AppText style={styles.unlockPriceText}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText><AppText style={styles.unlockPeriod}>30日</AppText></View>
          <AppText style={styles.unlockChevron}>›</AppText>
        </Pressable>
      ) : null}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  reelHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  reelHeading: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700', letterSpacing: 1.4 },
  reelHeadingUnderline: { marginTop: 5, width: 54, height: 2, borderRadius: 2, backgroundColor: colors.gold },
  personaCountPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, height: 32, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FBF8F1' },
  personaCountText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  accessBadge: { position: 'absolute', right: 0, top: 0, zIndex: 2, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: '#C7A55B', borderRadius: 999, backgroundColor: '#F4EEE2' },
  accessBadgeLabel: { color: '#7D5A1D', fontSize: 9, lineHeight: 14, fontWeight: '700' },
  accessBadgeRemaining: { color: colors.ink, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  catalogCount: { marginBottom: 6, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  catalogDivider: { color: colors.gold },
  reelStage: { position: 'relative', alignSelf: 'center', flexGrow: 0 },
  reelArc: { position: 'absolute', zIndex: 0, left: '20%', right: '20%', bottom: -7, height: 24, borderTopWidth: 1, borderColor: 'rgba(180,132,37,0.28)', borderRadius: 999 },
  reel: { alignSelf: 'center', flexGrow: 0, zIndex: 1 },
  reelItem: { paddingVertical: 2, transformOrigin: 'center center' },
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
  cardRule: {
    width: 58,
    height: 1,
    alignSelf: 'center',
    backgroundColor: colors.goldLight,
    marginTop: 14,
    marginBottom: 20,
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
  unlockCard: { minHeight: 66, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  unlockCardCompact: { minHeight: 58, marginTop: 5, paddingHorizontal: 12, gap: 9 },
  unlockCopy: { flex: 1, minWidth: 0 },
  unlockTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  unlockBody: { marginTop: 2, color: colors.muted, fontSize: 10, lineHeight: 15 },
  unlockPrice: { alignItems: 'flex-end' },
  unlockPriceText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 21, fontWeight: '700' },
  unlockPeriod: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  unlockChevron: { color: colors.ink, fontSize: 30, lineHeight: 34 },
  shortcuts: { marginTop: 8 },
  techniqueShortcutGrid: { flexDirection: 'row', gap: 7 },
  shortcutTab: { flex: 1, minWidth: 0, height: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  shortcutTabActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  shortcutTabText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  shortcutTabTextActive: { color: colors.surface },
  theoryShortcutGrid: { flexDirection: 'row', gap: 7, paddingRight: 2 },
  theoryShortcut: { minWidth: 92, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  theoryShortcutText: { color: colors.inkSoft, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
});
