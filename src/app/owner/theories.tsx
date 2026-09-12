import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES } from '@/navigation/app-routes';
import { archiveTheory, applyTheory, fetchOwnerTheories, publishTheory, seedOwnerTheoriesIfEmpty } from '@/data/owner-theories';
import type { TheoryCard } from '@/data/types';

type EditableTheory = Omit<TheoryCard, 'status'> & { displayOrder?: number };
type Row = EditableTheory & { status?: string };
const blank = (): EditableTheory => ({ tagId: 'theory-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10), title: '', summary: '', categoryId: 'psychology', categoryTitle: '心理学', aliases: [], relatedTheoryIds: [] });

export default function OwnerTheoriesScreen() {
  const { loading, user, role } = useAuth();
  const { refreshPublishedContent } = useAccess();
  const { width } = useHydratedWindowDimensions();
  const [items, setItems] = useState<Row[]>([]);
  const [draft, setDraft] = useState<EditableTheory | null>(null);
  const [query, setQuery] = useState('');
  const [aliases, setAliases] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [confirmation, setConfirmation] = useState<'publish' | 'archive' | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<EditableTheory | null>(null);
  const select = (item: EditableTheory) => {
    setDraft({ ...item }); setAliases((item.aliases ?? []).join('、'));
    setDirty(false); setConfirmation(null); setPending(null); setError(''); setMessage('');
  };
  useEffect(() => {
    if (role !== 'owner') return;
    let active = true;
    void (async () => {
      try {
        await seedOwnerTheoriesIfEmpty();
        const next = await fetchOwnerTheories();
        if (active) { setItems(next); const first = next.find((item) => item.status !== 'archived'); if (first) select(first); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : '読み込めませんでした。'); }
      finally { if (active) setFetching(false); }
    })();
    return () => { active = false; };
  }, [role]);
  const visible = useMemo(() => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => item.status !== 'archived' && words.every((word) => [item.title, item.summary, item.categoryTitle, ...(item.aliases ?? [])].join(' ').toLocaleLowerCase().includes(word)));
  }, [items, query]);
  const categories = useMemo(() => {
    const result = new Map<string, string>([['psychology', '心理学']]);
    items.forEach((item) => result.set(item.categoryId, item.categoryTitle));
    return [...result];
  }, [items]);
  const choose = (item: EditableTheory) => { if (busy) return; if (dirty) setPending(item); else select(item); };
  const update = (patch: Partial<EditableTheory>) => { if (!draft) return; setDraft({ ...draft, ...patch }); setDirty(true); setConfirmation(null); };
  const existing = items.some((item) => item.tagId === draft?.tagId && item.status !== 'archived');
  const execute = async () => {
    if (!draft || !confirmation || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (confirmation === 'archive') {
        await archiveTheory(draft.tagId);
        setItems((current) => current.map((item) => item.tagId === draft.tagId ? { ...item, status: 'archived' } : item));
        setDraft(null); setDirty(false); setConfirmation(null);
        setMessage('公開から削除しました。データはアーカイブとして保持されます。');
        await refreshPublishedContent();
      } else {
        const saved = await publishTheory({ ...draft, title: draft.title.trim(), aliases: aliases.split(/[,、\n]/).map((value) => value.trim()).filter(Boolean) });
        applyTheory(saved);
        setItems((current) => [...current.filter((item) => item.tagId !== saved.tagId), saved]);
        select(saved);
        setMessage('公開しました。Web版・アプリ版の次回同期で反映されます。');
        await refreshPublishedContent();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '操作を完了できませんでした。'); }
    finally { setBusy(false); }
  };
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="管理者専用です" description="オーナー権限が必要です。" /></Screen>;
  return <Screen contentContainerStyle={styles.screen}>
    <AppText variant="label" style={styles.eyebrow}>OWNER CONTENT</AppText>
    <AppText variant="serif" style={styles.title}>理論の管理</AppText>
    <AppText style={styles.muted}>理論を選んで編集し、内容を確認して公開します。</AppText>
    <View style={styles.actions}>
      <SecondaryButton disabled={busy || dirty} onPress={() => router.push(APP_ROUTES.ownerContent)}>処世術を管理する</SecondaryButton>
      <PrimaryButton disabled={busy || fetching} onPress={() => choose(blank())}>＋ 新規理論</PrimaryButton>
    </View>
    {error ? <View style={styles.error}><AppText accessibilityRole="alert">{error}</AppText></View> : null}
    {message ? <View style={styles.message}><AppText accessibilityLiveRegion="polite">{message}</AppText></View> : null}
    {pending ? <View style={styles.confirmation}>
      <AppText>未公開の編集内容があります。破棄して切り替えますか？</AppText>
      <View style={styles.actions}><SecondaryButton onPress={() => setPending(null)}>編集を続ける</SecondaryButton><SecondaryButton onPress={() => select(pending)}>破棄して切り替える</SecondaryButton></View>
    </View> : null}
    <View style={[styles.layout, width < 900 && styles.stacked]}>
      <View style={[styles.list, width < 900 && styles.mobileList]}>
        <AppText variant="label">理論一覧 · {visible.length}件</AppText>
        <TextInput accessibilityLabel="理論を検索" placeholder="タイトル・別名・カテゴリで検索" value={query} onChangeText={setQuery} style={styles.input} />
        {query ? <Pressable accessibilityRole="button" onPress={() => setQuery('')}><AppText style={styles.eyebrow}>検索をクリア</AppText></Pressable> : null}
        <FlatList data={visible} keyExtractor={(item) => item.tagId} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<AppText style={styles.muted}>{fetching ? '読み込み中…' : '一致する理論がありません。'}</AppText>}
          renderItem={({ item }) => <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ selected: draft?.tagId === item.tagId }} onPress={() => choose(item)} style={[styles.row, draft?.tagId === item.tagId && styles.selected]}>
            <AppText style={styles.rowTitle}>{item.title}</AppText><AppText style={styles.muted}>{item.categoryTitle} · 公開中</AppText>
          </Pressable>} />
      </View>
      <View style={styles.editor}>
        {draft ? <>
          <AppText variant="serif" style={styles.editorTitle}>{existing ? '理論を編集' : '新しい理論'}</AppText>
          <AppText style={styles.muted}>{dirty ? '未公開の変更があります' : existing ? '公開中' : 'タイトルと概要を入力してください'} · ID入力は不要です</AppText>
          <Field label="タイトル（必須）" value={draft.title} disabled={busy} onChange={(title) => update({ title })} />
          <Field label="概要" value={draft.summary} disabled={busy} onChange={(summary) => update({ summary })} multi />
          <AppText variant="label">カテゴリ</AppText>
          <View style={styles.actions}>{categories.map(([id, title]) => <Pressable key={id} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: draft.categoryId === id }} onPress={() => update({ categoryId: id, categoryTitle: title })} style={[styles.chip, draft.categoryId === id && styles.selected]}><AppText>{title}</AppText></Pressable>)}</View>
          <Field label="別名（読点・カンマで区切る）" value={aliases} disabled={busy} onChange={(value) => { setAliases(value); setDirty(true); setConfirmation(null); }} />
          {confirmation ? <View style={styles.confirmation}><AppText>{confirmation === 'archive' ? 'この理論を公開から削除します。データはアーカイブとして保持します。' : 'この内容をすべてのユーザーに公開します。'}</AppText><View style={styles.actions}><SecondaryButton disabled={busy} onPress={() => setConfirmation(null)}>キャンセル</SecondaryButton><PrimaryButton disabled={busy} onPress={() => void execute()}>{busy ? '処理中…' : confirmation === 'archive' ? '削除を確定' : '公開を確定'}</PrimaryButton></View></View> : null}
          <View style={styles.actions}><PrimaryButton disabled={busy || !draft.title.trim()} onPress={() => setConfirmation('publish')}>内容を確認して公開</PrimaryButton></View>
          {existing ? <Pressable accessibilityRole="button" disabled={busy} style={styles.deleteButton} onPress={() => setConfirmation('archive')}><AppText style={styles.deleteText}>この理論を削除…</AppText></Pressable> : null}
        </> : <EmptyState title="理論を選択してください" description="一覧から選ぶか、「新規理論」で追加できます。" />}
      </View>
    </View>
  </Screen>;
}
function Field({ label, value, onChange, multi = false, disabled }: { label: string; value: string; onChange: (value: string) => void; multi?: boolean; disabled?: boolean }) {
  return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} editable={!disabled} value={value} onChangeText={onChange} multiline={multi} style={[styles.input, multi && styles.multi]} /></View>;
}
const styles = StyleSheet.create({
  screen: { width: '100%', maxWidth: 1320, alignSelf: 'center', padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.gold, fontSize: 12 }, title: { fontSize: 30 }, editorTitle: { fontSize: 24 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 20 },
  layout: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' }, stacked: { flexDirection: 'column' },
  list: { width: 320, height: 640, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  mobileList: { width: '100%', height: 260 },
  row: { padding: spacing.md, gap: 5, borderBottomWidth: 1, borderColor: colors.line, minHeight: 72 },
  rowTitle: { fontSize: 15, fontWeight: '700' }, selected: { backgroundColor: '#F3E9D3', borderColor: colors.gold },
  editor: { flex: 1, width: '100%', minWidth: 0, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  field: { gap: 7 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, minHeight: 46, color: colors.ink, backgroundColor: colors.paper },
  multi: { minHeight: 180, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { minHeight: 44, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  confirmation: { padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: 8, backgroundColor: '#FBF4E3' },
  message: { padding: spacing.md, backgroundColor: '#EAF2DF', borderRadius: 8 }, error: { padding: spacing.md, backgroundColor: '#FDE9E4', borderRadius: 8 },
  deleteButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: spacing.md }, deleteText: { color: '#A63F32', fontSize: 13 },
});
