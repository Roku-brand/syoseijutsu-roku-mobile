import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui';
import { FeatureBookmark, featureImage } from '@/components/feature-article';
import { colors, fonts } from '@/constants/theme';
import type { FeatureArticle } from '@/data/features';
import { featureCategoryLabel } from '@/data/feature-categories';
import { featureRoute } from '@/navigation/app-routes';

export function FeatureCard({ article, compact, style }: { article: FeatureArticle; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  return <View style={[styles.card, compact && styles.compact, style]} testID="feature-card"><Pressable accessibilityRole="link" accessibilityLabel={`${article.title}を読む`} onPress={() => router.push(featureRoute(article.slug))}><Image source={featureImage(article.image_path)} accessibilityLabel={article.image_alt || article.title} contentFit="cover" style={styles.cover} /><View style={styles.copy}>{article.category_id ? <AppText style={styles.category}>{featureCategoryLabel(article.category_id)}</AppText> : null}<AppText style={styles.title}>{article.title}</AppText>{article.lead ? <AppText style={styles.lead} numberOfLines={2}>{article.lead}</AppText> : null}</View></Pressable><View style={styles.footer}><FeatureBookmark article={article} /></View></View>;
}
const styles = StyleSheet.create({ card: { minWidth: 0, maxWidth: 288, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 4, overflow: 'hidden' }, compact: { maxWidth: 320 }, cover: { width: '100%', aspectRatio: 1.85, backgroundColor: colors.line }, copy: { paddingHorizontal: 14, paddingTop: 14, gap: 10 }, category: { fontSize: 11, color: colors.goldDeep, lineHeight: 18 }, title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 18, lineHeight: 29, fontWeight: '700' }, lead: { color: colors.muted, fontSize: 13, lineHeight: 23 }, footer: { alignItems: 'flex-end', marginTop: 'auto', paddingTop: 8, paddingHorizontal: 10, paddingBottom: 6 } });
