import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, BrandMark, IconButton, Pill } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { categoryMeta, getFeed } from '@/data/catalog';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';

const cardPalette = {
  relationships: ['#EAE1D1', '#DED8CA'],
  work: ['#D9DDD5', '#E7E3D8'],
  mental: ['#DDD7DF', '#E5DED1'],
  life: ['#D6DED9', '#E3DDD0'],
  challenge: ['#E4D7CB', '#D7D9D0'],
} as const;

export default function MainReelScreen() {
  const router = useRouter();
  const { interests, savedIds, toggleSaved, addHistory } = useAppState();
  const [height, setHeight] = useState(0);
  const feed = useMemo(() => getFeed(interests, savedIds), [interests, savedIds]);
  const currentId = useRef<string | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    setHeight(Math.round(event.nativeEvent.layout.height));
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<TechniqueCard>[] }) => {
      const card = viewableItems[0]?.item;
      if (!card || card.id === currentId.current) return;
      currentId.current = card.id;
      addHistory(card.id);
      void Haptics.selectionAsync().catch(() => undefined);
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: TechniqueCard; index: number }) => {
      const saved = savedIds.includes(item.id);
      const palette = cardPalette[item.categoryKey];
      return (
        <View
          style={[
            styles.page,
            { height: height || undefined, backgroundColor: palette[index % 2] },
          ]}
        >
          <View style={styles.topBar}>
            <BrandMark compact />
            <View style={styles.topMeta}>
              <AppText variant="caption" style={styles.counter}>
                {String(index + 1).padStart(3, '0')} / {feed.length}
              </AppText>
            </View>
          </View>

          <View style={styles.texture} pointerEvents="none">
            <View style={styles.textureLine} />
            <View style={[styles.textureLine, styles.textureLineTwo]} />
            <View style={[styles.textureCircle, styles.textureCircleOne]} />
            <View style={[styles.textureCircle, styles.textureCircleTwo]} />
          </View>

          <View style={styles.cardBody}>
            <Pill>{item.categoryName} · {item.subcategory}</Pill>
            <AppText style={styles.cardTitle}>{item.title}</AppText>
            <View style={styles.shortRule} />
            <AppText variant="caption" style={styles.cardHint}>
              上下にスワイプして、次の処世術へ
            </AppText>
          </View>

          <View style={styles.actions}>
            <IconButton
              label={saved ? '保存を解除' : 'マイOSへ保存'}
              icon={saved ? '◆' : '◇'}
              active={saved}
              onPress={() => toggleSaved(item.id)}
            />
            <IconButton
              label="共有"
              icon="↗"
              onPress={() =>
                void Share.share({
                  title: '処世術禄',
                  message: `${item.title}\n\n処世術禄｜人生の判断と立ち回りにOSを。`,
                })
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="詳しく読む"
              onPress={() =>
                router.push({ pathname: '/card/[id]', params: { id: item.id } })
              }
              style={({ pressed }) => [
                styles.detailButton,
                pressed && styles.detailPressed,
              ]}
            >
              <AppText variant="label" style={styles.detailText}>
                詳しく読む
              </AppText>
              <AppText style={styles.detailArrow}>›</AppText>
            </Pressable>
          </View>
        </View>
      );
    },
    [feed.length, height, router, savedIds, toggleSaved],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.container} onLayout={onLayout}>
        {height > 0 && (
          <FlatList
            data={feed}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
            getItemLayout={(_, index) => ({
              length: height,
              offset: height * index,
              index,
            })}
            initialNumToRender={3}
            windowSize={5}
            removeClippedSubviews
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  page: { padding: spacing.lg, justifyContent: 'space-between', overflow: 'hidden' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 2 },
  topMeta: { alignItems: 'flex-end', justifyContent: 'center' },
  counter: { letterSpacing: 1.2, color: colors.inkSoft },
  texture: { ...StyleSheet.absoluteFill, opacity: 0.35 },
  textureLine: {
    position: 'absolute',
    width: 1,
    height: '72%',
    backgroundColor: colors.gold,
    top: '15%',
    left: '12%',
    transform: [{ rotate: '18deg' }],
  },
  textureLineTwo: { left: '88%', top: '20%', height: '55%', transform: [{ rotate: '-12deg' }] },
  textureCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 999,
  },
  textureCircleOne: { width: 250, height: 250, right: -170, top: 80 },
  textureCircleTwo: { width: 160, height: 160, left: -100, bottom: 70 },
  cardBody: { alignItems: 'center', paddingHorizontal: spacing.md, zIndex: 2 },
  cardTitle: {
    marginTop: spacing.xl,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 52,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  shortRule: { width: 32, height: 1, backgroundColor: colors.gold, marginTop: 32 },
  cardHint: { marginTop: spacing.md, color: colors.inkSoft },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 },
  detailButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...shadow.card,
  },
  detailPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  detailText: { color: colors.paper },
  detailArrow: { color: colors.goldLight, fontSize: 22, lineHeight: 26 },
});
