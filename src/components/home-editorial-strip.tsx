import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useFeatures } from '@/data/features';
import { featureCover } from '@/data/feature-covers';
import { featureImageSource } from '@/data/feature-images';
import { colors, fonts } from '@/constants/theme';
import { APP_ROUTES, featureRoute } from '@/navigation/app-routes';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const fallbackImage = require('../../assets/home/editorial-window-v1.webp');

/** Small, swipeable editorial shelf. Unlike the former full-screen hero, it
 * follows the daily deck and premium link without stealing the first viewport. */
export function HomeEditorialStrip({ desktop }: { desktop: boolean }) {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const cardWidth = Math.max(240, Math.min(380, (width - 24) * .86));
  const mobileCard = !desktop ? { width: cardWidth, height: Math.round(cardWidth * .56) } : undefined;
  const { articles } = useFeatures();
  const featured = useMemo(() => {
    const published = articles.filter(article => article.status === 'published' && article.show_in_list);
    const selected = published.filter(article => article.is_featured);
    return [...selected, ...published.filter(article => !article.is_featured)].slice(0, 3);
  }, [articles]);

  return <View testID="home-editorial-section" style={styles.section}>
    <View style={styles.heading}>
      <View style={styles.headingLeft}>
        <View style={styles.accent} />
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>編集部の特集</Text>
      </View>
      <Pressable testID="home-editorial-see-all" accessibilityRole="link" accessibilityLabel="特集をすべて見る" onPress={() => router.push(APP_ROUTES.features)}
        style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
        <Text style={styles.seeAllText}>すべて見る →</Text>
      </Pressable>
    </View>
    <ScrollView testID="home-editorial-rail" horizontal showsHorizontalScrollIndicator={false} style={[styles.rail, { height: (mobileCard?.height ?? 150) + 10 }]}
      snapToInterval={(mobileCard?.width ?? 280) + 10} decelerationRate="fast" disableIntervalMomentum
      contentContainerStyle={styles.railContent} accessibilityLabel="編集部の特集を横にスクロール">
      {!featured.length ? (
        <Pressable testID="home-editorial-fallback" accessibilityRole="link" accessibilityLabel="特集一覧を開く"
          onPress={() => router.push(APP_ROUTES.features)} style={({ pressed }) => [styles.card, desktop && styles.cardDesktop, mobileCard, pressed && styles.pressed]}>
          <Image source={fallbackImage} resizeMode="cover" style={styles.image} />
          <View style={styles.imageShade} />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>特集</Text>
            <Text style={styles.cardTitle}>問いを深める、編集部の特集</Text>
          </View>
        </Pressable>
      ) : featured.map(article => (
        <Pressable key={article.id} testID="home-editorial-card" accessibilityRole="link" accessibilityLabel={`特集「${article.title}」を読む`}
          onPress={() => router.push(featureRoute(article.slug))}
          style={({ pressed }) => [styles.card, desktop && styles.cardDesktop, mobileCard, pressed && styles.pressed]}>
          <Image source={article.image_path ? featureCover(article)?.compactSource ?? featureImageSource(article) : fallbackImage} resizeMode="cover" style={styles.image} />
          <View style={styles.imageShade} />
          <View style={styles.copy}>
            <Text style={styles.eyebrow}>特集</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>{article.title}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 18, marginBottom: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  headingLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 9 },
  accent: { width: 3, height: 26, backgroundColor: colors.gold, borderRadius: 2 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, fontWeight: '700' },
  seeAll: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  seeAllText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  rail: { marginHorizontal: -12, flexGrow: 0 },
  railContent: { paddingHorizontal: 12, gap: 10, paddingBottom: 10 },
  card: { flexShrink: 0, width: 256, height: 137, borderRadius: 13, overflow: 'hidden', backgroundColor: '#28251E', borderWidth: 1, borderColor: '#DFD5C5' },
  cardDesktop: { width: 280, height: 150 },
  image: { width: '100%', height: '100%' },
  imageShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,15,14,0.4)' },
  copy: { position: 'absolute', left: 15, right: 12, bottom: 12, gap: 5 },
  eyebrow: { color: '#E7C88C', fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, fontWeight: '600' },
  cardTitle: { color: '#FFFDF8', fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  pressed: { opacity: 0.82 },
});
