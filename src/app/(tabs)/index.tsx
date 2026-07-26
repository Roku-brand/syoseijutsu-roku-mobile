import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { AppText } from '@/components/ui';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards } from '@/data/catalog';
import type { CategoryKey, TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';

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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<TechniqueCard>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { savedIds, toggleSaved } = useAppState();

  const reelWidth = Math.min(Math.max(width - spacing.lg * 2, 280), 680);
  const activeCard = techniqueCards[activeIndex] ?? techniqueCards[0];
  const saved = savedIds.includes(activeCard.id);

  const moveTo = (index: number, animated = true) => {
    const nextIndex = Math.max(0, Math.min(index, techniqueCards.length - 1));
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated });
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
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / reelWidth,
    );
    if (
      nextIndex !== activeIndex &&
      nextIndex >= 0 &&
      nextIndex < techniqueCards.length
    ) {
      setActiveIndex(nextIndex);
      void Haptics.selectionAsync().catch(() => undefined);
    }
  };

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

      <View style={[styles.reelControls, { width: reelWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="前の処世術"
          disabled={activeIndex === 0}
          onPress={() => moveTo(activeIndex - 1)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.reelArrowButton,
            activeIndex === 0 && styles.reelArrowDisabled,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.reelArrow}>‹</AppText>
        </Pressable>
        <AppText style={styles.reelPosition}>
          {String(activeIndex + 1).padStart(3, '0')} / {techniqueCards.length}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="次の処世術"
          disabled={activeIndex === techniqueCards.length - 1}
          onPress={() => moveTo(activeIndex + 1)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.reelArrowButton,
            activeIndex === techniqueCards.length - 1 &&
              styles.reelArrowDisabled,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.reelArrow}>›</AppText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        data={techniqueCards}
        keyExtractor={(card) => card.id}
        getItemLayout={(_, index) => ({
          index,
          length: reelWidth,
          offset: reelWidth * index,
        })}
        initialNumToRender={2}
        windowSize={3}
        onMomentumScrollEnd={updateActiveCard}
        onScrollEndDrag={updateActiveCard}
        onScroll={updateActiveCard}
        scrollEventThrottle={16}
        style={[styles.reel, { width: reelWidth }]}
        renderItem={({ item }) => (
          <View style={[styles.reelItem, { width: reelWidth }]}>
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
                pressed && styles.pressed,
              ]}
            >
              <AppText style={styles.techniqueTitle}>{item.title}</AppText>
              <View style={styles.cardOrnament}>
                <View style={styles.cardLine} />
                <View style={styles.cardDiamond} />
                <View style={styles.cardLine} />
              </View>
              <AppText style={styles.techniqueSubtitle}>{item.subtitle}</AppText>
              <View style={styles.categoryChip}>
                <AppText style={styles.categoryChipText}>
                  {item.categoryName}・{item.subcategory}
                </AppText>
              </View>
            </Pressable>
          </View>
        )}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? '蔵書から外す' : '蔵書に保存'}
        onPress={() => toggleSaved(activeCard.id)}
        style={({ pressed }) => [
          styles.saveButton,
          saved && styles.saveButtonSaved,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={[styles.bookmark, saved && styles.saveTextSaved]}>
          {saved ? '◆' : '▯'}
        </AppText>
        <AppText style={[styles.saveText, saved && styles.saveTextSaved]}>
          {saved ? '蔵書に保存済み' : '蔵書に保存'}
        </AppText>
      </Pressable>

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
  reelArrowDisabled: { opacity: 0.2 },
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
    width: '100%',
    minHeight: 360,
    paddingHorizontal: spacing.xl,
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
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 56,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.ink,
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
    minHeight: 112,
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
  pressed: { opacity: 0.68, transform: [{ scale: 0.994 }] },
});
