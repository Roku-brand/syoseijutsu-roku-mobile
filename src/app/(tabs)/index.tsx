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
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTechniqueDisplayId, techniqueCards as catalogTechniqueCards } from '@/data/catalog';
import { FREE_REEL_TECHNIQUE_IDS } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { useTabVisible } from '@/hooks/use-tab-visible';
import { useAppToast } from '@/components/app-toast';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { COMPLETE_EDITION_PRICE_JPY } from '@/lib/purchase';

type TechniqueReelItem = {
  kind: 'technique';
  card: TechniqueCard;
  reelKey: string;
};

type UpgradeReelItem = {
  kind: 'upgrade';
  reelKey: string;
};

type ReelItem = TechniqueReelItem | UpgradeReelItem;

const CIRCULAR_REEL_COPIES = 5;
const CIRCULAR_REEL_CENTER_COPY = Math.floor(CIRCULAR_REEL_COPIES / 2);

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

function getReelTitleMetrics(title: string, reelWidth: number) {
  const lines = splitReelTitle(title).split('\n');
  const longestLine = Math.max(...lines.map((line) => [...line].length));
  const compact = reelWidth < 420;
  const horizontalPadding = compact ? spacing.md : spacing.xl;
  const availableWidth = reelWidth - horizontalPadding * 2 - 8;
  const maximumSize = compact ? 29 : 34;
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
  const isFocused = useTabVisible();
  const router = useRouter();
  const { width, height } = useHydratedWindowDimensions();
  const showToast = useAppToast();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const physicalIndexRef = useRef(0);
  const { savedIds, toggleSaved } = useAppState();
  const { isPaid } = useAccess();
  const visibleTechniqueCards = useMemo(
    () => isPaid
      ? catalogTechniqueCards
      : FREE_REEL_TECHNIQUE_IDS
          .map((id) => catalogTechniqueCards.find((card) => card.id === id))
          .filter((card): card is TechniqueCard => Boolean(card)),
    [isPaid],
  );

  const compactReel = width < 520;
  // ホームはヘッダーとタブバーの間で完結させる。小さい端末でも
  // 収まる高さを優先し、カード内だけに情報と保存操作を集約する。
  const cardHeight = compactReel
    ? Math.max(250, Math.min(height - 390, 350))
    : Math.max(310, Math.min(height - 350, 450));
  const reelPeek = compactReel ? 18 : 30;
  const reelGap = compactReel ? 10 : 14;
  const cardWidth = Math.min(
    Math.max(width - spacing.md * 2 - reelPeek * 2, 276),
    width >= 1100 ? 760 : 680,
  );
  const reelWidth = cardWidth + reelGap;
  const reelViewportWidth = Math.min(
    Math.max(width - spacing.md * 2, 280),
    cardWidth + reelPeek * 2,
  );
  const reelSideInset = Math.max(reelPeek - reelGap / 2, 0);
  const baseReelItems = useMemo<ReelItem[]>(() => [
    ...visibleTechniqueCards.map((card) => ({
      kind: 'technique' as const,
      card,
      reelKey: `card-${card.id}`,
    })),
    ...(!isPaid ? [{ kind: 'upgrade' as const, reelKey: 'upgrade' }] : []),
  ], [isPaid, visibleTechniqueCards]);
  // The circular reel contains several complete copies. It is reset to the
  // centre copy only after a swipe settles, so neither direction has an edge.
  const reelItems = useMemo<ReelItem[]>(() => {
    if (!isPaid || baseReelItems.length <= 1) return baseReelItems;
    return Array.from({ length: CIRCULAR_REEL_COPIES }, (_, loop) =>
      baseReelItems.map((item) => ({ ...item, reelKey: `loop-${loop}-${item.reelKey}` })),
    ).flat();
  }, [baseReelItems, isPaid]);
  const activeItem = baseReelItems[activeIndex] ?? baseReelItems[0];
  const activeCard = activeItem?.kind === 'technique' ? activeItem.card : undefined;
  const getCentralPhysicalIndex = (logicalIndex: number) =>
    isPaid && baseReelItems.length > 1
      ? CIRCULAR_REEL_CENTER_COPY * baseReelItems.length + logicalIndex
      : logicalIndex;

  useEffect(() => {
    const safeActiveIndex = Math.min(activeIndexRef.current, Math.max(baseReelItems.length - 1, 0));
    activeIndexRef.current = safeActiveIndex;
    if (safeActiveIndex !== activeIndex) setActiveIndex(safeActiveIndex);
    const physicalIndex = getCentralPhysicalIndex(safeActiveIndex);
    physicalIndexRef.current = physicalIndex;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: physicalIndex,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [baseReelItems.length, isPaid, reelWidth]);

  const moveTo = (index: number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(index, baseReelItems.length - 1));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    const physicalIndex = getCentralPhysicalIndex(nextIndex);
    physicalIndexRef.current = physicalIndex;
    listRef.current?.scrollToIndex({
      index: physicalIndex,
      animated,
    });
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const updateActiveCard = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (baseReelItems.length <= 1) return;

    const physicalIndex = Math.round(event.nativeEvent.contentOffset.x / reelWidth);
    const nextIndex =
      isPaid
        ? ((physicalIndex % baseReelItems.length) + baseReelItems.length) % baseReelItems.length
        : Math.max(0, Math.min(physicalIndex, baseReelItems.length - 1));

    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
    physicalIndexRef.current = physicalIndex;
  };

  const recenterReel = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (!isPaid || baseReelItems.length <= 1) return;

    const physicalIndex = Math.round(event.nativeEvent.contentOffset.x / reelWidth);
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
      listRef.current?.scrollToIndex({ index: centeredIndex, animated: false });
    }

    void Haptics.selectionAsync().catch(() => undefined);
  };

  if (!isFocused) return null;

  return (
    <BookScreen scroll={false} contentContainerStyle={styles.content}>
      <AppText style={styles.catalogCount}>216の処世術 <AppText style={styles.catalogDivider}>｜</AppText> 526の理論</AppText>
      <SegmentedControl
        value="techniques"
        options={[
          { value: 'techniques', label: '処世術' },
          { value: 'theories', label: '理論' },
        ] as const}
        onChange={(value) => {
          if (value === 'theories') router.push('/theories/all');
        }}
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
        initialScrollIndex={getCentralPhysicalIndex(0)}
        getItemLayout={(_, index) => ({
          index,
          length: reelWidth,
          offset: reelWidth * index,
        })}
        initialNumToRender={5}
        windowSize={7}
        onScroll={updateActiveCard}
        onMomentumScrollEnd={recenterReel}
        onScrollToIndexFailed={({ index }) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: reelWidth * index, animated: false });
          });
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: reelSideInset }}
        style={[styles.reel, { width: reelViewportWidth }]}
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
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText variant="label" style={styles.upgradeReelEyebrow}>COMPLETE EDITION</AppText>
                  <AppText variant="serif" style={styles.upgradeReelTitle}>ここから先は、{`\n`}完全版。</AppText>
                  <View style={styles.cardOrnament}>
                    <View style={styles.upgradeCardLine} />
                    <View style={styles.cardDiamond} />
                    <View style={styles.upgradeCardLine} />
                  </View>
                  <AppText style={styles.upgradeReelBody}>すべての処世術と理論を、{`\n`}あなたの手元へ。</AppText>
                  <View style={styles.upgradeCta}>
                    <AppText style={styles.upgradeCtaText}>完全版を¥{COMPLETE_EDITION_PRICE_JPY}で解放　›</AppText>
                  </View>
                </Pressable>
              </View>
            );
          }

          const item = reelItem.card;
          const itemSaved = savedIds.includes(item.id);
          const titleMetrics = getReelTitleMetrics(item.title, cardWidth);
          const isAccessible =
            activeCard?.id === item.id &&
            (isPaid
              ? reelItem.reelKey === `loop-${CIRCULAR_REEL_CENTER_COPY}-card-${activeCard.id}`
              : true);
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
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}を詳しく読む`}
                  onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                  style={({ pressed }) => [styles.cardReadArea, pressed && styles.pressed]}
                >
                  <AppText variant="label" style={styles.techniqueId}>
                    {getTechniqueDisplayId(item)}
                  </AppText>
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
                  <View style={styles.cardOrnament}>
                    <View style={styles.cardLine} />
                    <View style={styles.cardDiamond} />
                    <View style={styles.cardLine} />
                  </View>
                  <View style={styles.categoryChip}>
                    <AppText style={styles.categoryChipText}>
                      〔 {item.categoryName} 〕
                    </AppText>
                  </View>
                  <View style={styles.cardSeal}>
                    <View style={styles.cardSealInner} />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={itemSaved ? `${item.title}を蔵書から外す` : `${item.title}を蔵書に保存`}
                  onPress={() => {
                    toggleSaved(item.id);
                    showToast(itemSaved ? '蔵書から外しました' : '蔵書に保存しました');
                  }}
                  style={({ pressed }) => [styles.saveButton, itemSaved && styles.saveButtonSaved, pressed && styles.pressed]}
                >
                  <AppText style={[styles.bookmark, itemSaved && styles.saveTextSaved]}>
                    {itemSaved ? '★' : '☆'}
                  </AppText>
                </Pressable>
            </View>
            </View>
          );
        }}
      />
      <View accessibilityRole="tablist" style={styles.pageIndicators}>
        {Array.from({ length: Math.min(3, Math.max(baseReelItems.length, 1)) }, (_, index) => (
          <View
            key={index}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeIndex % 3 === index }}
            style={[styles.pageIndicator, activeIndex % 3 === index && styles.pageIndicatorActive]}
          />
        ))}
      </View>
      {!isPaid ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="処世術禄 完全版を購入する"
          onPress={() => router.push({ pathname: '/upgrade', params: { source: 'home' } })}
          style={({ pressed }) => [styles.unlockCard, pressed && styles.pressed]}
        >
          <View style={styles.unlockCrown}><AppText style={styles.unlockCrownText}>♛</AppText></View>
          <View style={styles.unlockCopy}>
            <AppText style={styles.unlockTitle}>全216件を解放する</AppText>
            <AppText style={styles.unlockBody}>216の処世術・526の理論をすべて読む</AppText>
          </View>
          <AppText style={styles.unlockChevron}>›</AppText>
        </Pressable>
      ) : null}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  catalogCount: { marginBottom: 6, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  catalogDivider: { color: colors.gold },
  reel: { alignSelf: 'center', flexGrow: 0, marginTop: spacing.sm },
  reelItem: { paddingVertical: 2 },
  techniqueCard: {
    position: 'relative',
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.charcoal,
    alignItems: 'stretch',
    ...bookCardShadow,
  },
  cardReadArea: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', paddingBottom: 6 },
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
    marginBottom: 8,
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
    marginTop: 8,
    marginBottom: 18,
  },
  cardLine: { flex: 1, height: 1, backgroundColor: colors.goldLight },
  cardDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  categoryChip: {
    marginTop: 18,
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(196,148,50,0.55)',
    backgroundColor: 'rgba(184,138,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  bookmark: { color: colors.goldLight, fontSize: 20, lineHeight: 24 },
  saveTextSaved: { color: colors.surface },
  cardSeal: { width: 34, height: 34, marginTop: 16, borderWidth: 1.5, borderColor: colors.gold, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center' },
  cardSealInner: { width: 13, height: 13, borderWidth: 1, borderColor: colors.goldLight },
  pageIndicators: { minHeight: 18, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  pageIndicator: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#D7D4CE' },
  pageIndicatorActive: { backgroundColor: colors.ink },
  unlockCard: { minHeight: 72, marginTop: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, ...bookCardShadow },
  unlockCrown: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  unlockCrownText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 23, lineHeight: 27 },
  unlockCopy: { flex: 1, minWidth: 0 },
  unlockTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  unlockBody: { marginTop: 2, color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  unlockChevron: { color: colors.ink, fontSize: 30, lineHeight: 34 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
});
