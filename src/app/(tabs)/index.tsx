import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AppText } from '@/components/ui';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, getTheoryDisplayId, techniqueCards as catalogTechniqueCards, theories as catalogTheories } from '@/data/catalog';
import { getTheoryCoverSummary } from '@/data/theory-display';
import { FREE_THEORY_IDS, isFreePersona } from '@/access/access-config';
import { AccessBadge } from '@/components/access-badge';
import { useAccess } from '@/access/access-state';
import type { TheoryCard } from '@/data/types';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
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
type Persona = { id: string; title: string; slogan: string; category: 'interpersonal' | 'work' | 'life'; principleIds: string[]; techniqueCount: number };

const CIRCULAR_REEL_COPIES = 5;
const CIRCULAR_REEL_CENTER_COPY = Math.floor(CIRCULAR_REEL_COPIES / 2);
// The editorial home always opens each mode on the reference card.  Keeping
// these positions explicit also prevents a prior mode's index leaking into the
// other reel after a quick tab switch.
const REEL_INITIAL_INDEX: Record<'techniques' | 'theories', number> = { techniques: 0, theories: 5 };

const PERSONA_SLOGANS: Record<string, string> = {
  '印象がいい人': '好印象をつくる方法',
  '会話がうまい人': '会話を続け、深める方法',
  '聞き上手な人': '相手の話を引き出す方法',
  '信頼される人': '信頼を積み上げる方法',
  '人たらしの人': '人を惹きつける極意',
  '面白い人': '人を楽しませる方法',
  '人を見極められる人': '人の本質を見抜く方法',
  '人に振り回されない人': '人との境界線を守る方法',
  '軽く扱われない人': '対等に扱われる方法',
  '人間関係が安定する人': '関係を長く続ける方法',
  '集団に馴染める人': '集団に居場所をつくる方法',
  'リーダーシップがある人': '人をまとめ、動かす方法',
  'カリスマ性のある人': '人を惹きつける存在のつくり方',
  '仕事ができる人': '成果を出し続ける仕事術',
  'タスク処理がうまい人': '仕事を滞らせない処理術',
  '頭がいい人': '物事を深く理解する思考法',
  '正しく評価される人': '実力を評価につなげる方法',
  '交渉がうまい人': '交渉を有利に進める方法',
  '組織でうまく立ち回れる人': '組織を賢く生き抜く処世術',
  '充実した人生を過ごせる人': '人生を豊かにする方法',
  '自分らしく生きられる人': '自分の軸で生きる方法',
  '人生を楽しめる人': '人生を楽しみ尽くす方法',
  '不安に強い人': '不安とうまく付き合う方法',
  '後悔しない人': '後悔を減らす選び方',
  '立ち直れる人': '逆境から立ち直る方法',
  '可能性を広げられる人': '人生の可能性を広げる方法',
};

const techniqueShortcuts = [
  { label: '対人術へ ›', accessibilityLabel: '対人術', key: 'interpersonal' },
  { label: '仕事術へ ›', accessibilityLabel: '仕事術', key: 'work' },
  { label: '人生術へ ›', accessibilityLabel: '人生術', key: 'life' },
] as const;

const theoryShortcuts = [
  { label: '心理学へ ›', accessibilityLabel: '心理学', key: 'psychology' },
  { label: '行動科学へ ›', accessibilityLabel: '行動科学', key: 'behavioral-science' },
  { label: '組織・経営へ ›', accessibilityLabel: '組織・経営', key: 'organization-management' },
  { label: '戦略へ ›', accessibilityLabel: '戦略', key: 'strategy' },
  { label: '古典へ ›', accessibilityLabel: '古典', key: 'classics-thought' },
  { label: '格言へ ›', accessibilityLabel: '格言', key: 'maxims-experience' },
] as const;

/** 表紙用の要約は、本文を変えずに意味の切れ目だけで改行する。 */
function formatTheoryCoverSummary(value: string) {
  const text = value.trim();
  if (text.length < 34 || text.includes('\n')) return text;

  const midpoint = text.length / 2;
  const separators = ['ために', 'ことで', 'うえで', 'ながら', 'から', 'ので', '、'];
  const candidates = separators
    .flatMap((separator) => {
      const matches: number[] = [];
      let start = 0;
      while (start < text.length) {
        const found = text.indexOf(separator, start);
        if (found === -1) break;
        matches.push(found + separator.length);
        start = found + separator.length;
      }
      return matches;
    })
    .filter((index) => index > text.length * 0.32 && index < text.length * 0.68)
    .sort((left, right) => Math.abs(left - midpoint) - Math.abs(right - midpoint));

  const breakAt = candidates[0];
  return breakAt ? `${text.slice(0, breakAt)}\n${text.slice(breakAt)}` : text;
}

