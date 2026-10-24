import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { categoryMeta, techniqueById, theoryById } from '@/data/catalog';
import { techniqueCategoryImages } from '@/data/category-images';
import { readingContentId, type ReadingContent } from '@/data/reading-recommendations';
import { getTheoryCoverSummary, isLockedTheoryShell } from '@/data/theory-display';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useAppState } from '@/state/app-state';
import { APP_ROUTES, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { colors, fonts } from '@/constants/theme';
import { bookCardShadow } from './book-ui';
import { TechniqueTitle } from './technique-title';

const theoryImage = require('../../assets/home/theory-v2.webp');

/** One reading shelf for Home and My Page, including access filtering and order. */
export function RecentReadingPreview({ railTestID, cardTestID }: { railTestID: string; cardTestID?: string }) {
  const router = useRouter();
  const { desktop, width } = useResponsiveLayout();
  const { accessState, catalogRevision } = useAccess();
  const { historyIds } = useAppState();
  const recent = useMemo<ReadingContent[]>(() => historyIds.flatMap((id): ReadingContent[] => {
    const card = techniqueById.get(id);
    if (card && card.status !== 'locked' && card.title !== '完全版の処世術' && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(id))) return [{ type: 'technique', card }];
    const theory = theoryById.get(id);
    if (theory && !isLockedTheoryShell(theory) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(id))) return [{ type: 'theory', card: theory }];
    return [];
  }).slice(0, 6), [accessState, catalogRevision, historyIds]);
  const cardWidth = desktop ? 250 : Math.min(260, Math.max(210, width * 0.59));

  return recent.length ? (
    <ScrollView horizontal testID={railTestID} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {recent.map(item => <ReadingPreviewCard key={`${item.type}:${readingContentId(item)}`} item={item} width={cardWidth} testID={cardTestID} onPress={() => router.push(item.type === 'technique' ? techniqueRoute(item.card.id) : theoryRoute(item.card.tagId))} />)}
    </ScrollView>
  ) : (
    <Pressable accessibilityRole="link" accessibilityLabel="処世術を探す" onPress={() => router.push(APP_ROUTES.discover)} style={styles.emptyHistory}>
      <Text style={styles.emptyHistoryTitle}>まだ読書の履歴はありません</Text>
      <Text style={styles.emptyHistoryBody}>気になる一枚を読むと、ここから再開できます。　探す →</Text>
    </Pressable>
  );
}

export function ReadingPreviewCard({ item, width, onPress, testID, disabled = false }: { item: ReadingContent; width: number; onPress: () => void; testID?: string; disabled?: boolean }) {
  const category = item.type === 'technique' ? item.card.categoryKey : 'theory';
  const label = item.type === 'technique' ? categoryMeta[item.card.categoryKey].label : '理論';
  return <Pressable testID={testID} accessibilityRole="link" accessibilityLabel={`${item.card.title}を読む`} disabled={disabled} aria-disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => [styles.contentCard, { width }, pressed && styles.pressed]}>
    <Image source={category === 'theory' ? theoryImage : techniqueCategoryImages[category] ?? theoryImage} resizeMode="cover" accessibilityLabel={`${label}のイメージ写真`} style={styles.contentImage} />
    <View style={styles.contentBody}>
      <Text style={[styles.categoryLabel, category === 'theory' && styles.categoryTheory]}>{label}</Text>
      {item.type === 'technique' ? <TechniqueTitle title={item.card.title} minimumFontSize={14} maxLines={2} style={styles.contentTitle} /> : <Text numberOfLines={2} style={styles.contentTitle}>{item.card.title}</Text>}
      <Text numberOfLines={2} style={styles.contentSummary}>{item.type === 'technique' ? item.card.essence || item.card.subtitle : getTheoryCoverSummary(item.card.summary)}</Text>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  rail: { gap: 11, paddingBottom: 4, paddingRight: 16 },
  pressed: { opacity: 0.7 },
  contentCard: { flexGrow: 0, flexShrink: 0, overflow: 'hidden', backgroundColor: '#FFFDF9', borderColor: '#E9E2D8', borderWidth: 1, borderRadius: 14, ...bookCardShadow },
  contentImage: { width: '100%', height: 84, backgroundColor: '#E6E0D5' },
  contentBody: { minHeight: 145, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 10, overflow: 'hidden' },
  categoryLabel: { alignSelf: 'flex-start', color: '#9B6E27', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, borderColor: '#D6BD95', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, backgroundColor: '#FFF8EA' },
  categoryTheory: { color: '#506B86', borderColor: '#A5B8C7', backgroundColor: '#EFF4F7' },
  contentTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, fontWeight: '600', marginTop: 6, minHeight: 52 },
  contentSummary: { color: colors.inkSoft, fontSize: 13, lineHeight: 22, marginTop: 6 },
  emptyHistory: { minHeight: 89, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#E9E2D8', borderRadius: 14, backgroundColor: '#FFFDF9' },
  emptyHistoryTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  emptyHistoryBody: { color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 22, marginTop: 4 },
});
