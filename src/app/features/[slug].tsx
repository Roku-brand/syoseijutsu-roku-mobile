import { useEffect, useRef } from 'react';
import { useAppState } from '@/state/app-state';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { FeatureArticleContent } from '@/components/feature-article';
import { INITIAL_FEATURE_SLUGS, refreshFeatures, useFeatures } from '@/data/features';
import { colors } from '@/constants/theme';

export function generateStaticParams() { return INITIAL_FEATURE_SLUGS.map(slug => ({ slug })); }
export default function FeatureDetailScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const navigateSection = (section: View) => {
    const content = scrollRef.current?.getInnerViewNode();
    if (content) section.measureLayout(content, (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }), () => undefined);
  };
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { articles, loading, error } = useFeatures();
  const article = articles.find(item => item.slug === slug);
  const { addFeatureHistory } = useAppState();
  useEffect(() => { if (article && !error) addFeatureHistory(article.id); }, [article, error, addFeatureHistory]);
  return <BookScreen scrollRef={scrollRef}>{loading ? <EmptyState title="記事を読み込んでいます" description="少しお待ちください。" /> : error ? <View><EmptyState title="記事を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshFeatures()} style={{ padding: 14, alignSelf: 'center' }}><AppText style={{ color: colors.gold }}>もう一度読み込む</AppText></Pressable></View> : article ? <FeatureArticleContent onNavigateSection={navigateSection} article={article} others={articles.filter(item => item.id !== article.id && (item.show_in_list || article.related_feature_ids.includes(item.id)))} /> : <EmptyState title="記事が見つかりません" description="この記事は現在公開されていません。" />}</BookScreen>;
}
