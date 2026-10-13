import { useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { FeatureArticleContent } from '@/components/feature-article';
import { INITIAL_FEATURE_SLUGS, refreshFeatures, useFeatures } from '@/data/features';
import { colors } from '@/constants/theme';

export function generateStaticParams() { return INITIAL_FEATURE_SLUGS.map(slug => ({ slug })); }
export default function FeatureDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { articles, loading, error } = useFeatures();
  const article = articles.find(item => item.slug === slug);
  return <BookScreen>{loading ? <EmptyState title="記事を読み込んでいます" description="少しお待ちください。" /> : error ? <View><EmptyState title="記事を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshFeatures()} style={{ padding: 14, alignSelf: 'center' }}><AppText style={{ color: colors.gold }}>もう一度読み込む</AppText></Pressable></View> : article ? <FeatureArticleContent article={article} others={articles.filter(item => item.id !== article.id && item.show_in_list)} /> : <EmptyState title="記事が見つかりません" description="この記事は現在公開されていません。" />}</BookScreen>;
}
