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

const ARTICLE_SECTION = 'ふかぼり処世術記事';

export default function FeaturesScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const { articles, loading, error } = useFeatures();
  const [selected, setSelected] = useState<string | null>(null);
  const compact = width < 700;
  const sidebar = width >= 1000;
  const columns = width >= 1280 ? 3 : width >= 700 ? 2 : 1;
  const featured = articles.filter(article => article.is_featured);
  const hero = featured.find(article => article.id === selected) ?? featured[0];
  const listed = articles.filter(article => article.show_in_list);
  useEffect(() => { if (selected && !featured.some(item => item.id === selected)) setSelected(null); }, [selected, featured]);
  return <BookScreen contentContainerStyle={styles.page} testID="features-page">
    {loading ? <EmptyState title="特集を読み込んでいます" description="少しお待ちください。" /> : error ? <View style={styles.status}><EmptyState title="特集を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshFeatures()} style={styles.retry}><AppText style={styles.gold}>もう一度読み込む</AppText></Pressable></View> : !articles.length ? <EmptyState title="特集" description="現在公開中の特集はありません。" /> : <>
      {hero ? <View style={[styles.hero, compact && styles.heroCompact]} testID="features-hero">
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <AppText style={styles.heroLabel}>特集</AppText>
          <AppText style={[styles.heroTitle, compact && styles.heroTitleCompact]} accessibilityRole="header" accessibilityLabel={hero.title} aria-level={1}>{hero.title === '押さえておくべき5つの処世術指針' ? '押さえておくべき\n5つの処世術指針' : hero.title}</AppText>
          {!compact && hero.lead ? <AppText style={styles.heroLead} numberOfLines={2}>{hero.lead}</AppText> : null}
          <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を読む`} onPress={() => router.push(featureRoute(hero.slug))} style={styles.read}><AppText style={styles.readText}>読む →</AppText></Pressable>
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を開く`} onPress={() => router.push(featureRoute(hero.slug))} style={[styles.heroVisual, compact && styles.heroVisualCompact]}><Image source={featureImage(hero.image_path)} accessibilityLabel={hero.image_alt || hero.title} contentFit="cover" style={styles.heroImage} /></Pressable>
        {featured.length > 1 ? <View style={styles.previews}>{featured.map(article => <Pressable key={article.id} accessibilityRole="button" accessibilityLabel={`ヒーローに${article.title}を表示`} accessibilityState={{ selected: article.id === hero.id }} onPress={() => setSelected(article.id)} style={[styles.preview, article.id === hero.id && styles.previewActive]}><Image source={featureImage(article.image_path)} accessibilityLabel={article.title} contentFit="cover" style={styles.previewImage} /></Pressable>)}</View> : null}
      </View> : <AppText accessibilityRole="header" aria-level={1} style={styles.pageTitle}>特集</AppText>}
      {listed.length ? <View style={[styles.collection, compact && styles.collectionCompact]}>
        {sidebar ? <View style={styles.sidebar} testID="features-section-sidebar">
          <View style={styles.currentSection}><AppText style={styles.currentSectionText}>{ARTICLE_SECTION}</AppText></View>
          {hero ? <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を読む`} onPress={() => router.push(featureRoute(hero.slug))} style={styles.sidebarLink}>
            <AppText style={styles.sidebarLinkText}>{hero.slug === 'five-guidelines' ? '5つの処世術指針' : hero.title}</AppText><AppText style={styles.gold}>→</AppText>
          </Pressable> : null}
        </View> : null}
        <View style={styles.articleSection}>
          <AppText style={[styles.sectionTitle, compact && styles.sectionTitleCompact]} accessibilityRole="header" aria-level={2}>{ARTICLE_SECTION}</AppText>
          <View style={[styles.grid, compact && styles.gridCompact]} testID="features-grid">{listed.map(article => <View key={article.id} style={[styles.card, compact && styles.cardCompact, { width: `${100 / columns - (columns > 1 ? 1.8 : 0)}%` }]} testID="feature-card">
            <Pressable accessibilityRole="link" accessibilityLabel={`${article.title}を読む`} onPress={() => router.push(featureRoute(article.slug))}>
              <Image source={featureImage(article.image_path)} accessibilityLabel={article.image_alt || article.title} contentFit="cover" style={styles.cover} />
              <View style={styles.cardCopy}><AppText style={styles.cardTitle}>{article.title}</AppText>{article.lead ? <AppText style={styles.cardLead} numberOfLines={2}>{article.lead}</AppText> : null}</View>
            </Pressable>
            <View style={styles.cardFooter}><FeatureBookmark article={article} /></View>
          </View>)}</View>
        </View>
      </View> : null}
    </>}
  </BookScreen>;
}
const styles = StyleSheet.create({
  page: { paddingHorizontal: 0, paddingTop: 0, width: '100%', maxWidth: 1520, alignSelf: 'center', paddingBottom: 40 },
  hero: { backgroundColor: '#26271F', flexDirection: 'row', alignItems: 'stretch', minHeight: 300 },
  heroCompact: { flexDirection: 'column', padding: 18, gap: 18 },
  heroCopy: { flex: 1.15, minWidth: 0, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 24, gap: 12 },
  heroCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', paddingHorizontal: 0, paddingVertical: 0 },
  heroLabel: { fontFamily: fonts.serif, color: '#D8B568', fontSize: 16, lineHeight: 24 },
  heroTitle: { fontFamily: fonts.serif, color: '#FFF9EF', fontSize: 32, lineHeight: 46, letterSpacing: 1 },
  heroTitleCompact: { fontSize: 25, lineHeight: 38, letterSpacing: 0.5 },
  heroLead: { fontFamily: fonts.serif, color: '#D5D3C8', fontSize: 14, lineHeight: 25 },
  read: { borderColor: '#B69A60', borderWidth: 1, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  readText: { color: '#D8B568', fontFamily: fonts.serif, fontSize: 15 },
  heroVisual: { flex: 1, minWidth: 0, minHeight: 300, overflow: 'hidden', backgroundColor: '#38382C' },
  heroVisualCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%', minHeight: 0, aspectRatio: 2.5 },
  heroImage: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%' },
  previews: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '45%', gap: 8 },
  preview: { width: 58, height: 40, padding: 2, borderWidth: 1, borderColor: 'transparent', borderRadius: 3, backgroundColor: '#26271F' },
  previewActive: { borderColor: '#D8B568' },
  previewImage: { width: '100%', height: '100%' },
  collection: { flexDirection: 'row', paddingHorizontal: 32, paddingTop: 34, gap: 32 },
  collectionCompact: { paddingHorizontal: 18, paddingTop: 26 },
  sidebar: { width: 192, flexShrink: 0 },
  currentSection: { borderLeftWidth: 2, borderLeftColor: colors.gold, paddingVertical: 14, paddingLeft: 18, paddingRight: 8 },
  currentSectionText: { fontFamily: fonts.serif, color: colors.goldDeep, fontSize: 17, lineHeight: 28, fontWeight: '700' },
  sidebarLink: { paddingLeft: 20, paddingRight: 8, paddingVertical: 22, gap: 10 },
  sidebarLinkText: { fontFamily: fonts.serif, color: colors.muted, fontSize: 15, lineHeight: 26 },
  articleSection: { flex: 1, minWidth: 0 },
  sectionTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 26, lineHeight: 40, fontWeight: '700', marginBottom: 20 },
  sectionTitleCompact: { fontSize: 23, lineHeight: 35, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' },
  gridCompact: { alignItems: 'center', justifyContent: 'center' },
  card: { minWidth: 0, maxWidth: 288, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 4, overflow: 'hidden' },
  cardCompact: { maxWidth: 320 },
  cover: { width: '100%', aspectRatio: 1.85, backgroundColor: colors.line },
  cardCopy: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },
  cardTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 18, lineHeight: 29, fontWeight: '700' },
  cardLead: { color: colors.muted, fontSize: 13, lineHeight: 23 },
  cardFooter: { alignItems: 'flex-end', marginTop: 'auto', paddingTop: 8, paddingHorizontal: 10, paddingBottom: 6 },
  pageTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 46, paddingHorizontal: 32, paddingTop: 24 },
  status: { padding: 20 },
  retry: { alignSelf: 'center', padding: 14, minHeight: 44 },
  gold: { color: colors.gold },
});
