import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { categoryMeta } from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useAccess } from '@/access/access-state';
import { categoryPalette, colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { refreshFeatures, useFeatures } from '@/data/features';
import { featureRoute } from '@/navigation/app-routes';
import { useAppState } from '@/state/app-state';
import { libraryItemKey } from '@/state/library-folders';
import { buildSavedContentRows } from '@/data/saved-content-rows';
import { SavedKindTabs, type SavedKind } from './saved-kind-tabs';
import { SavedKnowledgeCard } from './saved-knowledge-card';
import { MoreCards } from './folder-fronts';
import { AppText } from './ui';

export function LibraryContent({ category, kind }: { category?: string; kind?: string } = {}) {
  'use no memo';
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const [scope, setScope] = useState(category);
  useEffect(() => { setScope(category); setLimit(20); }, [category]);
  const { catalogRevision } = useAccess();
  const { savedIds, savedTheoryIds, savedFeatureIds } = useAppState();
  const { articles: featureArticles, loading, error } = useFeatures(savedFeatureIds.length > 0);
  const [selectedKind, setSelectedKind] = useState<SavedKind>(kind === 'theory' || kind === 'feature' ? kind : 'technique');
  const [limit, setLimit] = useState(20);
  useEffect(() => { setSelectedKind(kind === 'theory' || kind === 'feature' ? kind : 'technique'); setLimit(20); }, [kind]);
  const items = useMemo(() => buildSavedContentRows({ savedIds, savedTheoryIds, savedFeatureIds, featureArticles }), [catalogRevision, savedIds, savedTheoryIds, savedFeatureIds, featureArticles]);
  const counts: Record<SavedKind, number> = {
    technique: items.filter(item => item.kind === 'technique').length,
    theory: items.filter(item => item.kind === 'theory').length,
    feature: items.filter(item => item.kind === 'feature').length,
  };
  const visible = items.filter(item => item.kind === selectedKind && (selectedKind !== 'technique' || !scope || item.category === scope));
  const scoped = selectedKind === 'technique' && Boolean(scope);
  const scopeLabel = scope ? categoryMeta[scope]?.label ?? scope : '';
  const scopePalette = scope ? categoryPalette[scope] : undefined;
  const clearScope = () => { setScope(undefined); setLimit(20); router.setParams({ category: undefined }); };
  const selectKind = (next: SavedKind) => { setSelectedKind(next); setLimit(20); };
  const label = selectedKind === 'technique' ? '処世術' : selectedKind === 'theory' ? '理論' : '特集';
  const featurePending = selectedKind === 'feature' && savedFeatureIds.length > 0 && (loading || Boolean(error));

  return <View testID="library-organizer" style={styles.content}>
    <View style={styles.heading}>
      {width >= 700 ? <AppText accessibilityRole="header" aria-level={2} style={styles.title}>お気に入り</AppText> : null}
      <AppText style={styles.lead}>あとで読み返したい知恵を、種類ごとに見つける</AppText>
    </View>
    <SavedKindTabs selected={selectedKind} onSelect={selectKind} counts={counts} />
    {scoped && scopePalette ? (
      <Pressable accessibilityRole="button" accessibilityLabel={`${scopeLabel}の絞り込みを解除`} onPress={clearScope}
        style={({ pressed }) => [styles.scope, { borderColor: scopePalette.soft, backgroundColor: pressed ? scopePalette.tint : colors.surface }]}>
        <AppText style={styles.scopeLabel}>{scopeLabel}</AppText>
        <AppText aria-hidden accessibilityElementsHidden style={[styles.scopeClose, { color: scopePalette.accent }]}>×</AppText>
      </Pressable>
    ) : null}
    <View style={styles.kindSection}>
      <View aria-hidden accessibilityElementsHidden style={styles.kindMark} />
      <AppText accessibilityRole="header" aria-level={3} style={styles.kindHeading}>{label}</AppText>
      <AppText style={styles.kindCount}>{`・ ${visible.length}件`}</AppText>
    </View>
    {visible.length && !featurePending ? visible.slice(0, limit).map(row => <SavedKnowledgeCard key={libraryItemKey(row.kind, row.id)} row={row}
      onPress={() => router.push(row.kind === 'feature' ? featureRoute(row.article?.slug ?? row.id) : row.kind === 'theory' ? { pathname: '/theory/[id]', params: { id: row.id } } : { pathname: '/card/[id]', params: { id: row.id } })} />)
      : <View testID="library-empty" style={styles.empty}>
        <AppText style={styles.emptyTitle}>{selectedKind === 'feature' && savedFeatureIds.length && loading ? '特集を読み込んでいます' : selectedKind === 'feature' && savedFeatureIds.length && error ? '特集を読み込めませんでした' : scoped ? `${scopeLabel}の保存はまだありません` : `${label}のお気に入りはまだありません`}</AppText>
        <AppText style={styles.lead}>{scoped ? 'ほかの分類の処世術も、まとめて読み返せます。' : '気になった知恵の「保存」を押すと、ここに残せます。'}</AppText>
        <Pressable accessibilityRole="button" onPress={selectedKind === 'feature' && error ? () => void refreshFeatures() : scoped ? clearScope : () => router.push(selectedKind === 'feature' ? '/features' : selectedKind === 'theory' ? '/theories' : '/techniques')} style={styles.action}><AppText style={styles.actionText}>{selectedKind === 'feature' && error ? 'もう一度読み込む' : scoped ? 'すべての処世術を見る' : `${label}を探す ›`}</AppText></Pressable>
      </View>}
    <MoreCards remaining={visible.length - limit} onPress={() => setLimit(value => value + 20)} />
  </View>;
}

const styles = StyleSheet.create({
  scope: { alignSelf: 'flex-start', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderRadius: radius.pill, ...shadow.card },
  scopeLabel: { fontSize: 13, lineHeight: 22, color: colors.inkSoft, fontWeight: '600' },
  scopeClose: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  action: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignSelf: 'flex-start' },
  actionText: { color: colors.goldDeep, fontSize: 13, lineHeight: 22, fontWeight: '600' },
  content: { width: '100%', gap: 14 },
  heading: { gap: 4, marginBottom: 2 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600' },
  lead: { color: colors.inkSoft, fontSize: 13, lineHeight: 22 },
  kindSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  kindMark: { width: 3, height: 22, backgroundColor: colors.gold },
  kindHeading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  kindCount: { color: colors.muted, fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 },
  empty: { minHeight: 140, justifyContent: 'center', padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
});
