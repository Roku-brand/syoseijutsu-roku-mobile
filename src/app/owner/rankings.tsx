import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { fetchRankingEditor, publishRanking, type RankingCandidate, type RankingConfig, type RankingDivision } from '@/data/popular-rankings';

export default function OwnerRankingsScreen() {
  const { user, role, loading } = useAuth();
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="この画面はオーナー専用です。" /></Screen>;
  return <RankingEditor />;
}

function RankingEditor() {
  const router = useRouter();
  const [division, setDivision] = useState<RankingDivision>('technique');
  const [saved, setSaved] = useState<RankingConfig[]>([]);
  const [drafts, setDrafts] = useState<RankingConfig[]>([]);
  const [candidates, setCandidates] = useState<(RankingCandidate & { division: RankingDivision })[]>([]);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [slot, setSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [confirmReload, setConfirmReload] = useState(false);
  const config = drafts.find((item) => item.division === division);
  const initial = saved.find((item) => item.division === division);
  const dirty = drafts.some((item) => JSON.stringify(item.content_ids) !== JSON.stringify(saved.find((row) => row.division === item.division)?.content_ids));
  const divisionDirty = Boolean(config && JSON.stringify(config.content_ids) !== JSON.stringify(initial?.content_ids));
  const reload = useCallback(async () => {
    setFetching(true); setError(''); setNotice('');
    try {
      const data = await fetchRankingEditor();
      setSaved(data.configs); setDrafts(data.configs.map((item) => ({ ...item, content_ids: [...item.content_ids] }))); setCandidates(data.candidates);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'ランキングを読み込めませんでした。'); }
    finally { setFetching(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const available = useMemo(() => candidates.filter((item) => item.division === division).sort((a, b) => a.title.localeCompare(b.title, 'ja')), [candidates, division]);
  const byId = useMemo(() => new Map(available.map((item) => [item.id, item])), [available]);
  const changeIds = (ids: string[]) => { setDrafts((items) => items.map((item) => item.division === division ? { ...item, content_ids: ids } : item)); setNotice(''); setError(''); };
  const move = (index: number, offset: number) => {
    if (!config) return;
    const ids = [...config.content_ids];
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    changeIds(ids);
  };
  const publish = async () => {
    if (!config) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const updated = await publishRanking(config);
      setSaved((items) => items.map((item) => item.division === division ? updated : item));
      setDrafts((items) => items.map((item) => item.division === division ? updated : item));
      setNotice(`${division === 'technique' ? '処世術' : '理論'}部門のトップ10を公開しました。`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '公開できませんでした。'); }
    finally { setBusy(false); }
  };
  const pickerItems = available.filter((item) => [item.title, item.category, item.id].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <Screen contentContainerStyle={styles.page} testID="ranking-editor">
    <AppText variant="title">人気ランキング管理</AppText>
    <AppText style={styles.muted}>各部門のトップ10を選び、上下ボタンで順位を変更します。公開中の記事を選択できます。</AppText>
    <View style={styles.tabs}>{(['technique', 'theory'] as const).map((id) => <Button key={id} active={division === id} disabled={busy} onPress={() => { setDivision(id); setNotice(''); setError(''); }}>{id === 'technique' ? '処世術部門' : '理論部門'}</Button>)}</View>
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    {fetching ? <AppText>ランキングを読み込んでいます。</AppText> : config ? <>
      <AppText style={styles.muted}>{divisionDirty ? '未公開の変更があります。' : '公開中のランキング'}　{config.content_ids.length} / 10件</AppText>
      {config.content_ids.map((id, index) => {
        const item = byId.get(id);
        return <View key={id} testID="ranking-editor-row" style={styles.row}>
          <AppText style={styles.rank}>{String(index + 1).padStart(2, '0')}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel={`${index + 1}位の記事を変更`} disabled={busy} onPress={() => { setSlot(index); setQuery(''); }} style={styles.selection}>
            <AppText style={styles.category}>{item?.category ?? '掲載できない記事'}</AppText><AppText style={styles.title}>{item?.title ?? id}</AppText><AppText style={styles.change}>記事を変更 ›</AppText>
          </Pressable>
          <View style={styles.order}><Button label={`${index + 1}位を上へ移動`} disabled={busy || index === 0} onPress={() => move(index, -1)}>↑</Button><Button label={`${index + 1}位を下へ移動`} disabled={busy || index === 9} onPress={() => move(index, 1)}>↓</Button></View>
        </View>;
      })}
      <View style={styles.actions}><Button disabled={busy} onPress={() => router.push('/popular')}>公開画面を見る</Button><Button active disabled={busy || !divisionDirty || config.content_ids.some((id) => !byId.has(id))} onPress={() => void publish()}>{busy ? '公開中…' : 'ランキングを公開'}</Button></View>
      <AppText style={styles.muted}>カテゴリ画像は全記事で共通です。本文やカテゴリ内の並び順は、この画面での順位変更に影響されません。</AppText>
    </> : null}
    <Button disabled={busy || fetching} onPress={() => { if (dirty) setConfirmReload(true); else void reload(); }}>最新の設定を再読み込み</Button>
    {confirmReload ? <View style={styles.confirm}><AppText>未公開の変更を破棄して再読み込みしますか？</AppText><View style={styles.actions}><Button onPress={() => setConfirmReload(false)}>編集を続ける</Button><Button active onPress={() => { setConfirmReload(false); void reload(); }}>破棄して再読み込み</Button></View></View> : null}
    <Modal visible={slot !== null} transparent animationType="fade" onRequestClose={() => setSlot(null)}>
      <View style={styles.scrim}><View accessibilityViewIsModal style={styles.picker}>
        <View style={styles.actions}><AppText variant="title">{slot === null ? '' : slot + 1}位の記事を選択</AppText><Button onPress={() => setSlot(null)}>閉じる</Button></View>
        <TextInput autoFocus accessibilityLabel="ランキング候補を検索" placeholder="タイトル・カテゴリ・IDで検索" value={query} onChangeText={setQuery} style={styles.search} />
        <FlatList data={pickerItems} keyExtractor={(item) => item.id} style={styles.pickerList} keyboardShouldPersistTaps="handled" ListEmptyComponent={<AppText>該当する記事がありません。</AppText>}
          renderItem={({ item }) => {
            const selected = config?.content_ids.includes(item.id);
            return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}を選択`} accessibilityState={{ disabled: selected }} disabled={selected} style={[styles.candidate, selected && styles.disabled]} onPress={() => {
              if (!config || slot === null) return;
              const ids = [...config.content_ids]; ids[slot] = item.id; changeIds(ids); setSlot(null);
            }}><View style={styles.candidateCopy}><AppText style={styles.category}>{item.category}{selected ? '・選択済み' : ''}</AppText><AppText style={styles.title}>{item.title}</AppText><AppText style={styles.muted}>{item.id}</AppText></View></Pressable>;
          }} />
      </View></View>
    </Modal>
  </Screen>;
}
function Button({ children, onPress, disabled, active, label }: { children: string; onPress: () => void; disabled?: boolean; active?: boolean; label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? children} disabled={disabled} onPress={onPress} style={[styles.button, active && styles.active, disabled && styles.disabled]}><AppText style={[styles.buttonText, active && styles.activeText]}>{children}</AppText></Pressable>;
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 960, alignSelf: 'center', gap: 14, padding: 20 }, muted: { fontSize: 12, lineHeight: 20, color: '#706B61' }, tabs: { flexDirection: 'row', gap: 12 }, button: { minHeight: 42, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#CFC5B3', backgroundColor: '#FFFFFF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: '#283B32', borderColor: '#283B32' }, buttonText: { fontSize: 13, fontWeight: '700', color: '#353A33' }, activeText: { color: '#FFFFFF' }, disabled: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E3DCCD', borderRadius: 12, backgroundColor: '#FFFFFF', padding: 12 }, rank: { color: '#94702C', fontSize: 26, width: 36 }, selection: { flex: 1, gap: 3 }, category: { color: '#8A682E', fontSize: 11 }, title: { fontSize: 15, lineHeight: 23, fontWeight: '600' }, change: { color: '#686B65', fontSize: 11 }, order: { gap: 6 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }, error: { color: '#A12D24', fontSize: 13 }, notice: { color: '#27623F', fontSize: 13 }, confirm: { padding: 16, borderWidth: 1, borderColor: '#CDA565', borderRadius: 10, gap: 12 },
  scrim: { flex: 1, backgroundColor: '#00000060', justifyContent: 'center', padding: 18 }, picker: { width: '100%', maxWidth: 760, height: '80%', alignSelf: 'center', padding: 20, gap: 14, borderRadius: 15, backgroundColor: '#FFFCF7' }, search: { borderWidth: 1, borderColor: '#CFC5B3', padding: 12, borderRadius: 8, fontSize: 14 }, pickerList: { flex: 1 }, candidate: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5DED2' }, candidateCopy: { gap: 3 },
});
