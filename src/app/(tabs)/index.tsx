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
import { AppText } from '@/components/ui';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTechniqueDisplayId, techniqueCards } from '@/data/catalog';
import type { CategoryKey, TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { useTabVisible } from '@/hooks/use-tab-visible';
import { useAppToast } from '@/components/app-toast';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type ReelItem = {
  card: TechniqueCard;
  reelKey: string;
};

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
  const minimumSize = compact ? 14 : 22;
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

const categorySkips: {
  key: CategoryKey;
  label: string;
  mark: string;
  tint: string;
}[] = [
  {
    key: 'interpersonal',
    label: '対人術',
    mark: '対',
    tint: 'rgba(229, 235, 224, 0.82)',
  },
  {
    key: 'work',
    label: '仕事術',
    mark: '仕',
    tint: 'rgba(243, 235, 220, 0.82)',
  },
  {
    key: 'life',
    label: '人生術',
    mark: '生',
    tint: 'rgba(230, 237, 232, 0.82)',
  },
];

export default function MainScreen() {
  const isFocused = useTabVisible();
  const router = useRouter();
  const { width, height } = useHydratedWindowDimensions();
  const showToast = useAppToast();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const { savedIds, toggleSaved } = useAppState();

  const compactReel = width < 520;
  const cardHeight = compactReel
    ? Math.max(330, Math.min(height - 300, 460))
    : Math.max(380, Math.min(height - 290, 520));
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
  // Three complete copies make both the visible 216 → 1 transition and the
  // invisible reset happen between identical cards.  A one-card clone at each
  // end leaves a hard edge after a fast swipe or a repeated drag.
  const reelItems = useMemo<ReelItem[]>(() => {
    if (techniqueCards.length <= 1) {
      return techniqueCards.map((card) => ({
        card,
        reelKey: `original-${card.id}`,
      }));
    }

    return Array.from({ length: 3 }, (_, loop) =>
      techniqueCards.map((card) => ({
        card,
        reelKey: `loop-${loop}-${card.id}`,
      })),
    ).flat();
  }, []);
  const activeCard = techniqueCards[activeIndex] ?? techniqueCards[0];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: techniqueCards.length > 1
          ? techniqueCards.length + activeIndex
          : activeIndex,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [reelWidth]);

  const moveTo = (index: number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(index, techniqueCards.length - 1));
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({
      index: techniqueCards.length > 1
        ? techniqueCards.length + nextIndex
        : nextIndex,
      animated,
    });
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const moveBy = (offset: -1 | 1) => {
    if (techniqueCards.length <= 1) return;

    const rawIndex = activeIndex + offset;
    const nextIndex =
      (rawIndex + techniqueCards.length) % techniqueCards.length;
    const physicalIndex = techniqueCards.length + rawIndex;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({
      index: physicalIndex,
      animated: true,
    });
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const skipToCategory = (category: CategoryKey) => {
    const index = techniqueCards.findIndex(
      (card) => card.categoryKey === category,
    );
    if (index >= 0) moveTo(index);
  };

  const updateActiveCard = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (techniqueCards.length <= 1) return;

    const physicalIndex = Math.round(event.nativeEvent.contentOffset.x / reelWidth);
    const nextIndex =
      ((physicalIndex % techniqueCards.length) + techniqueCards.length) %
      techniqueCards.length;

    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  const recenterReel = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (techniqueCards.length <= 1) return;

    const physicalIndex = Math.round(event.nativeEvent.contentOffset.x / reelWidth);
    const cardCount = techniqueCards.length;

    // Keep the user in the middle copy, after momentum has settled. Because
    // the destination contains the same card in the same visual position, the
    // jump is not perceptible.
    if (physicalIndex < cardCount || physicalIndex >= cardCount * 2) {
      const centeredIndex = cardCount +
        (((physicalIndex % cardCount) + cardCount) % cardCount);
      listRef.current?.scrollToIndex({ index: centeredIndex, animated: false });
    }

    void Haptics.selectionAsync().catch(() => undefined);
  };

  if (!isFocused) return null;

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.reelHeading}>
        <AppText style={styles.reelHeadingText}>処世術</AppText>
        <View style={styles.headingOrnament}>
          <View style={styles.headingLine} />
          <View style={styles.headingDiamond} />
          <View style={styles.headingLine} />
        </View>
      </View>

      <View style={[styles.reelControls, { width: reelViewportWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="前の処世術"
          onPress={() => moveBy(-1)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.reelArrowButton,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.reelArrow}>‹</AppText>
        </Pressable>
        <AppText style={styles.reelPosition}>
          {getTechniqueDisplayId(activeCard)} / {techniqueCards.length}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="次の処世術"
          onPress={() => moveBy(1)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.reelArrowButton,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.reelArrow}>›</AppText>
        </Pressable>
      </View>

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
        initialScrollIndex={techniqueCards.length > 1 ? techniqueCards.length : 0}
        getItemLayout={(_, index) => ({
          index,
          length: reelWidth,
          offset: reelWidth * index,
        })}
        initialNumToRender={5}
        windowSize={7}
        onScroll={updateActiveCard}
        onMomentumScrollEnd={recenterReel}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: reelSideInset }}
        style={[styles.reel, { width: reelViewportWidth }]}
        renderItem={({ item: reelItem }) => {
          const item = reelItem.card;
          const itemSaved = savedIds.includes(item.id);
          const titleMetrics = getReelTitleMetrics(item.title, cardWidth);
          const isAccessible =
            reelItem.reelKey === `original-${activeCard.id}`;
          return (
            <View
              accessibilityElementsHidden={!isAccessible}
              importantForAccessibility={
                isAccessible ? 'yes' : 'no-hide-descendants'
              }
              aria-hidden={!isAccessible}
              style={[styles.reelItem, { width: reelWidth }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}を詳しく読む`}
                onPress={() =>
                  router.push({
                    pathname: '/card/[id]',
                    params: { id: item.id },
                  })
                }
                style={({ pressed }) => [
                  styles.techniqueCard,
                  {
                    width: cardWidth,
                    minHeight: cardHeight,
                    marginHorizontal: reelGap / 2,
                    paddingHorizontal: titleMetrics.horizontalPadding,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <AppText variant="label" style={styles.techniqueId}>
                  {getTechniqueDisplayId(item)}
                </AppText>
                <AppText
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
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
                <AppText
                  style={styles.techniqueSubtitle}
                  numberOfLines={2}
                >
                  {item.subtitle}
                </AppText>
                <View style={styles.categoryChip}>
                  <AppText style={styles.categoryChipText}>
                    {item.categoryName}・{item.subcategory}
                  </AppText>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  itemSaved
                    ? `${item.title}を蔵書から外す`
                    : `${item.title}を蔵書に保存`
                }
                onPress={() => {
                  toggleSaved(item.id);
                  showToast(
                    itemSaved ? '蔵書から外しました' : '蔵書に保存しました',
                  );
                }}
                style={({ pressed }) => [
                  styles.saveButton,
                  itemSaved && styles.saveButtonSaved,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  style={[styles.bookmark, itemSaved && styles.saveTextSaved]}
                >
                  {itemSaved ? '◆' : '▯'}
                </AppText>
                <AppText
                  style={[styles.saveText, itemSaved && styles.saveTextSaved]}
                >
                  {itemSaved ? '蔵書に保存済み' : '蔵書に保存'}
                </AppText>
              </Pressable>
            </View>
          );
        }}
      />

      <View style={styles.categorySkipRow}>
        {categorySkips.map((category) => {
          const active = activeCard.categoryKey === category.key;
          return (
            <Pressable
              key={category.key}
              accessibilityRole="button"
              accessibilityLabel={`${category.label}の先頭へ移動`}
              onPress={() => skipToCategory(category.key)}
              style={({ pressed }) => [
                styles.categorySkip,
                { backgroundColor: category.tint },
                active && styles.categorySkipActive,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.categorySkipMark,
                  active && styles.categorySkipMarkActive,
                ]}
              >
                <AppText
                  style={[
                    styles.categorySkipMarkText,
                    active && styles.categorySkipMarkTextActive,
                  ]}
                >
                  {category.mark}
                </AppText>
              </View>
              <AppText style={styles.categorySkipLabel}>{category.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl, paddingBottom: spacing.xl },
  reelHeading: { alignItems: 'center', marginBottom: spacing.md },
  reelHeadingText: {
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: 4,
  },
  headingOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  headingLine: { width: 34, height: 1, backgroundColor: colors.goldLight },
  headingDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  reelControls: {
    alignSelf: 'center',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reelArrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelArrow: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 38,
  },
  reelPosition: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 2,
    fontWeight: '600',
  },
  reel: { alignSelf: 'center', flexGrow: 0 },
  reelItem: { paddingVertical: spacing.sm },
  techniqueCard: {
    minHeight: 360,
    paddingVertical: 36,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...bookCardShadow,
  },
  techniqueTitle: {
    width: '100%',
    fontFamily: fonts.serif,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.ink,
  },
  techniqueId: {
    marginBottom: spacing.md,
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
    marginVertical: spacing.xl,
  },
  cardLine: { flex: 1, height: 1, backgroundColor: colors.goldLight },
  cardDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  techniqueSubtitle: {
    maxWidth: 520,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 1.2,
    textAlign: 'center',
    color: colors.inkSoft,
  },
  categoryChip: {
    marginTop: spacing.xl,
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 1.2,
    color: colors.inkSoft,
  },
  saveButton: {
    alignSelf: 'center',
    minWidth: 230,
    minHeight: 54,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  saveButtonSaved: { backgroundColor: colors.charcoal },
  bookmark: { color: colors.gold, fontSize: 24, lineHeight: 28 },
  saveText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.5,
  },
  saveTextSaved: { color: colors.goldLight },
  categorySkipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  categorySkip: {
    flex: 1,
    minHeight: 82,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  categorySkipActive: {
    borderColor: colors.gold,
    borderWidth: 1.5,
    ...bookCardShadow,
  },
  categorySkipMark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  categorySkipMarkActive: { backgroundColor: colors.gold },
  categorySkipMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  categorySkipMarkTextActive: { color: colors.surface },
  categorySkipLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.975 }] },
});