function getEditorialTheoryTitleSize(title: string, width: number, compact: boolean) {
  const characters = Math.max([...title].length, 1);
  const availableWidth = compact ? width - 56 : width * 0.7 - 152;
  const maximum = compact ? 24 : 42;
  const minimum = compact ? 20 : 31;
  return Math.max(minimum, Math.min(maximum, Math.floor(availableWidth / characters)));
}

function getEditorialTheoryCode(theory: TheoryCard) {
  const displayId = getTheoryDisplayId(theory).replace('－', '-');
  const match = displayId.match(/^(.+)-(\d+)$/);
  if (!match) return displayId;
  return `${match[1]}-${match[2].padStart(3, '0')}`;
}

export default function MainScreen() {
  const router = useRouter();
  const { width, height, density, desktop, narrow, verticalPadding, sectionGap } = useResponsiveLayout();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const reelScrollX = useRef(new Animated.Value(0)).current;
  const reelEntrance = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reelType, setReelType] = useState<'techniques' | 'theories'>('techniques');
  const [activeIndex, setActiveIndex] = useState(REEL_INITIAL_INDEX.techniques);
  const activeIndexRef = useRef(REEL_INITIAL_INDEX.techniques);
  const physicalIndexRef = useRef(0);
  const latestScrollOffsetRef = useRef(0);
  const programmaticTargetIndexRef = useRef<number | null>(null);
  const programmaticTargetExpiresAtRef = useRef(0);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Paid content arrives after the server has verified the entitlement.  The
  // catalogue module is intentionally hydrated in place, so this revision is
  // the signal that makes the reel rebuild from its initial preview cards to
  // the full current theory catalog.
  const { isPaid, accessInfo, catalogRevision } = useAccess();
  const personas = useMemo<Persona[]>(() => categories.flatMap((category) => category.subcategories.map((group) => {
    const ids = group.items.map((item) => item.id);
    return {
      id: `${category.key}-${group.name}`,
      title: group.name,
      slogan: PERSONA_SLOGANS[group.name] ?? 'なりたい自分から、必要な処世術を選ぶ。',
      category: category.key,
      principleIds: ids,
      techniqueCount: ids.length,
    };
  })), [catalogRevision, isPaid]);
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
  // The desktop home is a single focused composition. Keeping the reel at
  // phone height leaves an accidental-looking band of empty paper below it.
  // Reserve space for shortcuts, then let the featured card carry the page.
  const idealCardHeight = desktop
    ? 448
    : isPaid
      // 通常のiPhoneでは、リールを画面の主役として十分な高さにする。
      // これにより下部ショートカットの後ろに目的のない余白が残らず、
      // 画面をスクロールさせずに自然な密度で収まる。
      ? density === 'veryCompact' ? 210 : density === 'compact' ? 242 : 312
      : density === 'veryCompact' ? 218 : density === 'compact' ? 250 : 304;
  const cardHeight = Math.max(
    isPaid ? 206 : 216,
    // Reserve only the controls that are actually below the reel.  On a
    // normal iPhone this lets the home card use the available screen instead
    // of leaving a blank band above the persistent navigation.
    Math.min(idealCardHeight, height - (desktop ? (isPaid ? 214 : 350) : (isPaid ? 388 : 368))),
  );
  const reelPeek = desktop ? 0 : density === 'veryCompact' ? 14 : compactReel ? 22 : 34;
  // Keep a real strip of paper between cards. The gap is part of the item
  // width so snapping and the active-card index remain in lockstep.
  const reelGap = desktop ? 30 : density === 'veryCompact' ? 12 : compactReel ? 16 : 20;
  const safeWidth = width || 390;
  const cardWidth = desktop
    ? Math.min(Math.max(safeWidth * 0.46, 580), 760)
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
  // A normal-height phone has room below the composition.  Give that room
  // back to the reel so the card is not visually pinned to the header.
  const reelTopOffset = desktop ? 2 : density === 'veryCompact' ? 6 : density === 'compact' ? 16 : 54;
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
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [reduceMotion, reelEntrance, reelType]);

  const scrollToPhysicalIndex = (index: number, animated: boolean) => {
    if (!Number.isFinite(index) || reelWidth <= 0) return;
    // Keep delayed scroll events from an earlier animated movement from
    // overwriting the card selected by a newer arrow/category action.
    programmaticTargetIndexRef.current = index;
    programmaticTargetExpiresAtRef.current = Date.now() + (animated ? 1200 : 300);
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
    latestScrollOffsetRef.current = physicalIndex * reelWidth;
    reelScrollX.setValue(latestScrollOffsetRef.current);
    const frame = requestAnimationFrame(() => scrollToPhysicalIndex(physicalIndex, false));
    // React Native Web can finish laying out a virtualized horizontal list
    // after the first frame. A bounded retry keeps the first card visible and
    // then moves to the centre copy without gating the screen render.
    const retry = setTimeout(() => scrollToPhysicalIndex(physicalIndex, false), 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(retry);
    };
  }, [baseReelItems.length, reelScrollX, reelType, reelWidth]);

  const moveTo = (index: number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(index, baseReelItems.length - 1));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    const physicalIndex = getCentralPhysicalIndex(nextIndex);
    physicalIndexRef.current = physicalIndex;
    latestScrollOffsetRef.current = physicalIndex * reelWidth;
    scrollToPhysicalIndex(physicalIndex, animated);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const moveWithinActiveCategory = (direction: -1 | 1) => {
    const current = baseReelItems[activeIndexRef.current];
    if (!current || current.kind === 'upgrade') {
      moveTo(activeIndexRef.current + direction);
      return;
    }

    const categoryId = current.kind === 'persona'
      ? current.persona.category
      : current.card.categoryId;
    const categoryIndexes = baseReelItems.reduce<number[]>((indexes, item, index) => {
      const matches = item.kind === 'persona'
        ? item.persona.category === categoryId
        : item.kind === 'theory'
          ? item.card.categoryId === categoryId
          : false;
      if (matches) indexes.push(index);
      return indexes;
    }, []);
    if (categoryIndexes.length < 2) return;

    const currentPosition = Math.max(categoryIndexes.indexOf(activeIndexRef.current), 0);
    const nextPosition = (currentPosition + direction + categoryIndexes.length) % categoryIndexes.length;
    moveTo(categoryIndexes[nextPosition]);
  };

  const focusPhysicalItem = (physicalIndex: number, logicalIndex: number) => {
    activeIndexRef.current = logicalIndex;
    setActiveIndex(logicalIndex);
    physicalIndexRef.current = physicalIndex;
    latestScrollOffsetRef.current = physicalIndex * reelWidth;
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
    // Leave the neighbours in their own lanes: moving them toward the centre
    // made the corner decoration sit on top of the active card.
    const sideShift = desktop ? 22 : 0;
    const farShift = desktop ? 48 : 0;

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
    if (nextType === reelType) return;
    clearScrollSettleTimer();
    const nextItems = nextType === 'techniques' ? visiblePersonas : visibleTheoryCards;
    const nextIndex = Math.min(REEL_INITIAL_INDEX[nextType], Math.max(nextItems.length - 1, 0));
    setReelType(nextType);
    activeIndexRef.current = nextIndex;
    // The keyed list below is recreated for the new type. Its layout effect
    // supplies the new physical index; retaining an offset from the previous
    // list here is what previously allowed a rapid tab switch to desync.
    physicalIndexRef.current = 0;
    latestScrollOffsetRef.current = 0;
    setActiveIndex(nextIndex);
  };

  const updateActiveCard = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    latestScrollOffsetRef.current = offsetX;
    if (baseReelItems.length <= 1) return;

    const pendingPhysicalIndex = programmaticTargetIndexRef.current;
    if (pendingPhysicalIndex !== null) {
      const targetOffset = pendingPhysicalIndex * reelWidth;
      if (Math.abs(offsetX - targetOffset) <= 0.5) {
        programmaticTargetIndexRef.current = null;
        programmaticTargetExpiresAtRef.current = 0;
      } else if (Date.now() < programmaticTargetExpiresAtRef.current) {
        physicalIndexRef.current = pendingPhysicalIndex;
        return;
      } else {
        programmaticTargetIndexRef.current = null;
      }
    }

    const physicalIndex = Math.round(offsetX / reelWidth);
    const nextIndex =
      baseReelItems.length > 1
        ? ((physicalIndex % baseReelItems.length) + baseReelItems.length) % baseReelItems.length
        : Math.max(0, Math.min(physicalIndex, baseReelItems.length - 1));

    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
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
    setActiveIndex(logicalIndex);
    physicalIndexRef.current = physicalIndex;
    latestScrollOffsetRef.current = targetOffset;

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
      latestScrollOffsetRef.current = centeredIndex * reelWidth;
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
    clearScrollSettleTimer();
    setReelType('techniques');
    activeIndexRef.current = targetIndex;
    setActiveIndex(targetIndex);
    if (reelType === 'techniques') {
      const physicalIndex = getCentralPhysicalIndex(targetIndex);
      physicalIndexRef.current = physicalIndex;
      latestScrollOffsetRef.current = physicalIndex * reelWidth;
      // A direct category jump must win over an in-flight arrow animation.
      // Scrolling without animation prevents old intermediate offsets from
      // restoring the previous category after the selection has changed.
      scrollToPhysicalIndex(physicalIndex, false);
    }
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const jumpToTheoryCategory = (categoryId: (typeof theoryShortcuts)[number]['key']) => {
    const targetIndex = visibleTheoryCards.findIndex((card) => card.categoryId === categoryId);
    if (targetIndex < 0) return;
    clearScrollSettleTimer();
    setReelType('theories');
    activeIndexRef.current = targetIndex;
    setActiveIndex(targetIndex);
    if (reelType === 'theories') {
      const physicalIndex = getCentralPhysicalIndex(targetIndex);
      physicalIndexRef.current = physicalIndex;
      latestScrollOffsetRef.current = physicalIndex * reelWidth;
      scrollToPhysicalIndex(physicalIndex, false);
    }
    void Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <BookScreen scroll={false} contentContainerStyle={[styles.content, { paddingTop: verticalPadding, paddingBottom: verticalPadding }]}>
      {isPaid && accessInfo.accessType === 'thirty_day' ? <View style={styles.accessBadge}><AppText style={styles.accessBadgeLabel}>完全版</AppText><AppText style={styles.accessBadgeRemaining}>{formatRemainingAccess(accessInfo.accessExpiresAt)}</AppText></View> : null}
      <View style={styles.contentModeSwitch} accessibilityRole="tablist" accessibilityLabel="コンテンツの種類を切り替える">
        {([
          { value: 'techniques' as const, label: '処世術' },
          { value: 'theories' as const, label: '理論' },
        ]).map((option) => {
          const active = reelType === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              aria-selected={active}
              onPress={() => switchReelType(option.value)}
              style={({ pressed }) => [styles.contentModeOption, pressed && styles.pressed]}
            >
              <AppText style={[styles.contentModeText, desktop && styles.contentModeTextDesktop, !active && styles.contentModeTextInactive]}>{option.label}</AppText>
              <View style={[styles.contentModeRule, active && styles.contentModeRuleActive]} />
            </Pressable>
          );
        })}
        <View pointerEvents="none" style={styles.contentModeDivider} />
      </View>
      <Animated.View
        testID="home-reel-stage"
        style={[
          styles.reelStage,
          desktop && styles.reelStageDesktop,
          desktop && { minHeight: cardHeight + 4 },
          { width: reelViewportWidth, marginTop: desktop ? reelTopOffset : sectionGap + reelTopOffset },
          {
            opacity: reelEntrance,
            transform: [{
              translateY: reelEntrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
            }],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.reelArc} />
        {baseReelItems.length > 1 ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="前のカードへ"
              hitSlop={10}
              onPress={() => moveWithinActiveCategory(-1)}
              style={({ pressed }) => [styles.reelArrow, styles.reelArrowLeft, pressed && styles.reelArrowPressed]}
            >
              <AppText style={styles.reelArrowText}>‹</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="次のカードへ"
              hitSlop={10}
              onPress={() => moveWithinActiveCategory(1)}
              style={({ pressed }) => [styles.reelArrow, styles.reelArrowRight, pressed && styles.reelArrowPressed]}
            >
              <AppText style={styles.reelArrowText}>›</AppText>
            </Pressable>
          </>
        ) : null}
        <FlatList
          key={reelType}
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
              useNativeDriver: Platform.OS !== 'web',
              listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                updateActiveCard(event);
                scheduleNearestCardSnap();
              },
            },
          )}
          onScrollBeginDrag={() => {
            clearScrollSettleTimer();
            programmaticTargetIndexRef.current = null;
            programmaticTargetExpiresAtRef.current = 0;
          }}
          onScrollEndDrag={scheduleNearestCardSnap}
          onMomentumScrollEnd={recenterReel}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: reelSideInset }}
          style={[styles.reel, { width: reelViewportWidth }]}
          renderItem={({ item: reelItem, index: physicalIndex }) => {
            const logicalIndex = baseReelItems.length > 0
              ? physicalIndex % baseReelItems.length
              : 0;
            const curvedItemStyle = getCurvedReelItemStyle(physicalIndex);
            const isCentered = physicalIndex === getCentralPhysicalIndex(activeIndex);
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
            return (
              <Animated.View
                accessibilityElementsHidden={!isCentered}
                importantForAccessibility={isCentered ? 'yes' : 'no-hide-descendants'}
                aria-hidden={!isCentered}
                style={[styles.reelItem, { width: reelWidth }, curvedItemStyle]}
              >
                <EditorialTheoryCard
                  theory={reelItem.card}
                  position={logicalIndex + 1}
                  total={visibleTheoryCards.length}
                  width={cardWidth}
                  height={cardHeight}
                  compact={!desktop}
                  onPress={() => openWhenCentered(physicalIndex, logicalIndex, () => {
                    router.push({ pathname: '/theory/[id]', params: { id: reelItem.card.tagId, reelIndex: String(activeIndexRef.current) } });
                  })}
                />
              </Animated.View>
            );
          }

          if (reelItem.kind === 'persona') {
            return (
              <Animated.View
                accessibilityElementsHidden={!isCentered}
                importantForAccessibility={isCentered ? 'yes' : 'no-hide-descendants'}
                aria-hidden={!isCentered}
                style={[styles.reelItem, { width: reelWidth }, curvedItemStyle]}
              >
                <EditorialPersonaCard
                  persona={reelItem.persona}
                  position={logicalIndex + 1}
                  total={personas.length}
                  width={cardWidth}
                  height={cardHeight}
                  compact={!desktop}
                  showAccessBadge={!isPaid}
                  locked={!isPaid && !isFreePersona(reelItem.persona.title)}
                  active={isCentered}
                  onPress={() => openWhenCentered(physicalIndex, logicalIndex, () => {
                    router.push({ pathname: '/subcategory/[category]/[name]', params: { category: reelItem.persona.category, name: reelItem.persona.title } });
                  })}
                />
              </Animated.View>
            );
          }

          return null;
          }}
        />
      </Animated.View>
      <View testID="home-shortcuts" style={[styles.shortcuts, desktop && styles.shortcutsDesktop]}>
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
                  accessibilityLabel={`${shortcut.accessibilityLabel}の先頭の人物像へ移動`}
                  onPress={() => jumpToTechniqueCategory(shortcut.key)}
                  style={({ pressed }) => [styles.shortcutLink, pressed && styles.pressed]}
                >
                  <AppText style={[styles.shortcutLinkText, active && styles.shortcutLinkTextActive]}>{shortcut.label}</AppText>
                  <View style={[styles.shortcutLinkRule, active && styles.shortcutLinkRuleActive]} />
                </Pressable>
              );
            })}
          </View>
        ) : desktop ? (
          <View style={[styles.theoryShortcutGrid, styles.theoryShortcutGridDesktop]} accessibilityRole="tablist" accessibilityLabel="理論分類へ移動">
            {theoryShortcuts.map((shortcut) => {
              const active = activeTheoryCategory === shortcut.key;
              return (
                <Pressable
                  key={shortcut.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  aria-selected={active}
                  accessibilityLabel={`${shortcut.accessibilityLabel}の先頭の理論へ移動`}
                  onPress={() => jumpToTheoryCategory(shortcut.key)}
                  style={({ pressed }) => [styles.theoryShortcut, styles.theoryShortcutDesktop, pressed && styles.pressed]}
                >
                  <AppText style={[styles.theoryShortcutText, active && styles.shortcutLinkTextActive]}>{shortcut.label}</AppText>
                  <View style={[styles.shortcutLinkRule, active && styles.shortcutLinkRuleActive]} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={[styles.theoryShortcutGrid, styles.theoryShortcutGridMobile]} accessibilityRole="tablist" accessibilityLabel="理論分類へ移動">
            {theoryShortcuts.map((shortcut) => {
              const active = activeTheoryCategory === shortcut.key;
              return (
                <Pressable
                  key={shortcut.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  aria-selected={active}
                  accessibilityLabel={`${shortcut.accessibilityLabel}の先頭の理論へ移動`}
                  onPress={() => jumpToTheoryCategory(shortcut.key)}
                  style={({ pressed }) => [styles.theoryShortcut, styles.theoryShortcutMobile, pressed && styles.pressed]}
                >
                  <AppText style={[styles.theoryShortcutText, active && styles.shortcutLinkTextActive]}>{shortcut.label}</AppText>
                  <View style={[styles.shortcutLinkRule, active && styles.shortcutLinkRuleActive]} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      {!isPaid ? (
        <Pressable
          testID="home-purchase-cta"
          accessibilityRole="button"
          accessibilityLabel="完全版で、すべての処世術・理論・ケースを読む。280円で30日間"
          onPress={() => router.push({ pathname: '/upgrade', params: { source: 'home' } })}
          style={({ pressed }) => [styles.unlockCard, desktop && styles.unlockCardDesktop, density !== 'normal' && styles.unlockCardCompact, pressed && styles.pressed]}
        >
          <View style={styles.unlockCopy}>
            <AppText style={styles.unlockTitle}>完全版で、すべての内容を読む</AppText>
            <AppText style={styles.unlockBody}>{catalogTechniqueCards.length}の処世術・{catalogTheories.length}の理論・全21ケースを30日間</AppText>
          </View>
          <View style={styles.unlockPrice}><AppText style={styles.unlockPriceText}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText><AppText style={styles.unlockPeriod}>30日</AppText></View>
          <AppText style={styles.unlockChevron}>›</AppText>
        </Pressable>
      ) : null}
    </BookScreen>
  );
}

function EditorialPersonaCard({
  persona,
  position,
  total,
  width,
  height,
  compact,
  showAccessBadge,
  locked,
  active,
  onPress,
}: {
  persona: Persona;
  position: number;
  total: number;
  width: number;
  height: number;
  compact: boolean;
  showAccessBadge: boolean;
  locked: boolean;
  active: boolean;
  onPress: () => void;
}) {
  const category = persona.category === 'interpersonal'
    ? '対人術'
    : persona.category === 'work'
      ? '仕事術'
      : '人生術';
  const number = String(position).padStart(2, '0');
  const titleSize = compact ? 24 : width >= 800 ? 42 : 36;

  return (
    <Pressable
      testID={active ? 'home-editorial-persona-card-active' : 'home-editorial-persona-card'}
      accessibilityRole="button"
      accessibilityLabel={`${persona.title}を詳しく見る`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.editorialCard,
        styles.editorialPersonaCard,
        { width, height },
        pressed && styles.editorialCardPressed,
      ]}
    >
      <View pointerEvents="none" style={styles.editorialPaperGrain} />
      {showAccessBadge ? (
        <View testID="home-persona-access-badge" pointerEvents="none" style={styles.editorialAccessBadge}>
          <AccessBadge locked={locked} compact />
        </View>
      ) : null}
      <AppText pointerEvents="none" style={[styles.editorialBackgroundNumber, compact && styles.editorialBackgroundNumberCompact]}>{number}</AppText>
      <View pointerEvents="none" style={[styles.editorialCenteredIndex, compact && styles.editorialCenteredIndexCompact]}>
        <AppText variant="serif" style={styles.editorialIndex}>{`人物像 ${number} / ${String(total).padStart(2, '0')}`}</AppText>
        <View style={[styles.editorialCenteredRule, compact && styles.editorialCenteredRuleCompact]} />
      </View>
      <View style={[styles.editorialPersonaCopy, compact && styles.editorialPersonaCopyCompact]}>
        <AppText variant="label" style={styles.editorialEyebrow}>{category}</AppText>
        <View style={[styles.editorialAccentRule, compact && styles.editorialAccentRuleCompact]} />
        <AppText variant="serif" style={[styles.editorialTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.3) }]}>{persona.title}</AppText>
        <AppText testID="home-persona-slogan" variant="serif" style={[styles.editorialSubtitle, compact && styles.editorialSubtitleCompact]}>{persona.slogan}</AppText>
        <View style={[styles.editorialTextCta, compact && styles.editorialTextCtaCompact]}>
          <AppText variant="serif" style={styles.editorialTextCtaLabel}>詳しく見る</AppText>
          <AppText style={styles.editorialTextCtaArrow}>→</AppText>
        </View>
      </View>
    </Pressable>
  );
}

function EditorialTheoryCard({
  theory,
  position,
  total,
  width,
  height,
  compact,
  onPress,
}: {
  theory: TheoryCard;
  position: number;
  total: number;
  width: number;
  height: number;
  compact: boolean;
  onPress: () => void;
}) {
  const titleSize = getEditorialTheoryTitleSize(theory.title, width, compact);
  const summary = formatTheoryCoverSummary(getTheoryCoverSummary(theory.summary, theory.definition ?? '日常の判断と行動を理解するための知識。'));
  const code = getEditorialTheoryCode(theory);

  return (
    <Pressable
      testID="home-editorial-theory-card"
      accessibilityRole="button"
      accessibilityLabel={`${theory.title}を詳しく見る`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.editorialCard,
        styles.editorialTheoryCard,
        { width, height },
        pressed && styles.editorialCardPressed,
      ]}
    >
      <View pointerEvents="none" style={[styles.theoryDiagram, compact && styles.theoryDiagramCompact]}>
        <View style={styles.theoryDiagramVertical} />
        <View style={styles.theoryDiagramHorizontal} />
        <View style={styles.theoryDiagramMarker} />
        <AppText style={styles.theoryDiagramDots}>{'·  ·  ·  ·  ·\n\n·  ·  ·  ·  ·\n\n·  ·  ·  ·  ·\n\n·  ·  ·  ·  ·'}</AppText>
      </View>
      <View pointerEvents="none" style={[styles.editorialCenteredIndex, compact && styles.editorialCenteredIndexCompact]}>
        <AppText variant="serif" style={styles.editorialIndex}>{`理論 ${String(position).padStart(2, '0')} / ${String(total)}`}</AppText>
        <View style={[styles.editorialCenteredRule, compact && styles.editorialCenteredRuleCompact]} />
      </View>
      <View style={[styles.editorialTheoryCopy, compact && styles.editorialTheoryCopyCompact]}>
        <AppText variant="label" style={styles.editorialEyebrow}>{theory.categoryTitle}</AppText>
        <AppText variant="serif" style={styles.editorialTheoryCode}>{code}</AppText>
        <View style={[styles.editorialAccentRule, compact && styles.editorialAccentRuleCompact]} />
        <AppText variant="serif" numberOfLines={compact ? 2 : 1} style={[styles.editorialTitle, styles.editorialTheoryTitle, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.3) }]}>{theory.title}</AppText>
        <AppText variant="serif" numberOfLines={compact ? 2 : 3} style={styles.editorialTheorySummary}>{summary}</AppText>
      </View>
      <View style={[styles.editorialTheoryFooter, compact && styles.editorialTheoryFooterCompact]}>
        <View style={[styles.editorialTextCta, styles.editorialTheoryCta, compact && styles.editorialTextCtaCompact]}>
          <AppText variant="serif" style={styles.editorialTextCtaLabel}>詳しく見る</AppText>
          <AppText style={styles.editorialTextCtaArrow}>→</AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  contentModeSwitch: { position: 'relative', minHeight: 50, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 74, marginBottom: 0 },
  contentModeOption: { minWidth: 104, minHeight: 46, alignItems: 'center', justifyContent: 'flex-start', outlineWidth: 0 },
  contentModeText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 31, fontWeight: '600', letterSpacing: 2.8 },
  contentModeTextDesktop: { fontSize: 29, lineHeight: 39, letterSpacing: 3.6 },
  contentModeTextInactive: { color: colors.inkSoft, opacity: 0.7 },
  contentModeRule: { width: 0, height: 1, marginTop: 5, backgroundColor: 'transparent' },
  contentModeRuleActive: { width: 154, backgroundColor: '#9A722E' },
  contentModeDivider: { position: 'absolute', top: 4, left: '50%', width: 1, height: 25, backgroundColor: 'rgba(94,82,61,0.24)' },
  accessBadge: { position: 'absolute', right: 0, top: 0, zIndex: 2, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', gap: 7, borderWidth: 1, borderColor: '#C7A55B', borderRadius: 999, backgroundColor: '#F4EEE2' },
  accessBadgeLabel: { color: '#7D5A1D', fontSize: 9, lineHeight: 14, fontWeight: '700' },
  accessBadgeRemaining: { color: colors.ink, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  catalogCount: { marginBottom: 6, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  catalogDivider: { color: colors.gold },
  reelStage: { position: 'relative', alignSelf: 'center', flexGrow: 0 },
  reelStageDesktop: { minHeight: 460 },
  reelArc: { display: 'none' },
  reel: { alignSelf: 'center', flexGrow: 0, zIndex: 1 },
  reelItem: { paddingVertical: 2, transformOrigin: 'center center' },
  reelArrow: { position: 'absolute', top: '50%', zIndex: 4, width: 40, height: 50, marginTop: -25, alignItems: 'center', justifyContent: 'center' },
  reelArrowLeft: { left: -62 },
  reelArrowRight: { right: -62 },
  reelArrowText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 42, lineHeight: 44, fontWeight: '300' },
  reelArrowPressed: { opacity: 0.58, transform: [{ scale: 0.9 }] },
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
  reelProgress: { alignSelf: 'center', minHeight: 28, paddingHorizontal: 11, borderWidth: 1, borderColor: 'rgba(196,148,50,0.55)', borderRadius: radius.pill, backgroundColor: 'rgba(24,24,23,0.36)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  reelProgressText: { color: '#F2E8D2', fontFamily: fonts.serif, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.9 },
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
  unlockCard: { minHeight: 72, marginTop: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  unlockCardDesktop: { minHeight: 68, marginTop: 14, paddingHorizontal: 20, borderColor: colors.gold },
  unlockCardCompact: { minHeight: 62, marginTop: 14, paddingHorizontal: 12, gap: 9 },
  unlockCopy: { flex: 1, minWidth: 0 },
  unlockTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  unlockBody: { marginTop: 2, color: colors.muted, fontSize: 10, lineHeight: 15 },
  unlockPrice: { alignItems: 'flex-end' },
  unlockPriceText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 21, fontWeight: '700' },
  unlockPeriod: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  unlockChevron: { color: colors.ink, fontSize: 30, lineHeight: 34 },
  shortcuts: { marginTop: 15 },
  shortcutsDesktop: { width: '100%', marginTop: 20, paddingTop: 17, borderTopWidth: 1, borderTopColor: 'rgba(84,73,56,0.14)' },
  techniqueShortcutGrid: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  shortcutLink: { flex: 1, minWidth: 0, minHeight: 34, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  shortcutLinkText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, fontWeight: '500', letterSpacing: 1.5, textAlign: 'center' },
  shortcutLinkTextActive: { color: colors.ink, fontWeight: '700' },
  shortcutLinkRule: { width: 22, height: 1, marginTop: 6, backgroundColor: 'transparent' },
  shortcutLinkRuleActive: { width: 48, backgroundColor: '#9A722E' },
  theoryShortcutGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingHorizontal: 4, paddingRight: 12, minWidth: '100%' },
  theoryShortcutGridDesktop: { width: '100%', gap: 0, paddingHorizontal: 0, paddingRight: 0 },
  theoryShortcutGridMobile: { flexWrap: 'wrap', rowGap: 4, columnGap: 0, paddingHorizontal: 0, paddingRight: 0 },
  theoryShortcut: { minWidth: 84, minHeight: 38, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  theoryShortcutDesktop: { flex: 1, minWidth: 0, minHeight: 34 },
  theoryShortcutMobile: { flexBasis: '33.333%', minWidth: '33.333%', minHeight: 34 },
  theoryShortcutText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, fontWeight: '500', letterSpacing: 1.05, textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
  editorialCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    justifyContent: 'center',
    shadowColor: '#45321E',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.13,
    shadowRadius: 25,
    elevation: 5,
  },
  editorialPersonaCard: { backgroundColor: '#352518' },
  editorialTheoryCard: { backgroundColor: '#14253C' },
  editorialCardPressed: { opacity: 0.9 },
  editorialAccessBadge: { position: 'absolute', top: 16, right: 16, zIndex: 4 },
  editorialPaperGrain: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.38,
    backgroundColor: '#4A3521',
    borderWidth: 1,
    borderColor: 'rgba(244,229,190,0.14)',
  },
  editorialBackgroundNumber: {
    position: 'absolute',
    right: 42,
    bottom: -40,
    color: 'rgba(213,176,101,0.12)',
    fontFamily: fonts.serif,
    fontSize: 214,
    lineHeight: 230,
    fontWeight: '400',
  },
  editorialBackgroundNumberCompact: { right: 16, bottom: -22, fontSize: 118, lineHeight: 132 },
  editorialCenteredIndex: { position: 'absolute', top: 39, left: 0, right: 0, alignItems: 'center', zIndex: 2 },
  editorialCenteredIndexCompact: { top: 16 },
  editorialCenteredRule: { width: 42, height: 1, marginTop: 12, backgroundColor: '#BC9346' },
  editorialCenteredRuleCompact: { width: 30, marginTop: 6 },
  editorialPersonaCopy: { position: 'absolute', top: 130, left: 62, right: 58, zIndex: 2 },
  editorialPersonaCopyCompact: { top: 66, left: 28, right: 22 },
  editorialTheoryCopy: { position: 'absolute', top: 122, left: 62, width: '52%', zIndex: 2 },
  editorialTheoryCopyCompact: { top: 66, left: 28, width: '70%' },
  editorialEyebrow: { color: '#C9A356', fontSize: 14, lineHeight: 20, letterSpacing: 2.2, fontWeight: '700' },
  editorialIndex: { color: '#EEE8DD', fontSize: 17, lineHeight: 25, letterSpacing: 1.4 },
  editorialAccentRule: { width: 38, height: 1, marginTop: 18, marginBottom: 20, backgroundColor: '#BC9346' },
  editorialAccentRuleCompact: { marginTop: 10, marginBottom: 11 },
  editorialTitle: { color: '#FFFDF8', fontWeight: '500', letterSpacing: 2.1, flexShrink: 1 },
  editorialTheoryTitle: { letterSpacing: 1.8 },
  editorialSubtitle: { marginTop: 18, color: '#EEE8DD', fontSize: 21, lineHeight: 31, letterSpacing: 1.4 },
  editorialSubtitleCompact: { fontSize: 16, lineHeight: 23, letterSpacing: 0.8 },
  editorialTextCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 18, marginTop: 38, borderBottomWidth: 1, borderBottomColor: '#C49A4B', paddingBottom: 8 },
  editorialTextCtaCompact: { gap: 12, marginTop: 14, paddingBottom: 4 },
  editorialTextCtaLabel: { color: '#FFF9EE', fontSize: 17, lineHeight: 25, letterSpacing: 1.6 },
  editorialTextCtaArrow: { color: '#D2A950', fontFamily: fonts.serif, fontSize: 28, lineHeight: 28 },
  editorialTheorySummary: { maxWidth: '100%', marginTop: 18, color: '#EEF1F4', fontSize: 17, lineHeight: 28, letterSpacing: 0.7 },
  editorialTheoryFooter: { position: 'absolute', right: 50, bottom: 45, alignItems: 'flex-end', zIndex: 2 },
  editorialTheoryFooterCompact: { right: 22, bottom: 20 },
  editorialTheoryCta: { alignSelf: 'flex-end', marginTop: 0 },
  editorialTheoryCode: { marginTop: 10, color: '#F1F0E8', fontSize: 18, lineHeight: 25, letterSpacing: 2 },
  theoryDiagram: { position: 'absolute', right: 30, top: 28, bottom: 28, width: '37%', opacity: 0.42 },
  theoryDiagramCompact: { opacity: 0.18, right: -38, width: '58%' },
  theoryDiagramVertical: { position: 'absolute', top: 0, bottom: 72, right: '46%', width: 1, backgroundColor: 'rgba(188,163,105,0.38)' },
  theoryDiagramHorizontal: { position: 'absolute', top: '46%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(188,163,105,0.32)' },
  theoryDiagramMarker: { position: 'absolute', top: '46%', right: '46%', width: 9, height: 9, marginTop: -4.5, marginRight: -4.5, backgroundColor: 'rgba(196,157,78,0.72)' },
  theoryDiagramDots: { position: 'absolute', top: '18%', right: '10%', color: 'rgba(229,227,205,0.46)', fontSize: 14, lineHeight: 11, letterSpacing: 7, textAlign: 'center' },
});
