import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Linking, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { EditorialByline } from '@/components/editorial-guide';
import { useEditorialCharacters, type EditorialCharacter } from '@/data/editorial-characters';
import { featureCategoryLabel } from '@/data/feature-categories';
import { AppText } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { type FeatureArticle } from '@/data/features';
import { techniqueById, theoryById } from '@/data/catalog';
import { contentImageUrl } from '@/lib/content-media';
import { featureRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { useAppState } from '@/state/app-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export const FEATURE_IMAGES: Record<string, ImageSourcePropType> = {
  'bundled:feature-coast': require('../../assets/features/coast.webp'),
  'bundled:feature-forest': require('../../assets/features/forest.webp'),
  'bundled:feature-mountain': require('../../assets/features/mountain.webp'),
};
export function featureImage(path: string | null) { return (path && FEATURE_IMAGES[path]) || { uri: path && /^(?:https?:|blob:|data:|file:)/.test(path) ? path : contentImageUrl(path) ?? '' }; }
export function FeatureBookmark({ article }: { article: FeatureArticle }) {
  const { savedFeatureIds, toggleSavedFeature } = useAppState();
  const saved = savedFeatureIds.includes(article.id);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${article.title}を${saved ? '保存から外す' : '保存する'}`} accessibilityState={{ selected: saved }} testID={`feature-save-${article.slug}`} onPress={() => toggleSavedFeature(article.id)} hitSlop={8} style={styles.bookmark}><SymbolView name={{ ios: saved ? 'bookmark.fill' : 'bookmark', android: saved ? 'bookmark' : 'bookmark_border', web: saved ? 'bookmark' : 'bookmark_border' }} fallback={<AppText style={styles.bookmarkText}>{saved ? '▣' : '▯'}</AppText>} size={22} tintColor={colors.gold} /><AppText style={styles.bookmarkLabel}>{saved ? '保存済み' : '保存'}</AppText></Pressable>;
}
function InlineText({ text }: { text: string }) {
  return <AppText style={styles.paragraph}>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => <AppText key={index} style={part.startsWith('**') ? styles.bold : styles.paragraph}>{part.startsWith('**') ? part.slice(2, -2) : part}</AppText>)}</AppText>;
}
export function FeatureBody({ body }: { body: string }) {
  return <View testID="feature-body" style={styles.body}>{body.replace(/\r\n/g, '\n').split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const heading = /^(#{1,3})\s+([\s\S]+)$/.exec(block);
    if (heading) return <View key={index} testID="feature-section-heading" style={styles.headingBlock}><AppText accessibilityRole="header" aria-level={heading[1].length === 3 ? 3 : 2} style={[styles.heading, heading[1].length === 3 && styles.subheading]}>{heading[2]}</AppText></View>;
    if (/^[-*]\s/.test(block)) return <View key={index} style={styles.list}>{block.split('\n').map((line, lineIndex) => <View key={lineIndex} style={styles.listRow}><AppText style={styles.bullet}>•</AppText><View style={styles.listText}><InlineText text={line.replace(/^[-*]\s+/, '')} /></View></View>)}</View>;
    if (/^>\s?/.test(block)) return <View key={index} style={styles.quote}><InlineText text={block.replace(/^>\s?/gm, '')} /></View>;
    return <InlineText key={index} text={block} />;
  })}</View>;
}
export function FeatureArticleContent({ article, preview = false, others = [], characters }: { article: FeatureArticle; preview?: boolean; others?: FeatureArticle[]; characters?: EditorialCharacter[] }) {
  const router = useRouter();
  const publicCharacters = useEditorialCharacters(!characters);
  const character = (characters ?? publicCharacters.characters).find(item => item.id === article.editorial_character_id && item.status === 'published');
  const relatedFeatures = article.related_feature_ids.length ? article.related_feature_ids.map(id => others.find(item => item.id === id)).filter((item): item is FeatureArticle => Boolean(item)) : others;
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const techniques = article.related_technique_ids.map(id => techniqueById.get(id)).filter(item => item && item.title !== '完全版の処世術');
  const theories = article.related_theory_ids.map(id => theoryById.get(id)).filter(item => item && item.title !== '完全版の理論');
  return <View style={styles.article} testID="feature-article">
    <View style={styles.articleHeader}>{article.category_id ? <AppText style={styles.category}>{featureCategoryLabel(article.category_id)}</AppText> : null}<AppText style={[styles.articleTitle, compact && styles.articleTitleCompact]} accessibilityRole="header" aria-level={1}>{article.title}</AppText>{article.lead ? <AppText style={styles.lead}>{article.lead}</AppText> : null}{!preview ? <FeatureBookmark article={article} /> : null}</View>
    <Image source={featureImage(article.image_path)} accessibilityLabel={article.image_alt || article.title} contentFit="cover" style={[styles.articleImage, compact && styles.articleImageCompact]} />
    <View style={styles.readingColumn}><EditorialByline character={character} preview={preview} /><FeatureBody body={article.body} />
      {article.source_references.length ? <View style={styles.related} testID="feature-references"><AppText style={styles.relatedHeading} accessibilityRole="header" aria-level={2}>参考文献・出典</AppText>{article.source_references.map((reference, index) => <View key={index} style={styles.reference}><Pressable accessibilityRole={reference.url ? 'link' : undefined} accessibilityLabel={reference.title} disabled={!reference.url || preview} onPress={() => reference.url && void Linking.openURL(reference.url)}><AppText style={[styles.relatedTitle, reference.url && styles.category]}>{reference.title}{reference.url ? ' ↗' : ''}</AppText></Pressable>{reference.note ? <AppText style={styles.referenceNote}>{reference.note}</AppText> : null}</View>)}</View> : null}
      {techniques.length || theories.length ? <AppText accessibilityRole="header" aria-level={2} style={styles.knowledgeHeading}>この記事に関連する知識</AppText> : null}
      {techniques.length ? <View style={styles.related}><AppText style={styles.relatedHeading} accessibilityRole="header" aria-level={2}>関連する処世術</AppText>{techniques.map(item => item ? <Pressable key={item.id} accessibilityRole="link" onPress={() => !preview && router.push(techniqueRoute(item.id))} style={styles.relatedRow}><AppText style={styles.relatedTitle}>{item.title}</AppText><AppText style={styles.arrow}>→</AppText></Pressable> : null)}</View> : null}
      {theories.length ? <View style={styles.related}><AppText style={styles.relatedHeading} accessibilityRole="header" aria-level={2}>関連する理論</AppText>{theories.map(item => item ? <Pressable key={item.tagId} accessibilityRole="link" onPress={() => !preview && router.push(theoryRoute(item.tagId))} style={styles.relatedRow}><AppText style={styles.relatedTitle}>{item.title}</AppText><AppText style={styles.arrow}>→</AppText></Pressable> : null)}</View> : null}
      {!preview && relatedFeatures.length ? <View style={styles.related}><AppText style={styles.relatedHeading} accessibilityRole="header" aria-level={2}>あわせて読みたい</AppText>{relatedFeatures.slice(0, 2).map(item => <Pressable key={item.id} accessibilityRole="link" onPress={() => router.push(featureRoute(item.slug))} style={styles.relatedRow}><AppText style={styles.relatedTitle}>{item.title}</AppText><AppText style={styles.arrow}>→</AppText></Pressable>)}</View> : null}
      {!preview ? <Pressable accessibilityRole="link" onPress={() => router.push('/features')} style={styles.back}><AppText style={styles.arrow}>← 特集一覧へ</AppText></Pressable> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  category: { color: colors.goldDeep, fontSize: 13, lineHeight: 23 }, knowledgeHeading: { marginTop: 46, fontFamily: fonts.serif, fontSize: 25, lineHeight: 38 }, reference: { marginBottom: 16, gap: 6 }, referenceNote: { color: colors.muted, fontSize: 13, lineHeight: 24 },
  article: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 36 }, articleHeader: { alignItems: 'center', paddingTop: 30, paddingBottom: 28, gap: 20 }, articleTitle: { maxWidth: 890, fontFamily: fonts.serif, color: colors.ink, fontSize: 42, lineHeight: 64, textAlign: 'center' }, articleTitleCompact: { fontSize: 28, lineHeight: 44 }, lead: { maxWidth: 780, fontFamily: fonts.serif, fontSize: 16, lineHeight: 30, color: colors.inkSoft, textAlign: 'center' }, articleImage: { width: '100%', aspectRatio: 2.2, borderRadius: 16, backgroundColor: colors.line }, articleImageCompact: { aspectRatio: 1.5, borderRadius: 10 }, readingColumn: { width: '100%', maxWidth: 740, alignSelf: 'center', marginTop: 36 }, body: { gap: 22 }, paragraph: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 34, color: colors.ink, letterSpacing: 0.25 }, bold: { fontWeight: '700' }, headingBlock: { borderLeftWidth: 1, borderLeftColor: colors.gold, paddingLeft: 18, paddingVertical: 4, marginTop: 22 }, heading: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 40, color: colors.ink }, subheading: { fontSize: 20, lineHeight: 34 }, list: { gap: 8 }, listRow: { flexDirection: 'row', gap: 12 }, bullet: { color: colors.gold, fontSize: 20, lineHeight: 34 }, listText: { flex: 1 }, quote: { borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 18 }, related: { marginTop: 46, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 24 }, relatedHeading: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 34, marginBottom: 16 }, relatedRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, relatedTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 16, lineHeight: 27 }, arrow: { color: colors.gold, fontSize: 15 }, back: { marginTop: 30, paddingVertical: 12, minHeight: 44 }, bookmark: { minHeight: 44, flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 6 }, bookmarkText: { color: colors.gold, fontSize: 23 }, bookmarkLabel: { color: colors.gold, fontSize: 12 }, saved: { fontWeight: '700' },
});
