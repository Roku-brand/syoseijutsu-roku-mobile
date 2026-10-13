import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { featureImage, FeatureBookmark } from '@/components/feature-article';
import { colors, fonts } from '@/constants/theme';
import { useFeatures, refreshFeatures } from '@/data/features';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { featureRoute } from '@/navigation/app-routes';

export default function FeaturesScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const { articles, loading, error } = useFeatures();
  const [selected, setSelected] = useState<string | null>(null);
  const compact = width < 700;
  const columns = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
  const featured = articles.filter(article => article.is_featured);
  const hero = featured.find(article => article.id === selected) ?? featured[0];
  const listed = articles.filter(article => article.show_in_list);
  useEffect(() => { if (selected && !featured.some(item => item.id === selected)) setSelected(null); }, [selected, featured]);
  return <BookScreen contentContainerStyle={styles.page} testID="features-page">
    {loading ? <EmptyState title="特集を読み込んでいます" description="少しお待ちください。" /> : error ? <View style={styles.status}><EmptyState title="特集を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshFeatures()} style={styles.retry}><AppText style={styles.gold}>もう一度読み込む</AppText></Pressable></View> : !articles.length ? <EmptyState title="特集" description="現在公開中の特集はありません。" /> : <>
      {hero ? <View style={[styles.hero, compact && styles.heroCompact]} testID="features-hero">
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}><AppText style={styles.heroLabel}>特集</AppText><View style={styles.goldRule} /><AppText style={[styles.heroTitle, compact && styles.heroTitleCompact]} accessibilityRole="header" accessibilityLabel={hero.title} aria-level={1}>{hero.title === '押さえておくべき5つの処世術指針' ? '押さえておくべき\n5つの処世術指針' : hero.title}</AppText><Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を読む`} onPress={() => router.push(featureRoute(hero.slug))} style={styles.read}><AppText style={styles.readText}>読む →</AppText></Pressable></View>
        <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を開く`} onPress={() => router.push(featureRoute(hero.slug))} style={[styles.heroVisual, compact && styles.heroVisualCompact]}><Image source={featureImage(hero.image_path)} accessibilityLabel={hero.image_alt || hero.title} contentFit="cover" style={styles.heroImage} /></Pressable>
        {featured.length > 1 ? <View style={[styles.previews, compact && styles.previewsCompact]}>{featured.map(article => <Pressable key={article.id} accessibilityRole="button" accessibilityLabel={`ヒーローに${article.title}を表示`} accessibilityState={{ selected: article.id === hero.id }} onPress={() => setSelected(article.id)} style={[styles.preview, article.id === hero.id && styles.previewActive]}><Image source={featureImage(article.image_path)} accessibilityLabel={article.title} contentFit="cover" style={styles.previewImage} /></Pressable>)}</View> : null}
      </View> : <AppText accessibilityRole="header" aria-level={1} style={styles.pageTitle}>特集</AppText>}
      <View style={[styles.grid, compact && styles.gridCompact]} testID="features-grid">{listed.map(article => <View key={article.id} style={[styles.card, { width: `${100 / columns - (columns > 1 ? 1.4 : 0)}%` }]} testID="feature-card"><Pressable accessibilityRole="link" accessibilityLabel={`${article.title}を読む`} onPress={() => router.push(featureRoute(article.slug))}><View style={styles.cover}><Image source={featureImage(article.image_path)} accessibilityLabel={article.image_alt || article.title} contentFit="cover" style={styles.coverImage} /><View style={styles.coverScrim} /><AppText style={[styles.coverTitle, compact && styles.coverTitleCompact]}>{article.title}</AppText></View><AppText style={styles.cardTitle}>{article.title}</AppText></Pressable><View style={styles.cardFooter}><FeatureBookmark article={article} /></View></View>)}</View>
    </>}
  </BookScreen>;
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: 0, paddingTop: 0, width: '100%', maxWidth: 1520, alignSelf: 'center', paddingBottom: 32 }, hero: { backgroundColor: '#2A2B20', flexDirection: 'row', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 32, gap: 24, minHeight: 300 }, heroCompact: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 20, paddingVertical: 20, gap: 18 }, heroCopy: { flex: 0.9, minWidth: 0, alignItems: 'flex-start', gap: 14 }, heroCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }, heroLabel: { fontFamily: fonts.serif, color: '#D8B568', fontSize: 20, lineHeight: 30 }, goldRule: { width: 42, height: 1, backgroundColor: '#D8B568' }, heroTitle: { fontFamily: fonts.serif, color: '#FFF9EF', fontSize: 32, lineHeight: 48, letterSpacing: 1 }, heroTitleCompact: { fontSize: 26, lineHeight: 40, letterSpacing: 0.5 }, read: { borderColor: '#D8B568', borderWidth: 1, borderRadius: 28, paddingHorizontal: 25, paddingVertical: 10, marginTop: 5, minHeight: 46 }, readText: { color: '#D8B568', fontFamily: fonts.serif, fontSize: 16 }, heroVisual: { flex: 1.6, minWidth: 0 }, heroVisualCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' }, heroImage: { width: '100%', aspectRatio: 2.5, maxHeight: 300, borderRadius: 7, backgroundColor: '#38382C' }, previews: { gap: 14, width: 82 }, previewsCompact: { width: '100%', flexDirection: 'row', flexWrap: 'wrap' }, preview: { width: 82, height: 52, padding: 2, borderWidth: 1, borderColor: 'transparent', borderRadius: 5 }, previewActive: { borderColor: '#D8B568' }, previewImage: { width: '100%', height: '100%', borderRadius: 3 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22, paddingHorizontal: 32, paddingTop: 26, width: '100%', maxWidth: 1040, alignSelf: 'center' }, gridCompact: { paddingHorizontal: 18, paddingTop: 22, justifyContent: 'center' }, card: { minWidth: 0, maxWidth: 320 }, cover: { width: '100%', aspectRatio: 2.05, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.line }, coverImage: { width: '100%', height: '100%' }, coverScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%', backgroundColor: 'rgba(0,0,0,0.50)' }, coverTitle: { position: 'absolute', bottom: 14, left: 18, right: 18, fontFamily: fonts.serif, color: '#FFFFFF', fontSize: 20, lineHeight: 30, fontWeight: '700', textShadowColor: 'rgba(0,0,0,.35)', textShadowRadius: 4 }, coverTitleCompact: { fontSize: 20, lineHeight: 30, left: 14, right: 14 }, cardTitle: { marginTop: 10, fontFamily: fonts.serif, color: colors.ink, fontSize: 17, lineHeight: 27 }, cardFooter: { alignItems: 'flex-end', marginTop: 3 }, pageTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 46, paddingHorizontal: 24, paddingTop: 24 }, status: { padding: 20 }, retry: { alignSelf: 'center', padding: 14, minHeight: 44 }, gold: { color: colors.gold },
});
