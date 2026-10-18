import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { PersonalContentCard, type PersonalContentRow } from './personal-content-card';
import { PersonalSectionHeading } from './personal-section-heading';
import { MoreCards } from './folder-fronts';
import { AppText } from './ui';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { techniqueById, theoryById } from '@/data/catalog';
import { useFeatures } from '@/data/features';
import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
import { isLockedTheoryShell } from '@/data/theory-display';
import { uniqueSavedIds } from '@/data/personal-dashboard';
import { featureRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { colors } from '@/constants/theme';
import { personalLibrary } from './personal-library-theme';

export function HistoryContent() {
  'use no memo';
  const router = useRouter();
  const { historyIds, featureHistoryIds } = useAppState();
  const { catalogRevision, isPaid } = useAccess();
  const [kind, setKind] = useState<PersonalContentRow['kind']>('technique');
  const [limit, setLimit] = useState(20);
  const { articles, loading, error } = useFeatures(kind === 'feature' && featureHistoryIds.length > 0);
  const rows = useMemo(() => kind === 'feature'
    ? uniqueSavedIds(featureHistoryIds).map(id => articles.find(article => article.id === id)).filter(article => Boolean(article)).map(article => ({ kind: 'feature' as const, id: article!.id, title: article!.title, label: '特集', description: article!.lead, category: 'feature', article: article! }))
    : uniqueSavedIds(historyIds).map(resolveRow).filter((row): row is PersonalContentRow => Boolean(row && row.kind === kind)),
  [articles, catalogRevision, featureHistoryIds, historyIds, kind]);
  const pending = kind === 'theory' && isPaid && historyIds.some(id => { const theory = theoryById.get(id); return theory && isLockedTheoryShell(theory); });
  const empty = pending ? '完全版データを確認中' : kind === 'feature' && featureHistoryIds.length > 0
    ? loading ? '特集を確認中' : error ? '特集を読み込めませんでした。通信環境をご確認ください。' : '閲覧した特集は現在公開されていません' : 'まだ閲覧履歴はありません';
  return <View testID="history-content">
    <PersonalSectionHeading title="閲覧履歴" subtitle="以前読んだ知識を振り返る" />
    <View accessibilityRole="tablist" accessibilityLabel="閲覧履歴の種類" style={styles.tabs}>{([{ kind: 'technique', label: '処世術' }, { kind: 'theory', label: '理論' }, { kind: 'feature', label: '特集' }] as const).map(item => <Pressable key={item.kind} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: kind === item.kind }} aria-selected={kind === item.kind} onPress={() => { setKind(item.kind); setLimit(20); }} style={[styles.tab, kind === item.kind && styles.selected]}><AppText style={[styles.label, kind === item.kind && styles.selectedLabel]}>{item.label}</AppText></Pressable>)}</View>
    {rows.length ? rows.slice(0, limit).map(row => <PersonalContentCard key={row.kind + row.id} row={row} onPress={() => router.push(row.kind === 'feature' ? featureRoute(row.article?.slug ?? row.id) : row.kind === 'technique' ? techniqueRoute(row.id) : theoryRoute(row.id))} />) : <AppText style={styles.empty}>{empty}</AppText>}
    <MoreCards remaining={rows.length - limit} onPress={() => setLimit(value => value + 20)} />
  </View>;
}
function resolveRow(id: string): PersonalContentRow | null {
  const card = techniqueById.get(id);
  if (card) return { kind: 'technique', id: card.id, category: card.categoryKey, label: card.categoryName, title: card.title, description: card.essence || card.subtitle || card.subcategory };
  if (isRetiredTheoryId(id)) return { kind: 'theory', id, category: 'practical-wisdom', label: '公開終了', title: RETIRED_THEORY_TITLE, description: '閲覧履歴の記録は保持されています。' };
  const theory = theoryById.get(id);
  return theory && !isLockedTheoryShell(theory) ? { kind: 'theory', id: theory.tagId, category: theory.categoryId, label: theory.categoryTitle, title: theory.title, description: theory.summary || theory.categoryTitle } : null;
}
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 20 }, tab: { flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  selected: { backgroundColor: personalLibrary.green, borderColor: personalLibrary.green }, label: { color: personalLibrary.green, fontSize: 13, fontWeight: '600' }, selectedLabel: { color: colors.white }, empty: { paddingVertical: 26, color: colors.muted, fontSize: 14 },
});
