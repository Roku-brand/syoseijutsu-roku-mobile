import { useEffect, useRef, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { featureImage } from '@/components/feature-article';
import { featureCover } from '@/data/feature-covers';
import { colors, fonts } from '@/constants/theme';
import { useFeatures, refreshFeatures } from '@/data/features';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { featureRoute } from '@/navigation/app-routes';
import { FEATURE_CATEGORIES, type FeatureCategoryFilter } from '@/data/feature-categories';
import { FEATURE_SERIES, GENERATIONAL_CONCERNS, LIFE_STAGES } from '@/data/feature-series';

import { FeatureVisual } from '@/components/feature-visual';
import { FeatureCard } from '@/components/feature-card';
import { EDITORIAL_INTRODUCTION, EDITORIAL_PRODUCER } from '@/data/editorial-policy';

const FEATURE_TABS = [{ id: 'all', label: 'すべて' }, ...FEATURE_CATEGORIES, FEATURE_SERIES[1]] as const;
type FeatureTab = FeatureCategoryFilter | typeof GENERATIONAL_CONCERNS;

export default function FeaturesScreen() {
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series?: string }>();
  const { width } = useHydratedWindowDimensions();
  const { articles, loading, error } = useFeatures();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<FeatureTab>(series === GENERATIONAL_CONCERNS ? GENERATIONAL_CONCERNS : 'all');
  const tabListRef = useRef<ScrollView>(null);
  const showConcerns = tab === GENERATIONAL_CONCERNS;
  const compact = width < 700;
  const columns = width >= 1280 ? 3 : width >= 700 ? 2 : 1;
  const editorials = articles.filter(article => article.series_id === 'editorial');
  const featured = editorials.filter(article => article.is_featured);
  const hero = featured.find(article => article.id === selected) ?? featured[0];
  const listed = editorials.filter(article => article.show_in_list);
  const filtered = tab === 'all' ? listed.filter(article => article.id !== hero?.id) : listed.filter(article => article.category_id === tab);
  const concerns = articles.filter(article => article.series_id === GENERATIONAL_CONCERNS && article.show_in_series);
  useEffect(() => { if (selected && !featured.some(item => item.id === selected)) setSelected(null); }, [selected, featured]);
  return <BookScreen contentContainerStyle={styles.page} testID="features-page">
    {loading ? <EmptyState title="特集を読み込んでいます" description="少しお待ちください。" /> : error ? <View style={styles.status}><EmptyState title="特集を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshFeatures()} style={styles.retry}><AppText style={styles.gold}>もう一度読み込む</AppText></Pressable></View> : !articles.length ? <EmptyState title="特集" description="現在公開中の特集はありません。" /> : <>
      {hero ? <View style={[styles.hero, compact && styles.heroCompact]} testID="features-hero">
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <AppText style={styles.heroLabel}>特集</AppText>
          <AppText style={[styles.heroTitle, compact && styles.heroTitleCompact]} numberOfLines={compact ? 3 : undefined} accessibilityRole="header" accessibilityLabel={hero.title} aria-level={1}>{hero.title === '押さえておくべき5つの処世術指針' ? '押さえておくべき\n5つの処世術指針' : hero.title}</AppText>
          {!compact && hero.lead ? <AppText style={styles.heroLead} numberOfLines={2}>{hero.lead}</AppText> : null}
          <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を読む`} onPress={() => router.push(featureRoute(hero.slug))} style={[styles.read, compact && styles.readCompact]}><AppText style={[styles.readText, compact && styles.readTextCompact]}>読む →</AppText></Pressable>
        </View>
        <Pressable accessibilityRole="link" accessibilityLabel={`${hero.title}を開く`} onPress={() => router.push(featureRoute(hero.slug))} style={[styles.heroVisual, compact && styles.heroVisualCompact]}><FeatureVisual article={hero} compact={compact} style={styles.heroImage} /></Pressable>
        {featured.length > 1 ? <View style={styles.previews}>{featured.map(article => <Pressable key={article.id} accessibilityRole="button" accessibilityLabel={`ヒーローに${article.title}を表示`} accessibilityState={{ selected: article.id === hero.id }} onPress={() => setSelected(article.id)} style={[styles.preview, article.id === hero.id && styles.previewActive]}><Image source={featureCover(article)?.source ?? featureImage(article.image_path)} accessibilityLabel={article.title} contentFit="cover" style={styles.previewImage} /></Pressable>)}</View> : null}
      </View> : <AppText accessibilityRole="header" aria-level={1} style={styles.pageTitle}>特集</AppText>}
      <View style={[styles.collection, compact && styles.collectionCompact]}>
        <ScrollView ref={tabListRef} horizontal showsHorizontalScrollIndicator={false} testID="feature-category-tabs" accessibilityRole="tablist" accessibilityLabel="特集の分類" aria-orientation="horizontal" style={styles.tabs} contentContainerStyle={styles.tabContent}
          onContentSizeChange={showConcerns && series === GENERATIONAL_CONCERNS ? () => tabListRef.current?.scrollToEnd({ animated: false }) : undefined}>
          {FEATURE_TABS.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.id }} aria-selected={tab === item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabSelected]}>
            <AppText style={[styles.tabText, tab === item.id && styles.tabTextSelected]}>{item.label}</AppText>
          </Pressable>)}
        </ScrollView>
        {showConcerns ? <View testID="generational-concerns">
          <AppText style={[styles.sectionTitle, compact && styles.sectionTitleCompact]} accessibilityRole="header" aria-level={2}>{FEATURE_SERIES[1].label}</AppText>
          <AppText style={styles.introductionText}>学生時代から老後まで。人生の節目で、多くの人が直面する悩みを読み解きます。</AppText>
          {concerns.length ? <View style={styles.stageGrid}>
            {LIFE_STAGES.map(stage => {
              const stageArticles = concerns.filter(article => article.life_stage === stage.id);
              if (!stageArticles.length) return null;
              return <View key={stage.id} testID={`feature-stage-${stage.id}`} style={[styles.stage, { width: columns === 1 ? '100%' : columns === 2 ? '48%' : '31.8%' }]}>
                <AppText style={styles.stageTitle} accessibilityRole="header" aria-level={3}>{stage.label}</AppText>
                {stageArticles.map(article => <Link key={article.id} href={featureRoute(article.slug)} asChild>
                  <Pressable accessibilityRole="link" style={({ pressed }) => [styles.shortArticle, pressed && styles.shortArticlePressed]}>
                    <View style={styles.shortArticleCopy}>
                      <AppText style={styles.shortArticleTitle}>{article.title}</AppText>
                      {article.lead ? <AppText style={styles.shortArticleSubtitle}>{article.lead}</AppText> : null}
                    </View>
                    <AppText aria-hidden style={styles.gold}>→</AppText>
                  </Pressable>
                </Link>)}
              </View>;
            })}
          </View> : <View style={styles.emptyCategory} accessibilityLiveRegion="polite"><AppText style={styles.emptyText}>現在公開中の記事はありません。</AppText></View>}
        </View> : <View>
          <AppText style={[styles.sectionTitle, compact && styles.sectionTitleCompact]} accessibilityRole="header" aria-level={2}>{FEATURE_SERIES[0].label}</AppText>
          <View style={styles.introduction}><AppText style={styles.introductionText}>{EDITORIAL_INTRODUCTION}</AppText><Pressable accessibilityRole="link" accessibilityLabel="処世術禄の編集方針" onPress={() => router.push('/features/editorial-policy')} style={styles.policyLink}><AppText style={styles.policyText}>{EDITORIAL_PRODUCER} · 編集方針 →</AppText></Pressable></View>
          <View style={[styles.grid, compact && styles.gridCompact]} testID="features-grid">{filtered.map(article => <FeatureCard key={article.id} article={article} compact={compact} style={{ width: `${100 / columns - (columns > 1 ? 1.8 : 0)}%` }} />)}</View>
          {!filtered.length ? <View style={styles.emptyCategory} accessibilityLiveRegion="polite"><AppText style={styles.emptyText}>このテーマの記事は、まだありません。</AppText></View> : null}
        </View>}
      </View>
    </>}
  </BookScreen>;
}
const styles = StyleSheet.create({
  introduction: { gap: 4, marginBottom: 12 }, introductionText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 26, color: colors.inkSoft }, policyLink: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start' }, policyText: { fontSize: 12, lineHeight: 22, color: colors.muted },
  page: { paddingHorizontal: 0, paddingTop: 0, width: '100%', maxWidth: 1520, alignSelf: 'center', paddingBottom: 40 },
  hero: { backgroundColor: '#26271F', flexDirection: 'row', alignItems: 'stretch', minHeight: 300 },
  heroCompact: { minHeight: 176 },
  heroCopy: { flex: 1.15, minWidth: 0, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 24, gap: 12 },
  heroCopyCompact: { flex: 1.35, paddingLeft: 16, paddingRight: 12, paddingVertical: 12, gap: 6 },
  heroLabel: { fontFamily: fonts.serif, color: '#D8B568', fontSize: 16, lineHeight: 24 },
  heroTitle: { fontFamily: fonts.serif, color: '#FFF9EF', fontSize: 32, lineHeight: 46, letterSpacing: 1 },
  heroTitleCompact: { fontSize: 18, lineHeight: 26, letterSpacing: 0 },
  heroLead: { fontFamily: fonts.serif, color: '#D5D3C8', fontSize: 14, lineHeight: 25 },
  read: { borderColor: '#B69A60', borderWidth: 1, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  readText: { color: '#D8B568', fontFamily: fonts.serif, fontSize: 15 },
  readCompact: { paddingHorizontal: 16, paddingVertical: 3 },
  readTextCompact: { fontSize: 13, lineHeight: 20 },
  heroVisual: { flex: 1, minWidth: 0, minHeight: 300, overflow: 'hidden', backgroundColor: '#38382C' },
  heroVisualCompact: { minHeight: 176 },
  heroImage: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, width: '100%', height: '100%' },
  previews: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '45%', gap: 8 },
  preview: { width: 58, height: 40, padding: 2, borderWidth: 1, borderColor: 'transparent', borderRadius: 3, backgroundColor: '#26271F' },
  previewActive: { borderColor: '#D8B568' },
  previewImage: { width: '100%', height: '100%' },
  collection: { paddingHorizontal: 32, paddingTop: 20 },
  collectionCompact: { paddingHorizontal: 18, paddingTop: 18 },
  sectionTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 26, lineHeight: 40, fontWeight: '700', marginBottom: 6 },
  sectionTitleCompact: { fontSize: 23, lineHeight: 35, marginBottom: 6 },
  tabs: { flexGrow: 0, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabContent: { gap: 22 },
  tab: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 3, paddingBottom: 10, paddingTop: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: colors.gold },
  tabText: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 25, color: colors.muted },
  tabTextSelected: { color: colors.goldDeep, fontWeight: '700' },
  emptyCategory: { paddingVertical: 34 },
  emptyText: { fontFamily: fonts.serif, color: colors.muted, fontSize: 15, lineHeight: 27 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' },
  gridCompact: { alignItems: 'center', justifyContent: 'center' },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22, marginTop: 16 },
  stage: { minWidth: 0 },
  stageTitle: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, fontWeight: '700', color: colors.goldDeep, borderBottomWidth: 1, borderBottomColor: colors.gold, paddingVertical: 8 },
  shortArticle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  shortArticlePressed: { opacity: 0.7 },
  shortArticleCopy: { flex: 1, minWidth: 0 },
  shortArticleTitle: { fontFamily: fonts.serif, fontWeight: '700', fontSize: 16, lineHeight: 25, color: colors.ink },
  shortArticleSubtitle: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 22, color: colors.inkSoft },
  pageTitle: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 46, paddingHorizontal: 32, paddingTop: 24 },
  status: { padding: 20 },
  retry: { alignSelf: 'center', padding: 14, minHeight: 44 },
  gold: { color: colors.gold },
});
