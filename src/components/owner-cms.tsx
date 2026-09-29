import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { TheoryDetailsEditor } from '@/components/owner-theory-details';
import { ownerCmsStyles as styles } from './owner-cms.styles';
import { archivePersona, fetchOwnerPersonas, savePersona, type OwnerPersona } from '@/data/owner-personas';
import { archiveTechnique, createTechnique, fetchOwnerTechniques, normalizeSnapshot, saveAndPublishTechnique, saveTechniqueDraft, snapshotFromTechnique, type TechniqueContent } from '@/data/owner-content';
import { archiveTheory, fetchOwnerTheories, publishTheory } from '@/data/owner-theories';
import { createTheoryDraft, fetchContentCategories, reorderContent, saveContentCategory, saveTheoryDraft, type ContentCategory, type ContentKind } from '@/data/owner-cms';
import { contentImageUrl, countImageReferences, pickContentImage, removeContentImageIfUnused, uploadContentImage, type ContentImageAsset } from '@/lib/content-media';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { getTechniqueTags } from '@/data/technique-tags';
import { personaRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type OwnerTheory = Awaited<ReturnType<typeof fetchOwnerTheories>>[number];
type Item = OwnerPersona | TechniqueContent | OwnerTheory | ContentCategory;
type Selection = { kind: ContentKind | 'category'; id: string };
const names: Record<ContentKind, string> = { persona: '人物像', technique: '処世術', theory: '理論' };
const statusLabel = (status: string) => status === 'published' ? '公開中' : status === 'draft' ? '下書き' : 'アーカイブ';
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('ja-JP') : '—';

export default function OwnerCmsScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { loading, user, role } = useAuth();
  const { refreshPublishedContent } = useAccess();
  const { width } = useHydratedWindowDimensions();
  const [kind, setKind] = useState<ContentKind>(params.kind === 'theory' ? 'theory' : params.kind === 'technique' ? 'technique' : 'persona');
  const [scope, setScope] = useState('');
  const [query, setQuery] = useState('');
  const [personas, setPersonas] = useState<OwnerPersona[]>([]);
  const [techniques, setTechniques] = useState<TechniqueContent[]>([]);
  const [theories, setTheories] = useState<OwnerTheory[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [draft, setDraft] = useState<Item | null>(null);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [imageAsset, setImageAsset] = useState<ContentImageAsset | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<Selection | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ kind: ContentKind; scope: string } | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<Href | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draggedId = useRef<string | null>(null);
  const draggedCategory = useRef<{ section: 'technique' | 'theory'; id: string } | null>(null);

  const reload = useCallback(async () => {
    setFetching(true);
    try {
      const [p, t, h, c] = await Promise.all([fetchOwnerPersonas(), fetchOwnerTechniques(), fetchOwnerTheories(), fetchContentCategories()]);
      setPersonas(p); setTechniques(t); setTheories(h); setCategories(c);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'コンテンツを読み込めませんでした。'); return false; }
    finally { setFetching(false); }
  }, []);
  useEffect(() => { if (role === 'owner') void reload(); }, [role, reload]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const findItem = (target: Selection): Item | null => target.kind === 'persona' ? personas.find((item) => item.id === target.id) ?? null
    : target.kind === 'technique' ? techniques.find((item) => item.id === target.id) ?? null
      : target.kind === 'theory' ? theories.find((item) => item.tagId === target.id) ?? null
        : categories.find((item) => `${item.kind}:${item.id}` === target.id) ?? null;
  const chooseNow = (target: Selection) => {
    const item = findItem(target);
    if (target.kind !== 'category') setKind(target.kind);
    setSelection(target); setDraft(item ? structuredClone(item) : null);
    setRelatedIds(target.kind === 'persona' && item ? (item as OwnerPersona).status === 'draft' ? (item as OwnerPersona).draft_technique_ids ?? [] : techniques.filter((t) => t.persona_id === (item as OwnerPersona).name && t.status !== 'archived').map((t) => t.id)
      : target.kind === 'theory' && item ? (item as OwnerTheory).status === 'draft' ? (item as OwnerTheory).draftTechniqueIds ?? [] : techniques.filter((t) => t.theory_ids.includes(target.id) && t.status !== 'archived').map((t) => t.id) : []);
    setImageAsset(null); setDirty(false); setPending(null); setPendingCreate(false); setDeleting(false); setError(''); setNotice('');
  };
  const choose = (target: Selection) => { if (busy) return; if (dirty) setPending(target); else chooseNow(target); };
  const navigateTree = (nextKind: ContentKind, nextScope: string) => {
    if (dirty) { setPendingLocation({ kind: nextKind, scope: nextScope }); return; }
    setKind(nextKind); setScope(nextScope); setQuery(''); setSelection(null); setDraft(null);
  };
  const patch = (changes: Record<string, unknown>) => { setDraft((item) => item ? { ...item, ...changes } as Item : item); setDirty(true); setNotice(''); };
  const selectImage = (asset: ContentImageAsset | null) => { setImageAsset(asset); if (asset) { setDirty(true); setNotice(''); } };

  const allRows = useMemo(() => [
    ...personas.map((item) => ({ kind: 'persona' as const, id: item.id, title: item.name, category: categoryTitle('technique', item.category, categories), status: item.status, order: item.display_order, updated: item.updated_at, subtitle: item.subtitle, searchBody: '', image: item.image_path, reference: techniques.filter((t) => t.persona_id === item.name && t.status !== 'archived').length, detail: item.category })),
    ...techniques.map((item) => ({ kind: 'technique' as const, id: item.id, title: item.title || '無題の処世術', category: item.persona_id, status: item.status, order: item.display_order, updated: item.updated_at, subtitle: item.essence, searchBody: [item.explanation,item.memo,...item.practices,...item.examples,...item.cautions].join(' '), image: item.image_path, reference: item.importance, detail: item.category })),
    ...theories.map((item) => ({ kind: 'theory' as const, id: item.tagId, title: item.title || '無題の理論', category: categoryTitle('theory', item.categoryId, categories), status: item.status, order: item.displayOrder, updated: item.updatedAt, subtitle: item.summary, searchBody: (item.aliases ?? []).join(' '), image: item.imagePath, reference: techniques.filter((t) => t.theory_ids.includes(item.tagId) && t.status !== 'archived').length, detail: item.categoryId })),
  ], [personas, techniques, theories, categories]);
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = allRows.filter((row) => words.length
    ? words.every((word) => [row.id, row.title, row.category, row.subtitle, row.searchBody, row.detail].join(' ').toLocaleLowerCase().includes(word))
    : row.kind === kind && (!scope || (kind === 'technique' ? row.category === scope || (scope.startsWith('category:') && row.detail === scope.slice(9)) : row.detail === scope)))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ja'));
  const selectedTitle = draft ? selection?.kind === 'persona' ? (draft as OwnerPersona).name
    : selection?.kind === 'technique' ? (draft as TechniqueContent).title
      : selection?.kind === 'theory' ? (draft as OwnerTheory).title : (draft as ContentCategory).title : '';
  const scopeLabel = !scope ? '' : kind === 'theory' ? categoryTitle('theory',scope,categories)
    : scope.startsWith('category:') ? categoryTitle('technique',scope.slice(9),categories)
      : kind === 'persona' ? categoryTitle('technique',scope,categories)
        : `${categoryTitle('technique',personas.find((p) => p.name === scope)?.category ?? '',categories)}　›　${scope}`;
  const selectedPath = !selection || !draft ? '' : selection.kind === 'category' ? `カテゴリ　›　${(draft as ContentCategory).title}`
    : selection.kind === 'persona' ? `人物像　›　${categoryTitle('technique',(draft as OwnerPersona).category,categories)}　›　${selectedTitle || '新規'}`
      : selection.kind === 'technique' ? `処世術　›　${categoryTitle('technique',(draft as TechniqueContent).category,categories)}　›　${(draft as TechniqueContent).persona_id}　›　${selectedTitle || '新規'}`
        : `理論　›　${categoryTitle('theory',(draft as OwnerTheory).categoryId,categories)}　›　${selectedTitle || '新規'}`;
  const selectedImage = selection?.kind === 'persona' && draft
    ? getPersonaPresentation((draft as OwnerPersona).name)?.image : undefined;
  const imagePath = draft && selection?.kind !== 'category' ? selection?.kind === 'theory' ? (draft as OwnerTheory).imagePath : (draft as OwnerPersona | TechniqueContent).image_path : null;
  const relatedLabels = selection?.kind === 'persona' && draft ? techniques.filter((t) => t.persona_id === (draft as OwnerPersona).name && t.status !== 'archived').map((t) => `処世術: ${t.title || t.id}`)
    : selection?.kind === 'theory' ? [
      ...techniques.filter((t) => t.status !== 'archived' && t.theory_ids.includes(selection.id)).map((t) => `処世術: ${t.title || t.id}`),
      ...theories.filter((t) => t.status === 'published' && t.tagId !== selection.id && t.relatedTheoryIds?.includes(selection.id)).map((t) => `理論: ${t.title}`),
    ] : selection?.kind === 'technique' && draft ? [
      `人物像: ${(draft as TechniqueContent).persona_id}`,
      ...(draft as TechniqueContent).theory_ids.map((id) => `理論: ${theories.find((t) => t.tagId === id)?.title ?? id}`),
    ] : [];
  const hasBlockingLinks = selection?.kind !== 'technique' && relatedLabels.length > 0;

  const save = async (publish = true) => {
    if (!selection || !draft || busy) return;
    setBusy(true); setError(''); setNotice('');
    let uploaded: string | null = null;
    let persisted = false;
    const previousPath = selection.kind === 'persona' ? personas.find((item) => item.id === selection.id)?.image_path
      : selection.kind === 'technique' ? techniques.find((item) => item.id === selection.id)?.image_path
        : selection.kind === 'theory' ? theories.find((item) => item.tagId === selection.id)?.imagePath : null;
    try {
      if (imageAsset && selection.kind !== 'category') uploaded = await uploadContentImage(imageAsset, selection.kind, selection.id);
      if (selection.kind === 'category') await saveContentCategory(draft as ContentCategory);
      if (selection.kind === 'persona') {
        const item = draft as OwnerPersona;
        await savePersona({ ...item, image_path: uploaded ?? item.image_path, status: publish ? 'published' : 'draft' }, relatedIds);
      }
      if (selection.kind === 'technique') {
        const item = draft as TechniqueContent;
        const snapshot = normalizeSnapshot({ ...snapshotFromTechnique(item), image_path: uploaded ?? item.image_path });
        if (publish) await saveAndPublishTechnique(item.id, snapshot, techniques.find((t) => t.id === item.id)?.updated_at ?? null);
        else await saveTechniqueDraft(item.id, snapshot, techniques.find((t) => t.id === item.id)?.updated_at ?? null);
      }
      if (selection.kind === 'theory') {
        const item = { ...(draft as OwnerTheory), imagePath: uploaded ?? (draft as OwnerTheory).imagePath };
        if (publish) await publishTheory({ ...item, relatedTechniqueIds: relatedIds });
        else await saveTheoryDraft({ ...item, draftTechniqueIds: relatedIds });
      }
      persisted = true;
      const listLoaded = await reload(); const reflected = await refreshPublishedContent();
      if (previousPath && previousPath !== (uploaded ?? imagePath)) await removeContentImageIfUnused(previousPath);
      setDirty(false); setImageAsset(null); setNotice(!listLoaded || !reflected ? '変更を保存しました。画面の再読込は確認できませんでした。' : publish ? '変更を保存し、アプリへ反映しました。' : '下書きを保存しました。');
      if (selection.kind !== 'category') {
        const item = selection.kind === 'persona' ? await fetchOwnerPersonas().then((p) => p.find((x) => x.id === selection.id))
          : selection.kind === 'technique' ? await fetchOwnerTechniques().then((t) => t.find((x) => x.id === selection.id))
            : await fetchOwnerTheories().then((t) => t.find((x) => x.tagId === selection.id));
        if (item) setDraft(item);
      }
    } catch (cause) {
      if (persisted) { setDirty(false); setImageAsset(null); setNotice('変更を保存しました。再読込に失敗したため、画面を更新して確認してください。'); }
      else { if (uploaded) await removeContentImageIfUnused(uploaded).catch(() => undefined); setError(cause instanceof Error ? cause.message : '保存に失敗しました。編集内容は保持しています。'); }
    } finally { setBusy(false); }
  };

  const create = async (discardChanges = false) => {
    if (busy) return;
    if (dirty && !discardChanges) { setPendingCreate(true); return; }
    setPendingCreate(false);
    setBusy(true); setError('');
    try {
      if (kind === 'persona') {
        const category = scope && !scope.startsWith('category:') ? scope : categories.find((c) => c.kind === 'technique')?.id ?? 'interpersonal';
        const id = `persona-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const item: OwnerPersona = { id, name: '', subtitle: '', category: category as OwnerPersona['category'], image_path: null, access_tier: 'complete', draft_technique_ids: [], display_order: 0, updated_at: '', status: 'draft' };
        setDraft(item); setSelection({ kind, id }); setRelatedIds([]); setImageAsset(null); setDirty(true);
      } else if (kind === 'technique') {
        const persona = personas.find((p) => p.name === scope && p.status === 'published') ?? personas.find((p) => p.status === 'published');
        if (!persona) throw new Error('先に公開中の人物像を選択してください。');
        const item = await createTechnique(persona.name);
        await reload(); setDraft(item); setSelection({ kind, id: item.id }); setRelatedIds([]); setImageAsset(null); setDirty(false);
      } else {
        const category = categories.find((c) => c.kind === 'theory' && c.id === scope) ?? categories.find((c) => c.kind === 'theory');
        if (!category) throw new Error('理論カテゴリがありません。');
        const item = await createTheoryDraft(category);
        await reload(); setDraft(item); setSelection({ kind, id: item.tagId }); setRelatedIds([]); setImageAsset(null); setDirty(false);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '追加できませんでした。'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!selection || busy) return;
    setBusy(true); setError('');
    try {
      if (selection.kind === 'persona') await archivePersona((draft as OwnerPersona).name);
      if (selection.kind === 'technique') await archiveTechnique(selection.id);
      if (selection.kind === 'theory') await archiveTheory(selection.id);
      await reload(); await refreshPublishedContent();
      setSelection(null); setDraft(null); setDeleting(false); setDirty(false); setNotice('公開から外しました。履歴は保持されています。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '削除できませんでした。'); }
    finally { setBusy(false); }
  };

  const move = async (rowId: string, targetId: string) => {
    if (rowId === targetId || query || !scope || (kind === 'technique' && scope.startsWith('category:'))) return;
    const ordered = rows.filter((row) => row.kind === kind && row.status !== 'archived').map((row) => row.id);
    const source = ordered.indexOf(rowId); const target = ordered.indexOf(targetId);
    if (source < 0 || target < 0) return;
    ordered.splice(source, 1); ordered.splice(target, 0, rowId);
    setBusy(true);
    try { await reorderContent(kind, scope, ordered); await reload(); await refreshPublishedContent(); setNotice('並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  const moveCategory = async (section: 'technique' | 'theory', categoryId: string, offset: -1 | 1) => {
    const ids = categories.filter((c) => c.kind === section).sort((a,b) => a.display_order-b.display_order).map((c) => c.id);
    const index = ids.indexOf(categoryId); const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusy(true);
    try { await reorderContent(`${section}-category`, '', ids); await reload(); await refreshPublishedContent(); setNotice('カテゴリの並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  const dropCategory = async (section: 'technique' | 'theory', targetId: string) => {
    const source = draggedCategory.current;
    draggedCategory.current = null;
    if (!source || source.section !== section || source.id === targetId || busy) return;
    const ids = categories.filter((c) => c.kind === section).sort((a,b) => a.display_order-b.display_order).map((c) => c.id);
    const from = ids.indexOf(source.id); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from,1); ids.splice(to,0,source.id);
    setBusy(true);
    try { await reorderContent(`${section}-category`, '', ids); await reload(); await refreshPublishedContent(); setNotice('カテゴリの並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'カテゴリの並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };

  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="この画面はオーナー専用です。" /></Screen>;
  const compact = width < 1050;
  return <Screen contentContainerStyle={styles.screen}>
    <AppText variant="label" style={styles.eyebrow}>OWNER CONTENT</AppText>
    <View style={styles.heading}><View><AppText variant="serif" style={styles.title}>コンテンツ管理</AppText><AppText style={styles.muted}>人物像・処世術・理論の正本データを管理</AppText></View><PrimaryButton disabled={busy} onPress={() => void create()}>＋ {names[kind]}を追加</PrimaryButton></View>
    <TextInput accessibilityLabel="コンテンツを横断検索" value={query} onChangeText={setQuery} placeholder="人物像・処世術・理論を横断検索（ID・カテゴリ・本文）" style={styles.search} />
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    {pending ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して移動しますか？</AppText><View style={styles.actions}><SecondaryButton onPress={() => setPending(null)}>編集を続ける</SecondaryButton><PrimaryButton onPress={() => chooseNow(pending)}>破棄して移動</PrimaryButton></View></View> : null}
    {pendingLocation ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して階層を移動しますか？</AppText><View style={styles.actions}><SecondaryButton onPress={() => setPendingLocation(null)}>編集を続ける</SecondaryButton><PrimaryButton onPress={() => { setDirty(false); setKind(pendingLocation.kind); setScope(pendingLocation.scope); setSelection(null); setDraft(null); setQuery(''); setPendingLocation(null); }}>破棄して移動</PrimaryButton></View></View> : null}
    {pendingCreate ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して新規作成しますか？</AppText><View style={styles.actions}><SecondaryButton onPress={() => setPendingCreate(false)}>編集を続ける</SecondaryButton><PrimaryButton onPress={() => void create(true)}>破棄して追加</PrimaryButton></View></View> : null}
    {pendingPreview ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄してアプリ画面へ移動しますか？</AppText><View style={styles.actions}><SecondaryButton onPress={() => setPendingPreview(null)}>編集を続ける</SecondaryButton><PrimaryButton onPress={() => { const path = pendingPreview; setPendingPreview(null); setDirty(false); router.push(path); }}>破棄して確認</PrimaryButton></View></View> : null}
    <View style={[styles.layout, compact && styles.stacked]}>
      <ScrollView style={[styles.tree, compact && styles.compactTree]} contentContainerStyle={styles.treeBody}>
        <AppText variant="label">コンテンツ階層</AppText>
        {(['persona','technique','theory'] as const).map((section) => <View key={section}>
          <TreeRow label={`${names[section]}　${allRows.filter((row) => row.kind === section).length}`} active={kind === section && !scope && !query} onPress={() => navigateTree(section, '')} />
          {section === 'persona' || section === 'technique' ? categories.filter((c) => c.kind === 'technique').map((cat) => <View key={`${section}:${cat.id}`}>
            <TreeRow nested label={cat.title} active={kind === section && scope === (section === 'persona' ? cat.id : `category:${cat.id}`)} onPress={() => navigateTree(section, section === 'persona' ? cat.id : `category:${cat.id}`)} onEdit={() => choose({ kind: 'category', id: `technique:${cat.id}` })} onMove={section === 'technique' ? (offset) => void moveCategory('technique',cat.id,offset) : undefined} onDragStart={section === 'technique' ? () => { draggedCategory.current = { section: 'technique', id: cat.id }; } : undefined} onDrop={section === 'technique' ? () => void dropCategory('technique',cat.id) : undefined} />
            {section === 'technique' && personas.filter((p) => p.category === cat.id && p.status !== 'archived').sort((a,b) => a.display_order-b.display_order).map((p) => <TreeRow key={p.id} deep label={`${p.name}　${techniques.filter((t) => t.persona_id === p.name && t.status !== 'archived').length}`} active={kind === section && scope === p.name} onPress={() => navigateTree(section,p.name)} />)}
          </View>) : categories.filter((c) => c.kind === 'theory').map((cat) => <TreeRow key={cat.id} nested label={`${cat.title}　${theories.filter((t) => t.categoryId === cat.id && t.status !== 'archived').length}`} active={kind === section && scope === cat.id} onPress={() => navigateTree(section,cat.id)} onEdit={() => choose({ kind: 'category', id: `theory:${cat.id}` })} onMove={(offset) => void moveCategory('theory',cat.id,offset)} onDragStart={() => { draggedCategory.current = { section: 'theory', id: cat.id }; }} onDrop={() => void dropCategory('theory',cat.id)} />)}
        </View>)}
      </ScrollView>
      <View style={[styles.list, compact && styles.compactList]}>
        <AppText variant="label">コンテンツ管理　›　{query ? '検索結果' : names[kind]}　{scopeLabel ? `›　${scopeLabel}` : ''}</AppText>
        <View style={styles.listHeader}><AppText style={styles.muted}>{fetching ? '読込中…' : `${rows.length}件`}</AppText><AppText style={styles.muted}>{query ? '検索中' : scope ? '≡ をドラッグして並び替え' : '階層を選ぶと並び替え可能'}</AppText></View>
        <FlatList data={rows} keyExtractor={(row) => `${row.kind}:${row.id}`} style={styles.rowScroller} initialNumToRender={20} windowSize={7} keyboardShouldPersistTaps="handled"
          renderItem={({ item: row, index }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: selection?.kind === row.kind && selection.id === row.id }} onPress={() => choose({ kind: row.kind, id: row.id })} style={[styles.row, selection?.kind === row.kind && selection.id === row.id && styles.rowActive]}
            {...(Platform.OS === 'web' ? { draggable: Boolean(scope && !query && row.status !== 'archived' && !(kind === 'technique' && scope.startsWith('category:'))), onDragStart: () => { draggedId.current = row.id; }, onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(), onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); if (draggedId.current && row.status !== 'archived') void move(draggedId.current, row.id); draggedId.current = null; } } as any : {})}>
            <AppText style={styles.handle}>≡</AppText><AppText style={styles.number}>{String(row.order || index + 1).padStart(2,'0')}</AppText>
            {row.image ? <Image source={row.kind === 'persona' ? getPersonaPresentation(row.title)?.image : { uri: contentImageUrl(row.image) ?? '' }} style={styles.thumb} /> : null}
            <View style={styles.rowCopy}><AppText numberOfLines={1} style={styles.rowTitle}>{row.title}</AppText>{row.subtitle ? <AppText numberOfLines={1} style={styles.muted}>{row.subtitle}</AppText> : null}<AppText numberOfLines={1} style={styles.muted}>{row.kind === 'technique' ? `${categoryTitle('technique',row.detail,categories)} › ${row.category}` : row.category} · {row.kind === 'technique' ? `重要度 ${'★'.repeat(Number(row.reference))}` : `${row.reference}件の関連`} · {dateLabel(row.updated)}</AppText></View>
            {scope && !query && row.status !== 'archived' && !(kind === 'technique' && scope.startsWith('category:')) ? <View><Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を上へ`} disabled={!rows.slice(0,index).some((item) => item.status !== 'archived')} onPress={() => { const previous = rows.slice(0,index).reverse().find((item) => item.status !== 'archived'); if (previous) void move(row.id,previous.id); }}><AppText style={styles.muted}>↑</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を下へ`} disabled={!rows.slice(index+1).some((item) => item.status !== 'archived')} onPress={() => { const next = rows.slice(index+1).find((item) => item.status !== 'archived'); if (next) void move(row.id,next.id); }}><AppText style={styles.muted}>↓</AppText></Pressable></View> : null}
            <AppText style={[styles.badge, row.status !== 'published' && styles.badgeDraft]}>{statusLabel(row.status)}</AppText>
          </Pressable>}
          ListEmptyComponent={!fetching ? <AppText style={styles.muted}>一致するコンテンツはありません。</AppText> : null}
        />
      </View>
      <ScrollView style={[styles.editor, compact && styles.compactEditor]} contentContainerStyle={styles.editorBody} nestedScrollEnabled>
        {selection && draft ? <>
          <AppText variant="label" style={styles.eyebrow}>コンテンツ管理　›　{selectedPath}</AppText>
          <View style={styles.heading}><AppText variant="serif" style={styles.editorTitle}>{selectedTitle || '新規コンテンツ'}</AppText>{dirty ? <AppText style={styles.unsaved}>未保存の変更</AppText> : null}</View>
          <AppText style={styles.muted}>ID: {selection.id}</AppText>
          <View style={styles.actions}><PrimaryButton disabled={busy} onPress={() => void save(true)}>{busy ? '保存中…' : selection.kind === 'category' ? 'カテゴリを保存' : '保存して公開'}</PrimaryButton>{selection.kind !== 'category' ? <SecondaryButton disabled={busy} onPress={() => void save(false)}>下書き保存・非公開</SecondaryButton> : null}</View>
          {selection.kind === 'category' ? <Section title="カテゴリ・階層"><Field label="カテゴリ名" value={(draft as ContentCategory).title} onChange={(title) => patch({ title })} /><AppText style={styles.muted}>カテゴリIDは固定です。名前を変更するとアプリの分類見出しにも反映されます。</AppText></Section> : null}
          {selection.kind === 'persona' ? <>
            <Section title="基本情報"><Field label="人物像名" value={(draft as OwnerPersona).name} onChange={(name) => patch({ name })} /><Field label="サブタイトル" value={(draft as OwnerPersona).subtitle} onChange={(subtitle) => patch({ subtitle })} /><Choice label="カテゴリ" value={(draft as OwnerPersona).category} options={categories.filter((c) => c.kind === 'technique').map((c) => [c.id,c.title])} onChange={(category) => patch({ category })} /></Section>
            <MediaEditor source={imagePath ? selectedImage : undefined} path={imagePath} asset={imageAsset} onPick={selectImage} onRemove={() => { patch({ image_path: null }); setImageAsset(null); }} />
            <Section title="関連する処世術"><MultiPicker options={techniques.filter((t) => t.status !== 'archived').map((t) => ({ id: t.id, title: t.title || t.id }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><AppText style={styles.muted}>既存の所属を外す場合は、その処世術を先に別の人物像へ移動してください。</AppText></Section>
          </> : null}
          {selection.kind === 'technique' ? <TechniqueFields item={draft as TechniqueContent} personas={personas} theories={theories} categories={categories} patch={patch} imageAsset={imageAsset} setImageAsset={selectImage} /> : null}
          {selection.kind === 'theory' ? <>
            <Section title="基本情報"><Field label="理論名" value={(draft as OwnerTheory).title} onChange={(title) => patch({ title })} /><Choice label="カテゴリ" value={(draft as OwnerTheory).categoryId} options={categories.filter((c) => c.kind === 'theory').map((c) => [c.id,c.title])} onChange={(categoryId) => patch({ categoryId, categoryTitle: categoryTitle('theory',categoryId,categories) })} /><Field label="概要・本文" value={(draft as OwnerTheory).summary} onChange={(summary) => patch({ summary })} multi /><Field label="別名（1行に1件）" value={((draft as OwnerTheory).aliases ?? []).join('\n')} onChange={(value) => patch({ aliases: value.split('\n').map((x) => x.trim()).filter(Boolean) })} multi /></Section>
            <MediaEditor path={imagePath} asset={imageAsset} onPick={selectImage} onRemove={() => { patch({ imagePath: null }); setImageAsset(null); }} />
            <Section title="関連付け"><AppText variant="label">関連する処世術</AppText><MultiPicker options={techniques.filter((t) => t.status !== 'archived').map((t) => ({ id: t.id, title: t.title || t.id }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><TheoryDetailsEditor value={draft as OwnerTheory} options={theories.filter((t) => t.status === 'published')} disabled={busy} onChange={patch} /></Section>
          </> : null}
          {selection.kind !== 'category' ? <Section title="公開設定"><Choice label="無料・完全版" value={selection.kind === 'theory' ? (draft as OwnerTheory).accessTier ?? 'complete' : (draft as OwnerPersona | TechniqueContent).access_tier} options={[["free","無料版"],["complete","完全版"]]} onChange={(access_tier) => patch(selection.kind === 'theory' ? { accessTier: access_tier } : { access_tier })} /><AppText style={styles.muted}>現在の状態: {statusLabel((draft as OwnerPersona | TechniqueContent | OwnerTheory).status)} · 表示順は一覧のドラッグ操作で変更</AppText><SecondaryButton onPress={() => { const id = selection.id; const path = selection.kind === 'persona' ? personaRoute((draft as OwnerPersona).category,(draft as OwnerPersona).name) : selection.kind === 'technique' ? techniqueRoute(id) : theoryRoute(id); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</SecondaryButton></Section> : null}
          {selection.kind !== 'category' ? <View style={styles.danger}><AppText variant="label">削除・アーカイブ</AppText><AppText style={styles.muted}>関連コンテンツ {relatedLabels.length}件。公開から外すとアプリの一覧・詳細に反映されます。</AppText>{(draft as OwnerPersona | TechniqueContent | OwnerTheory).status === 'archived' ? <AppText style={styles.muted}>アーカイブ済みです。「保存して公開」で再公開できます。</AppText> : deleting ? <View style={styles.confirm}><AppText>削除対象: 「{selectedTitle}」</AppText><AppText style={styles.muted}>アプリへの影響: このコンテンツが一覧・詳細から消えます。処世術は関連一覧からも消えます。</AppText>{relatedLabels.slice(0,8).map((label,index) => <AppText key={`${index}:${label}`} style={styles.muted}>・{label}</AppText>)}{relatedLabels.length > 8 ? <AppText style={styles.muted}>ほか {relatedLabels.length-8}件</AppText> : null}{hasBlockingLinks ? <AppText style={styles.error}>参照元を移動・解除してから削除できます。</AppText> : null}<View style={styles.actions}><SecondaryButton onPress={() => setDeleting(false)}>キャンセル</SecondaryButton><PrimaryButton disabled={busy || hasBlockingLinks} onPress={() => void remove()}>削除を確定</PrimaryButton></View></View> : <SecondaryButton disabled={busy} onPress={() => setDeleting(true)}>削除…</SecondaryButton>}</View> : null}
        </> : <EmptyState title="コンテンツを選択" description="左の階層を選び、中央の一覧から編集する項目を選択してください。" />}
      </ScrollView>
    </View>
  </Screen>;
}

function categoryTitle(kind: ContentCategory['kind'], id: string, categories: ContentCategory[]) { return categories.find((c) => c.kind === kind && c.id === id)?.title ?? id; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><AppText variant="serif" style={styles.sectionTitle}>{title}</AppText>{children}</View>; }
function TreeRow({ label, active, onPress, onEdit, onMove, onDragStart, onDrop, nested, deep }: { label: string; active: boolean; onPress: () => void; onEdit?: () => void; onMove?: (offset: -1 | 1) => void; onDragStart?: () => void; onDrop?: () => void; nested?: boolean; deep?: boolean }) { return <View style={[styles.treeRow, active && styles.treeActive, nested && { paddingLeft: 22 }, deep && { paddingLeft: 38 }]} {...(Platform.OS === 'web' && onDragStart ? { draggable: true, onDragStart, onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(), onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); onDrop?.(); } } as any : {})}>{onDragStart ? <AppText style={styles.handle}>≡</AppText> : null}<Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}><AppText numberOfLines={1} style={styles.treeText}>{label}</AppText></Pressable>{onMove ? <><Pressable accessibilityRole="button" accessibilityLabel={`${label}を上へ`} onPress={() => onMove(-1)}><AppText style={styles.muted}>↑</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${label}を下へ`} onPress={() => onMove(1)}><AppText style={styles.muted}>↓</AppText></Pressable></> : null}{onEdit ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}を編集`} onPress={onEdit}><AppText style={styles.muted}>⋯</AppText></Pressable> : null}</View>; }
function Field({ label, value, onChange, multi }: { label: string; value: string; onChange: (value: string) => void; multi?: boolean }) { return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multi} style={[styles.input, multi && styles.multi]} /></View>; }
function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <View style={styles.field}><AppText variant="label">{label}</AppText><View style={styles.actions}>{options.map(([id,title]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: value === id }} onPress={() => onChange(id)} style={[styles.choice,value === id && styles.choiceActive]}><AppText>{title}</AppText></Pressable>)}</View></View>; }
function MultiPicker({ options, ids, onChange }: { options: Array<{ id: string; title: string }>; ids: string[]; onChange: (ids: string[]) => void }) { const [search,setSearch] = useState(''); return <View style={styles.field}><View style={styles.chips}>{ids.map((id) => <Pressable key={id} accessibilityRole="button" onPress={() => onChange(ids.filter((item) => item !== id))} style={styles.chip}><AppText numberOfLines={1}>{options.find((o) => o.id === id)?.title ?? id}　×</AppText></Pressable>)}</View><TextInput accessibilityLabel="関連コンテンツを検索" value={search} onChangeText={setSearch} placeholder="名前・IDで検索して追加" style={styles.input} /><ScrollView nestedScrollEnabled style={{ maxHeight: 170 }}>{options.filter((item) => !ids.includes(item.id) && [item.title,item.id].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,20).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { onChange([...ids,item.id]); setSearch(''); }} style={styles.option}><AppText numberOfLines={1}>＋ {item.title}</AppText></Pressable>)}</ScrollView></View>; }
function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) { return <View style={styles.field}><AppText variant="label">{label}</AppText>{items.map((item,index) => <View key={index} style={styles.actions}><TextInput value={item} onChangeText={(value) => onChange(items.map((x,i) => i === index ? value : x))} multiline style={[styles.input,{ flex: 1 }]} /><SecondaryButton onPress={() => onChange(items.filter((_,i) => i !== index))}>削除</SecondaryButton></View>)}<SecondaryButton onPress={() => onChange([...items,''])}>＋ 追加</SecondaryButton></View>; }
function MediaEditor({ source, path, asset, onPick, onRemove }: { source?: unknown; path?: string | null; asset: ContentImageAsset | null; onPick: (asset: ContentImageAsset | null) => void; onRemove: () => void }) { const [refs,setRefs] = useState(0); useEffect(() => { if (path) void countImageReferences(path).then(setRefs).catch(() => setRefs(0)); else setRefs(0); }, [path]); const shown = asset ? { uri: asset.uri } : contentImageUrl(path) ? { uri: contentImageUrl(path)! } : source; return <Section title="メディア"><View style={styles.mediaRow}>{shown ? <Image source={shown as any} style={styles.mediaPreview} contentFit="cover" /> : <View style={styles.mediaPreview}><AppText style={styles.muted}>画像なし</AppText></View>}<View style={styles.field}><AppText style={styles.muted}>{path?.startsWith('bundled:') ? `同梱画像: ${path}` : path ? `Storage: ${path}` : '未設定'}</AppText>{refs > 1 ? <AppText style={styles.error}>この画像は他の{refs-1}件でも使用中です。参照だけを外し、共有ファイルは残します。</AppText> : null}<SecondaryButton onPress={() => void pickContentImage().then(onPick)}>画像を選択・差し替え</SecondaryButton><SecondaryButton onPress={onRemove}>画像を削除</SecondaryButton></View></View><View style={styles.drop} {...(Platform.OS === 'web' ? { onDragOver: (e: { preventDefault: () => void }) => e.preventDefault(), onDrop: (e: { preventDefault: () => void; dataTransfer: { files: FileList } }) => { e.preventDefault(); const file=e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) onPick({ uri: URL.createObjectURL(file), width: 0, height: 0, fileName: file.name, mimeType: file.type, fileSize: file.size }); } } as any : {})}><AppText style={styles.muted}>画像をここへドラッグ＆ドロップ</AppText></View></Section>; }
function TechniqueFields({ item, personas, theories, categories, patch, imageAsset, setImageAsset }: { item: TechniqueContent; personas: OwnerPersona[]; theories: OwnerTheory[]; categories: ContentCategory[]; patch: (changes: Record<string, unknown>) => void; imageAsset: ContentImageAsset | null; setImageAsset: (asset: ContentImageAsset | null) => void }) { const shownTags = item.tags ?? getTechniqueTags({ id: item.id, title: item.title, subtitle: item.essence, explanation: item.explanation, categoryName: categoryTitle('technique',item.category,categories), subcategory: item.persona_id, articleTitle: item.persona_id }); return <>
  <Section title="基本情報"><Field label="タイトル" value={item.title} onChange={(title) => patch({ title })} /><Choice label="所属する人物像" value={item.persona_id} options={personas.filter((p) => p.status === 'published').map((p) => [p.name,p.name])} onChange={(persona_id) => patch({ persona_id, category: personas.find((p) => p.name === persona_id)?.category ?? item.category })} /><Choice label="重要度" value={String(item.importance)} options={[["1","★"],["2","★★"],["3","★★★"]]} onChange={(importance) => patch({ importance: Number(importance) })} /></Section>
  <Section title="本文"><Field label="原理一文" value={item.essence} onChange={(essence) => patch({ essence })} multi /><Field label="解説" value={item.explanation} onChange={(explanation) => patch({ explanation })} multi /><Field label="メモ" value={item.memo} onChange={(memo) => patch({ memo })} multi /><ListField label="今日からできる実践" items={item.practices} onChange={(practices) => patch({ practices })} /><ListField label="具体例" items={item.examples} onChange={(examples) => patch({ examples })} /><ListField label="注意点" items={item.cautions} onChange={(cautions) => patch({ cautions })} /><ListField label="タグ" items={shownTags} onChange={(tags) => patch({ tags })} />{item.tags === null ? <AppText style={styles.muted}>現在の表示は従来の規則から自動生成されています。編集すると明示的なタグとして保存されます。</AppText> : null}</Section>
  <MediaEditor path={item.image_path} asset={imageAsset} onPick={setImageAsset} onRemove={() => { patch({ image_path: null }); setImageAsset(null); }} />
  <Section title="関連付け"><AppText variant="label">主要理論</AppText><MultiPicker options={theories.filter((t) => t.status === 'published').map((t) => ({ id: t.tagId, title: t.title }))} ids={item.primary_theory_ids} onChange={(ids) => patch({ primary_theory_ids: ids, theory_ids: [...new Set([...ids,...item.theory_ids])] })} /><AppText variant="label">あわせて読む理論</AppText><MultiPicker options={theories.filter((t) => t.status === 'published').map((t) => ({ id: t.tagId, title: t.title }))} ids={item.theory_ids.filter((id) => !item.primary_theory_ids.includes(id))} onChange={(ids) => patch({ theory_ids: [...item.primary_theory_ids,...ids] })} /></Section>
</>; }

