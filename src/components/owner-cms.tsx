import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { TheoryDetailsEditor } from '@/components/owner-theory-details';
import { ownerCmsStyles as styles } from './owner-cms.styles';
import { archivePersona, fetchOwnerPersonas, savePersona, type OwnerPersona } from '@/data/owner-personas';
import { archiveTechnique, createTechnique, fetchOwnerTechniques, normalizeSnapshot, saveAndPublishTechnique, saveTechniqueDraft, snapshotFromTechnique, type TechniqueContent } from '@/data/owner-content';
import { archiveTheory, fetchOwnerTheories, publishTheory } from '@/data/owner-theories';
import { createTheoryDraft, deleteContentCategory, fetchContentCategories, reorderContent, saveContentCategory, saveTheoryDraft, type ContentCategory, type ContentKind } from '@/data/owner-cms';
import { contentImageUrl, countImageReferences, pickContentImage, removeContentImageIfUnused, uploadContentImage, type ContentImageAsset } from '@/lib/content-media';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { getTheoryDisplayId } from '@/data/catalog';
import { getTechniqueTags } from '@/data/technique-tags';
import { personaRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type OwnerTheory = Awaited<ReturnType<typeof fetchOwnerTheories>>[number];
type Item = OwnerPersona | TechniqueContent | OwnerTheory | ContentCategory;
type Selection = { kind: ContentKind | 'category'; id: string };
type CmsMode = 'technique' | 'theory';
type EditorTab = 'basic' | 'body' | 'memo' | 'publish';
const statusLabel = (status: string) => status === 'published' ? '公開中' : status === 'draft' ? '下書き' : 'アーカイブ';

export default function OwnerCmsScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const { loading, user, role } = useAuth();
  const { refreshPublishedContent } = useAccess();
  const { width } = useHydratedWindowDimensions();
  const [mode, setMode] = useState<CmsMode>(params.kind === 'theory' ? 'theory' : 'technique');
  const [editorTab, setEditorTab] = useState<EditorTab>('basic');
  const [listSort, setListSort] = useState<'display' | 'title' | 'status'>('display');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [treeMenu, setTreeMenu] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [creationMenu, setCreationMenu] = useState(false);
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
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ kind: ContentKind; scope: string } | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<Href | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const draggedId = useRef<string | null>(null);
  const draggedPersona = useRef<string | null>(null);
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
    if (target.kind !== 'category') setMode(target.kind === 'theory' ? 'theory' : 'technique');
    setEditorTab('basic');
    setSelection(target); setDraft(item ? structuredClone(item) : null);
    setRelatedIds(target.kind === 'persona' && item ? (item as OwnerPersona).status === 'draft' ? (item as OwnerPersona).draft_technique_ids ?? [] : techniques.filter((t) => t.persona_id === (item as OwnerPersona).name && t.status !== 'archived').map((t) => t.id)
      : target.kind === 'theory' && item ? (item as OwnerTheory).status === 'draft' ? (item as OwnerTheory).draftTechniqueIds ?? [] : techniques.filter((t) => t.theory_ids.includes(target.id) && t.status !== 'archived').map((t) => t.id) : []);
    setImageAsset(null); setDirty(false); setPending(null); setPendingDelete(false); setPendingCreate(false); setDeleting(false); setRowMenu(null); setTreeMenu(null); setError(''); setNotice('');
  };
  const choose = (target: Selection) => { if (busy) return; if (dirty) { setPendingDelete(false); setPending(target); } else chooseNow(target); };
  const navigateTree = (nextKind: ContentKind, nextScope: string) => {
    if (dirty) { setPendingLocation({ kind: nextKind, scope: nextScope }); return; }
    setMode(nextKind === 'theory' ? 'theory' : 'technique'); setScope(nextScope); setQuery(''); setSelection(null); setDraft(null); setRowMenu(null); setTreeMenu(null);
  };
  const patch = (changes: Record<string, unknown>) => { setDraft((item) => item ? { ...item, ...changes } as Item : item); setDirty(true); setNotice(''); };
  const selectImage = (asset: ContentImageAsset | null) => { setImageAsset(asset); if (asset) { setDirty(true); setNotice(''); } };

  const allRows = useMemo(() => [
    ...personas.map((item) => ({ kind: 'persona' as const, id: item.id, title: item.name, category: categoryTitle('technique', item.category, categories), status: item.status, order: item.display_order, displayLabel: undefined, updated: item.updated_at, subtitle: item.subtitle, searchBody: '', image: item.image_path, reference: techniques.filter((t) => t.persona_id === item.name && t.status !== 'archived').length, detail: item.category })),
    ...techniques.map((item) => ({ kind: 'technique' as const, id: item.id, title: item.title || '無題の処世術', category: item.persona_id, status: item.status, order: item.display_order ?? item.draft_display_order, displayLabel: undefined, updated: item.updated_at, subtitle: item.essence, searchBody: [item.explanation,item.memo,...item.practices,...item.examples,...item.cautions].join(' '), image: item.image_path, reference: item.importance, detail: item.category })),
    ...theories.map((item) => ({ kind: 'theory' as const, id: item.tagId, title: item.title || '無題の理論', category: categoryTitle('theory', item.categoryId, categories), status: item.status, order: item.displayId ?? item.draftDisplayId ?? item.displayOrder, displayLabel: getTheoryDisplayId(item), updated: item.updatedAt, subtitle: item.summary, searchBody: (item.aliases ?? []).join(' '), image: item.imagePath, reference: techniques.filter((t) => t.theory_ids.includes(item.tagId) && t.status !== 'archived').length, detail: item.categoryId })),
  ], [personas, techniques, theories, categories]);
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const techniquePersonaList = mode === 'technique' && (!scope || scope.startsWith('category:') || !personas.some((persona) => persona.name === scope));
  const visibleRows = allRows.filter((row) => words.length
    ? words.every((word) => [row.id, row.title, row.category, row.subtitle, row.searchBody, row.detail].join(' ').toLocaleLowerCase().includes(word))
    : techniquePersonaList
      ? row.kind === 'persona' && (!scope || (scope.startsWith('category:') ? row.detail === scope.slice(9) : true))
      : row.kind === mode && (!scope || (mode === 'technique' ? row.category === scope : row.detail === scope)));
  const theoryCategoryOrder = new Map(categories.filter((item) => item.kind === 'theory').sort((a, b) => a.display_order - b.display_order).map((item, index) => [item.id, index]));
  const rows = [...visibleRows].sort((a, b) => listSort === 'title'
    ? a.title.localeCompare(b.title, 'ja')
    : mode === 'theory' ? ((theoryCategoryOrder.get(a.detail) ?? Number.MAX_SAFE_INTEGER)
      - (theoryCategoryOrder.get(b.detail) ?? Number.MAX_SAFE_INTEGER))
      || (listSort === 'status' ? a.status.localeCompare(b.status) : 0)
      || ((a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      || a.title.localeCompare(b.title, 'ja')
    : listSort === 'status'
      ? a.status.localeCompare(b.status) || ((a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      : ((a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)) || a.title.localeCompare(b.title, 'ja'));
  const selectedTitle = draft ? selection?.kind === 'persona' ? (draft as OwnerPersona).name
    : selection?.kind === 'technique' ? (draft as TechniqueContent).title
      : selection?.kind === 'theory' ? (draft as OwnerTheory).title : (draft as ContentCategory).title : '';
  const selectedRow = selection && selection.kind !== 'category' ? allRows.find((row) => row.kind === selection.kind && row.id === selection.id) : undefined;
  const scopeLabel = !scope ? '' : mode === 'theory' ? categoryTitle('theory',scope,categories)
    : scope.startsWith('category:') ? categoryTitle('technique',scope.slice(9),categories)
      : techniquePersonaList ? '人物像'
        : `${categoryTitle('technique',personas.find((p) => p.name === scope)?.category ?? '',categories)}　›　${scope}`;
  const selectedPath = !selection || !draft ? '' : selection.kind === 'category' ? `カテゴリ　›　${(draft as ContentCategory).title}`
    : selection.kind === 'persona' ? `人物像　›　${categoryTitle('technique',(draft as OwnerPersona).category,categories)}　›　${selectedTitle || '新規'}`
      : selection.kind === 'technique' ? `処世術　›　${categoryTitle('technique',(draft as TechniqueContent).category,categories)}　›　${(draft as TechniqueContent).persona_id}　›　${selectedTitle || '新規'}`
        : `理論　›　${categoryTitle('theory',(draft as OwnerTheory).categoryId,categories)}　›　${selectedTitle || '新規'}`;
  const selectedImage = selection?.kind === 'persona' && draft
    ? getPersonaPresentation((draft as OwnerPersona).name)?.image : undefined;
  const imagePath = draft && selection?.kind !== 'category' ? selection?.kind === 'theory' ? (draft as OwnerTheory).imagePath : (draft as OwnerPersona | TechniqueContent).image_path : null;
  const relatedLabels = selection?.kind === 'category' && draft ? (() => {
      const category = draft as ContentCategory;
      const references = category.kind === 'technique'
        ? [...personas.filter((p) => p.category === category.id).map((p) => `人物像: ${p.name || '名称未設定'}`), ...techniques.filter((t) => t.category === category.id).map((t) => `処世術: ${t.title || t.id}`)]
        : theories.filter((t) => t.categoryId === category.id).map((t) => `理論: ${t.title}`);
      return references;
    })()
    : selection?.kind === 'persona' && draft ? techniques.filter((t) => t.persona_id === (draft as OwnerPersona).name && t.status !== 'archived').map((t) => `処世術: ${t.title || t.id}`)
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
      if (mode === 'technique' && techniquePersonaList) {
        const selectedCategory = scope.startsWith('category:') ? scope.slice(9) : '';
        const category = (selectedCategory || categories.find((c) => c.kind === 'technique')?.id) ?? 'interpersonal';
        const id = `persona-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const item: OwnerPersona = { id, name: '', subtitle: '', category: category as OwnerPersona['category'], image_path: null, access_tier: 'complete', draft_technique_ids: [], display_order: null, updated_at: '', status: 'draft' };
        setDraft(item); setSelection({ kind: 'persona', id }); setRelatedIds([]); setImageAsset(null); setDirty(true); setEditorTab('basic');
      } else if (mode === 'technique') {
        const persona = personas.find((p) => p.name === scope && p.status === 'published')
          ?? personas.find((p) => (!scope.startsWith('category:') || p.category === scope.slice(9)) && p.status === 'published');
        if (!persona) throw new Error('先に公開中の人物像を選択してください。');
        const item = await createTechnique(persona.name);
        await reload(); setDraft(item); setSelection({ kind: 'technique', id: item.id }); setRelatedIds([]); setImageAsset(null); setDirty(false); setScope(persona.name); setEditorTab('basic');
      } else {
        const category = categories.find((c) => c.kind === 'theory' && c.id === scope) ?? categories.find((c) => c.kind === 'theory');
        if (!category) throw new Error('理論カテゴリがありません。');
        const item = await createTheoryDraft(category);
        await reload(); setDraft(item); setSelection({ kind: 'theory', id: item.tagId }); setRelatedIds([]); setImageAsset(null); setDirty(false); setScope(category.id); setEditorTab('basic');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : '追加できませんでした。'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!selection || busy) return;
    setBusy(true); setError('');
    try {
      if (selection.kind === 'category') await deleteContentCategory(draft as ContentCategory);
      if (selection.kind === 'persona') await archivePersona((draft as OwnerPersona).name);
      if (selection.kind === 'technique') await archiveTechnique(selection.id);
      if (selection.kind === 'theory') await archiveTheory(selection.id);
      await reload(); await refreshPublishedContent();
      setSelection(null); setDraft(null); setDeleting(false); setDirty(false); setNotice(selection.kind === 'category' ? 'カテゴリを削除しました。' : '公開から外しました。履歴は保持されています。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '削除できませんでした。'); }
    finally { setBusy(false); }
  };

  const move = async (rowId: string, targetId: string) => {
    if (rowId === targetId || query || listSort !== 'display' || (mode === 'theory' && !scope)) return;
    let orderKind: ContentKind = mode;
    let orderScope = scope;
    if (techniquePersonaList && !scope.startsWith('category:')) return;
    const reorderable = techniquePersonaList
      ? rows.filter((row) => row.kind === 'persona' && row.status !== 'archived')
      : rows.filter((row) => row.kind === mode && row.status === 'published');
    if (techniquePersonaList) {
      orderKind = 'persona';
      orderScope = scope.slice(9);
    }
    const ordered = reorderable.map((row) => row.id);
    const source = ordered.indexOf(rowId); const target = ordered.indexOf(targetId);
    if (source < 0 || target < 0) return;
    ordered.splice(source, 1); ordered.splice(ordered.indexOf(targetId), 0, rowId);
    setBusy(true);
    try { await reorderContent(orderKind, orderScope, ordered); await reload(); await refreshPublishedContent(); setNotice('並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  const movePersona = async (personaId: string, targetId: string) => {
    const persona = personas.find((item) => item.id === personaId);
    const target = personas.find((item) => item.id === targetId);
    if (!persona || !target || persona.category !== target.category) return;
    const ids = personas.filter((item) => item.category === persona.category && item.status !== 'archived')
      .sort((a,b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER)).map((item) => item.id);
    const from = ids.indexOf(personaId); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from,1); ids.splice(ids.indexOf(targetId),0,personaId);
    setBusy(true);
    try { await reorderContent('persona',persona.category,ids); await reload(); await refreshPublishedContent(); setNotice('人物像の並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '人物像の並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };
  const addCategory = () => {
    const categoryKind = mode === 'theory' ? 'theory' : 'technique';
    const id = `custom-${Date.now()}`;
    const item: ContentCategory = { kind: categoryKind, id, title: '', display_order: categories.filter((category) => category.kind === categoryKind).length + 1, updated_at: '' };
    setDraft(item); setSelection({ kind: 'category', id: `${categoryKind}:${id}` }); setDirty(true); setDeleting(false); setCreationMenu(false); setTreeMenu(null); setEditorTab('basic');
  };
  const addPersona = (categoryId?: string) => {
    const category = categoryId ?? categories.find((item) => item.kind === 'technique')?.id;
    if (!category) { setError('先に処世術カテゴリを作成してください。'); return; }
    const id = `persona-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const item: OwnerPersona = { id, name: '', subtitle: '', category, image_path: null, access_tier: 'complete', draft_technique_ids: [], display_order: null, updated_at: '', status: 'draft' };
    setMode('technique'); setScope(`category:${category}`); setDraft(item); setSelection({ kind: 'persona', id }); setRelatedIds([]); setImageAsset(null); setDirty(true); setDeleting(false); setCreationMenu(false); setTreeMenu(null); setEditorTab('basic');
  };
  const duplicate = async (row: typeof allRows[number]) => {
    if (busy || dirty) { if (dirty) setError('複製する前に、編集中の変更を保存してください。'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (row.kind === 'technique') {
        const source = techniques.find((item) => item.id === row.id);
        if (!source) throw new Error('処世術が見つかりません。');
        const created = await createTechnique(source.persona_id);
        const snapshot = normalizeSnapshot({ ...snapshotFromTechnique(source), title: `${source.title}（コピー）`, display_order: created.draft_display_order ?? 1 });
        await saveTechniqueDraft(created.id, snapshot, created.updated_at || null);
        await reload();
        const clone = await fetchOwnerTechniques().then((items) => items.find((item) => item.id === created.id));
        if (clone) { setMode('technique'); setScope(clone.persona_id); setSelection({ kind: 'technique', id: clone.id }); setDraft(clone); setRelatedIds([]); setDirty(false); }
      } else if (row.kind === 'theory') {
        const source = theories.find((item) => item.tagId === row.id);
        const category = categories.find((item) => item.kind === 'theory' && item.id === source?.categoryId);
        if (!source || !category) throw new Error('複製する理論のカテゴリが見つかりません。');
        const created = await createTheoryDraft(category);
        const clone = { ...source, tagId: created.tagId, title: `${source.title}（コピー）`, displayId: null, draftDisplayId: created.draftDisplayId, displayOrder: created.draftDisplayId ?? 1, status: undefined, draftTechniqueIds: [] };
        await saveTheoryDraft(clone);
        await reload();
        const saved = await fetchOwnerTheories().then((items) => items.find((item) => item.tagId === created.tagId));
        if (saved) { setMode('theory'); setScope(saved.categoryId); setSelection({ kind: 'theory', id: saved.tagId }); setDraft(saved); setRelatedIds([]); setDirty(false); }
      } else {
        throw new Error('人物像は一覧メニューから複製できません。');
      }
      setEditorTab('basic'); setNotice('複製を下書きとして作成しました。'); await refreshPublishedContent();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '複製できませんでした。'); }
    finally { setBusy(false); }
  };
  const togglePublication = async (row: typeof allRows[number]) => {
    if (busy || dirty) { if (dirty) setError('公開状態を変更する前に、編集中の変更を保存してください。'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (row.kind === 'persona') {
        const item = personas.find((candidate) => candidate.id === row.id);
        if (!item) throw new Error('人物像が見つかりません。');
        const links = techniques.filter((item) => item.persona_id === row.title && item.status !== 'archived').map((item) => item.id);
        await savePersona({ ...item, status: item.status === 'published' ? 'draft' : 'published' }, item.status === 'draft' ? item.draft_technique_ids : links);
      } else if (row.kind === 'technique') {
        const item = techniques.find((candidate) => candidate.id === row.id);
        if (!item) throw new Error('処世術が見つかりません。');
        const snapshot = normalizeSnapshot(snapshotFromTechnique(item));
        if (item.status === 'published') await saveTechniqueDraft(item.id, snapshot, item.updated_at);
        else await saveAndPublishTechnique(item.id, snapshot, item.updated_at);
      } else {
        const item = theories.find((candidate) => candidate.tagId === row.id);
        if (!item) throw new Error('理論が見つかりません。');
        const links = item.status === 'published' ? techniques.filter((technique) => technique.status !== 'archived' && technique.theory_ids.includes(item.tagId)).map((technique) => technique.id) : item.draftTechniqueIds;
        if (item.status === 'published') await saveTheoryDraft({ ...item, draftTechniqueIds: links });
        else await publishTheory({ ...item, relatedTechniqueIds: links });
      }
      await reload();
      const reflected = await refreshPublishedContent();
      setNotice(reflected ? '公開状態をアプリへ反映しました。' : '状態を保存しました。公開表示の再取得は確認できませんでした。');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '公開状態を変更できませんでした。'); }
    finally { setBusy(false); }
  };
  const requestDelete = (row: typeof allRows[number]) => {
    if (dirty) { setPendingDelete(true); setPending({ kind: row.kind, id: row.id }); return; }
    chooseNow({ kind: row.kind, id: row.id }); setDeleting(true); setRowMenu(null); setTreeMenu(null);
  };
  const requestCategoryDelete = (category: ContentCategory) => {
    const target: Selection = { kind: 'category', id: `${category.kind}:${category.id}` };
    if (dirty) { setPendingDelete(true); setPending(target); return; }
    chooseNow(target); setDeleting(true); setTreeMenu(null);
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
    ids.splice(from,1); ids.splice(ids.indexOf(targetId),0,source.id);
    setBusy(true);
    try { await reorderContent(`${section}-category`, '', ids); await reload(); await refreshPublishedContent(); setNotice('カテゴリの並び順を保存しました。'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'カテゴリの並び順を保存できませんでした。'); }
    finally { setBusy(false); }
  };

  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="この画面はオーナー専用です。" /></Screen>;
  const compact = width < 1050;
  const canAddContent = mode === 'theory'
    ? categories.some((category) => category.kind === 'theory')
    : !techniquePersonaList && personas.some((persona) => persona.name === scope && persona.status === 'published');
  return <Screen contentContainerStyle={styles.screen}>
    <View style={styles.pageHeader}><AppText style={styles.title}>コンテンツ管理</AppText><AppText style={styles.muted}>カテゴリ、並び順、公開内容を一元管理</AppText></View>
    <View style={styles.modeSwitch}>
      <ModeCard title="処世術" description="人物像ごとの具体的な行動・振る舞い" active={mode === 'technique'} onPress={() => navigateTree('technique','')} />
      <ModeCard title="理論" description="心理学・行動科学・思想などの理論" active={mode === 'theory'} onPress={() => navigateTree('theory','')} />
    </View>
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    {pending ? <View style={styles.confirm}><AppText>未保存の変更があります。{pendingDelete ? '破棄して削除しますか？' : '破棄して移動しますか？'}</AppText><View style={styles.actions}><CmsButton onPress={() => { setPending(null); setPendingDelete(false); }}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => { chooseNow(pending); if (pendingDelete) setDeleting(true); setPendingDelete(false); }}>{pendingDelete ? '破棄して削除' : '破棄して移動'}</CmsButton></View></View> : null}
    {pendingLocation ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して階層を移動しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingLocation(null)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => { setDirty(false); setMode(pendingLocation.kind === 'theory' ? 'theory' : 'technique'); setScope(pendingLocation.scope); setSelection(null); setDraft(null); setQuery(''); setPendingLocation(null); }}>破棄して移動</CmsButton></View></View> : null}
    {pendingCreate ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して新規作成しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingCreate(false)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => void create(true)}>破棄して追加</CmsButton></View></View> : null}
    {pendingPreview ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄してアプリ画面へ移動しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingPreview(null)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => { const path = pendingPreview; setPendingPreview(null); setDirty(false); router.push(path); }}>破棄して確認</CmsButton></View></View> : null}
    <View style={[styles.layout, compact && styles.stacked]}>
      <ScrollView style={[styles.tree, compact && styles.compactTree]} contentContainerStyle={styles.treeBody}>
        <View style={styles.paneTitleRow}>
          <AppText style={styles.paneTitle}>{mode === 'theory' ? 'カテゴリ・理論' : 'カテゴリ・人物像'}</AppText>
          <View>
            <CmsButton compact onPress={() => setCreationMenu((value) => !value)}>＋ 追加</CmsButton>
            {creationMenu ? <ActionMenu actions={[
              { label: 'カテゴリを追加', onPress: addCategory },
              ...(mode === 'technique' ? [{ label: '人物像を追加', onPress: () => addPersona(scope.startsWith('category:') ? scope.slice(9) : undefined) }] : []),
            ]} /> : null}
          </View>
        </View>
        {mode === 'technique' ? categories.filter((category) => category.kind === 'technique').sort((a,b) => a.display_order-b.display_order).map((category,index) => {
          const expanded = openCategories[category.id] ?? index === 0;
          const categoryScope = `category:${category.id}`;
          const childPersonas = personas.filter((persona) => persona.category === category.id && persona.status !== 'archived').sort((a,b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER));
          const categoryMenuKey = `category:${category.id}`;
          return <View key={category.id}>
            <TreeRow label={category.title} count={String(childPersonas.length)} active={scope === categoryScope && !query} expanded={expanded} onExpand={() => setOpenCategories((value) => ({ ...value, [category.id]: !expanded }))} onPress={() => navigateTree('technique',categoryScope)} onMenu={() => setTreeMenu(treeMenu === categoryMenuKey ? null : categoryMenuKey)} onDragStart={() => { draggedCategory.current = { section: 'technique', id: category.id }; }} onDrop={() => void dropCategory('technique',category.id)} />
            {treeMenu === categoryMenuKey ? <ActionMenu actions={[
              { label: '編集', onPress: () => { choose({ kind: 'category', id: `technique:${category.id}` }); setTreeMenu(null); } },
              { label: '上へ並び替え', onPress: () => { void moveCategory('technique',category.id,-1); setTreeMenu(null); } },
              { label: '下へ並び替え', onPress: () => { void moveCategory('technique',category.id,1); setTreeMenu(null); } },
              { label: '削除', danger: true, onPress: () => requestCategoryDelete(category) },
            ]} /> : null}
            {expanded ? childPersonas.map((persona,index) => {
              const personaMenuKey = `persona:${persona.id}`;
              const count = techniques.filter((item) => item.persona_id === persona.name && item.status !== 'archived').length;
              const onPersonaDrop = () => {
                const sourceId = draggedPersona.current;
                draggedPersona.current = null;
                if (sourceId && sourceId !== persona.id) void movePersona(sourceId,persona.id);
              };
              return <View key={persona.id}>
                <TreeRow nested label={persona.name || '名称未設定'} count={String(count)} active={scope === persona.name && !query} onPress={() => navigateTree('technique',persona.name)} onMenu={() => setTreeMenu(treeMenu === personaMenuKey ? null : personaMenuKey)} onDragStart={() => { draggedPersona.current=persona.id; }} onDrop={onPersonaDrop} />
                {treeMenu === personaMenuKey ? <ActionMenu actions={[
                  { label: '編集', onPress: () => { choose({ kind: 'persona', id: persona.id }); setTreeMenu(null); } },
                  { label: '上へ並び替え', onPress: () => { const previous=childPersonas[index-1]; if (previous) void movePersona(persona.id,previous.id); setTreeMenu(null); } },
                  { label: '下へ並び替え', onPress: () => { const next=childPersonas[index+1]; if (next) void movePersona(persona.id,next.id); setTreeMenu(null); } },
                  { label: '削除', danger: true, onPress: () => requestDelete({ kind: 'persona', id: persona.id, title: persona.name, category: category.title, status: persona.status, order: persona.display_order, displayLabel: undefined, updated: persona.updated_at, subtitle: persona.subtitle, searchBody: '', image: persona.image_path, reference: count, detail: persona.category }) },
                ]} /> : null}
              </View>;
            }) : null}
          </View>;
        }) : categories.filter((category) => category.kind === 'theory').sort((a,b) => a.display_order-b.display_order).map((category,index) => {
          const categoryMenuKey = `category:${category.id}`;
          const count = theories.filter((item) => item.categoryId === category.id && item.status !== 'archived').length;
          return <View key={category.id}>
            <TreeRow label={category.title} count={String(count)} active={scope === category.id && !query} onPress={() => navigateTree('theory',category.id)} onMenu={() => setTreeMenu(treeMenu === categoryMenuKey ? null : categoryMenuKey)} onDragStart={() => { draggedCategory.current = { section: 'theory', id: category.id }; }} onDrop={() => void dropCategory('theory',category.id)} />
            {treeMenu === categoryMenuKey ? <ActionMenu actions={[
              { label: '編集', onPress: () => { choose({ kind: 'category', id: `theory:${category.id}` }); setTreeMenu(null); } },
              { label: '上へ並び替え', onPress: () => { void moveCategory('theory',category.id,-1); setTreeMenu(null); } },
              { label: '下へ並び替え', onPress: () => { void moveCategory('theory',category.id,1); setTreeMenu(null); } },
              { label: '削除', danger: true, onPress: () => requestCategoryDelete(category) },
            ]} /> : null}
          </View>;
        })}
      </ScrollView>
      <View style={[styles.list, compact && styles.compactList]}>
        <View style={styles.listTop}>
          <View style={styles.listHeading}><AppText style={styles.breadcrumb}>{query ? '検索結果' : mode === 'theory' ? `理論　›　${scopeLabel || 'すべて'}` : techniquePersonaList ? `処世術　›　${scopeLabel || '人物像'}` : scopeLabel}</AppText><AppText style={styles.count}>{fetching ? '読込中…' : `${rows.length}件`}</AppText></View>
          <View style={styles.listControls}>
            <TextInput accessibilityLabel="タイトル・本文で検索" value={query} onChangeText={setQuery} placeholder="タイトル・本文で検索" style={[styles.search,{ flex: 1 }]} />
            <View style={styles.sortControl}><AppText style={styles.muted}>並び順</AppText><Choice label="" value={listSort} options={[["display","表示順"],["title","タイトル"],["status","公開状態"]]} onChange={(value) => setListSort(value as typeof listSort)} /></View>
            <CmsButton variant="primary" disabled={busy || !canAddContent} onPress={() => void create()}>{mode === 'theory' ? '＋ 理論を追加' : '＋ 処世術を追加'}</CmsButton>
          </View>
          <AppText style={styles.muted}>{query ? '検索時は並び替えを保存できません。' : listSort !== 'display' ? '表示順に戻すとドラッグできます。' : '並べ替えはドラッグ後にDBへ保存されます。'}</AppText>
        </View>
        <FlatList data={rows} keyExtractor={(row) => `${row.kind}:${row.id}`} style={styles.rowScroller} initialNumToRender={20} windowSize={7} keyboardShouldPersistTaps="handled"
          renderItem={({ item: row }) => {
            const reorderable = !query && listSort === 'display' && (techniquePersonaList
              ? scope.startsWith('category:') && row.kind === 'persona' && row.status !== 'archived'
              : row.kind === mode && row.status === 'published' && Boolean(scope));
            const active = selection?.kind === row.kind && selection.id === row.id;
            const menuKey = `${row.kind}:${row.id}`;
            return <View>
              <View style={[styles.row, active && styles.rowActive]} {...(Platform.OS === 'web' ? { draggable: Boolean(reorderable), onDragStart: () => { draggedId.current = row.id; }, onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(), onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); if (draggedId.current && reorderable) void move(draggedId.current,row.id); draggedId.current = null; } } as any : {})}>
                <AppText style={[styles.handle, !reorderable && styles.handleDisabled]}>⠿</AppText>
                <AppText style={styles.number}>{row.displayLabel ?? (row.order == null ? '—' : String(row.order).padStart(2,'0'))}</AppText>
                {row.image ? <Image source={row.kind === 'persona' ? getPersonaPresentation(row.title)?.image : { uri: contentImageUrl(row.image) ?? '' }} style={styles.thumb} /> : null}
                <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => choose({ kind: row.kind, id: row.id })} style={styles.rowCopy}>
                  <AppText numberOfLines={1} style={styles.rowTitle}>{row.title}</AppText>
                  {row.subtitle ? <AppText numberOfLines={1} style={styles.rowSummary}>{row.subtitle}</AppText> : null}
                  <AppText numberOfLines={1} style={styles.muted}>{row.kind === 'technique' ? `${categoryTitle('technique',row.detail,categories)}　›　${row.category}` : row.category}{row.kind === 'technique' ? `　·　重要度 ${'★'.repeat(Number(row.reference))}` : `　·　関連 ${row.reference}件`}</AppText>
                </Pressable>
                <StatusBadge status={row.status} />
                <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}の操作`} onPress={() => setRowMenu(rowMenu === menuKey ? null : menuKey)} style={styles.menuButton}><AppText style={styles.menuDots}>⋮</AppText></Pressable>
              </View>
              {rowMenu === menuKey ? <ActionMenu actions={[
                { label: '編集', onPress: () => { choose({ kind: row.kind, id: row.id }); setRowMenu(null); } },
                ...(row.kind === 'technique' || row.kind === 'theory' ? [{ label: '複製して下書き作成', onPress: () => { setRowMenu(null); void duplicate(row); } }] : []),
                { label: row.status === 'published' ? '下書きに戻す' : '公開する', onPress: () => { setRowMenu(null); void togglePublication(row); } },
                { label: '削除', danger: true, onPress: () => requestDelete(row) },
              ]} /> : null}
            </View>;
          }}
          ListEmptyComponent={!fetching ? <AppText style={styles.muted}>一致するコンテンツはありません。</AppText> : null}
        />
      </View>
      <ScrollView style={[styles.editor, compact && styles.compactEditor]} contentContainerStyle={styles.editorBody} nestedScrollEnabled>
        {selection && draft ? <>
          <View style={styles.editorHeader}>
            <View style={styles.editorHeading}><AppText numberOfLines={2} style={styles.editorTitle}>{selectedTitle || '新規コンテンツ'}</AppText>{selection.kind !== 'category' ? <StatusBadge status={(draft as OwnerPersona | TechniqueContent | OwnerTheory).status} /> : null}<Pressable accessibilityRole="button" accessibilityLabel="編集項目の操作" onPress={() => setRowMenu(rowMenu === 'editor' ? null : 'editor')} style={styles.menuButton}><AppText style={styles.menuDots}>⋮</AppText></Pressable></View>
            <View style={styles.editorMeta}><AppText style={styles.muted}>{selectedPath}</AppText>{dirty ? <AppText style={styles.unsaved}>未保存</AppText> : null}</View>
            {rowMenu === 'editor' ? <ActionMenu actions={selection.kind === 'category'
              ? [{ label: '削除', danger: true, onPress: () => requestCategoryDelete(draft as ContentCategory) }]
              : selectedRow ? [
                { label: selectedRow.status === 'published' ? '下書きに戻す' : '公開する', onPress: () => void togglePublication(selectedRow) },
                ...(selectedRow.kind === 'technique' || selectedRow.kind === 'theory' ? [{ label: '複製して下書き作成', onPress: () => void duplicate(selectedRow) }] : []),
                { label: '削除', danger: true, onPress: () => requestDelete(selectedRow) },
              ] : []} /> : null}
          </View>
          <View style={styles.editorTabs}>{([['basic','基本情報'],['body','本文'],['memo','補足メモ'],['publish','公開設定']] as Array<[EditorTab,string]>).map(([tab,label]) => <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: editorTab === tab }} onPress={() => setEditorTab(tab)} style={[styles.editorTab,editorTab === tab && styles.editorTabActive]}><AppText style={[styles.editorTabText,editorTab === tab && styles.editorTabTextActive]}>{label}</AppText></Pressable>)}</View>
          {selection.kind === 'category' && editorTab === 'basic' ? <Section title="カテゴリ"><Field label="カテゴリ名" value={(draft as ContentCategory).title} onChange={(title) => patch({ title })} /><AppText style={styles.muted}>カテゴリ名と順序はCMSとアプリの両方に反映されます。</AppText></Section> : null}
          {selection.kind === 'persona' && editorTab === 'basic' ? <Section title="基本情報"><Field label="人物像名" value={(draft as OwnerPersona).name} onChange={(name) => patch({ name })} /><Choice label="カテゴリ" value={(draft as OwnerPersona).category} options={categories.filter((c) => c.kind === 'technique').sort((a,b) => a.display_order-b.display_order).map((c) => [c.id,c.title])} onChange={(category) => patch({ category })} /><IntegerField label="並び順" value={(draft as OwnerPersona).display_order} onChange={(display_order) => patch({ display_order })} /></Section> : null}
          {selection.kind === 'persona' && editorTab === 'body' ? <Section title="概要"><Field label="サブタイトル" value={(draft as OwnerPersona).subtitle} onChange={(subtitle) => patch({ subtitle })} multi /></Section> : null}
          {selection.kind === 'persona' && editorTab === 'memo' ? <Section title="所属する処世術"><MultiPicker options={techniques.filter((item) => item.status !== 'archived').map((item) => ({ id: item.id, title: item.title || '無題の処世術' }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><AppText style={styles.muted}>所属する処世術は、移動先を指定してからこの人物像から外してください。</AppText></Section> : null}
          {selection.kind === 'persona' && editorTab === 'publish' ? <><MediaEditor source={selectedImage} path={imagePath} asset={imageAsset} onPick={selectImage} onRemove={() => { patch({ image_path: null }); setImageAsset(null); }} /><Section title="公開設定"><Choice label="公開範囲" value={(draft as OwnerPersona).access_tier} options={[["free","無料版"],["complete","完全版"]]} onChange={(access_tier) => patch({ access_tier })} /><CmsButton onPress={() => { const path=personaRoute((draft as OwnerPersona).category,(draft as OwnerPersona).name); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section></> : null}
          {selection.kind === 'technique' && editorTab === 'basic' ? <Section title="基本情報"><Field label="タイトル" value={(draft as TechniqueContent).title} onChange={(title) => patch({ title })} /><Field label="概要" value={(draft as TechniqueContent).essence} onChange={(essence) => patch({ essence })} multi /><Choice label="カテゴリ・人物像" value={(draft as TechniqueContent).persona_id} options={personas.filter((p) => p.status === 'published').sort((a,b) => (a.display_order ?? 0)-(b.display_order ?? 0)).map((p) => [p.name,p.name])} onChange={(persona_id) => { const persona=personas.find((p) => p.name === persona_id); patch({ persona_id, category: persona?.category ?? (draft as TechniqueContent).category }); }} /><ListField label="タグ" items={(draft as TechniqueContent).tags ?? getTechniqueTags({ id: (draft as TechniqueContent).id, title: (draft as TechniqueContent).title, subtitle: (draft as TechniqueContent).essence, explanation: (draft as TechniqueContent).explanation, categoryName: categoryTitle('technique',(draft as TechniqueContent).category,categories), subcategory: (draft as TechniqueContent).persona_id, articleTitle: (draft as TechniqueContent).persona_id })} onChange={(tags) => patch({ tags })} />{(draft as TechniqueContent).tags === null ? <AppText style={styles.muted}>現在のタグは自動生成です。編集するとタグを明示保存します。</AppText> : null}<IntegerField label="並び順" value={(draft as TechniqueContent).display_order ?? (draft as TechniqueContent).draft_display_order} onChange={(display_order) => patch({ display_order })} /></Section> : null}
          {selection.kind === 'technique' && editorTab === 'body' ? <Section title="本文"><Field label="解説" value={(draft as TechniqueContent).explanation} onChange={(explanation) => patch({ explanation })} multi /><ListField label="今日からできる実践" items={(draft as TechniqueContent).practices} onChange={(practices) => patch({ practices })} /><ListField label="具体例" items={(draft as TechniqueContent).examples} onChange={(examples) => patch({ examples })} /><ListField label="注意点" items={(draft as TechniqueContent).cautions} onChange={(cautions) => patch({ cautions })} /></Section> : null}
          {selection.kind === 'technique' && editorTab === 'memo' ? <Section title="補足メモ"><Field label="メモ" value={(draft as TechniqueContent).memo} onChange={(memo) => patch({ memo })} multi /></Section> : null}
          {selection.kind === 'technique' && editorTab === 'publish' ? <><MediaEditor path={imagePath} asset={imageAsset} onPick={selectImage} onRemove={() => { patch({ image_path: null }); setImageAsset(null); }} /><Section title="公開設定"><Choice label="公開範囲" value={(draft as TechniqueContent).access_tier} options={[["free","無料版"],["complete","完全版"]]} onChange={(access_tier) => patch({ access_tier })} /><Choice label="重要度" value={String((draft as TechniqueContent).importance)} options={[["1","★"],["2","★★"],["3","★★★"]]} onChange={(importance) => patch({ importance: Number(importance) })} /><CmsButton onPress={() => { const path=techniqueRoute(selection.id); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section><Section title="関連付け"><AppText variant="label">主要理論</AppText><MultiPicker options={theories.filter((item) => item.status === 'published').map((item) => ({ id: item.tagId, title: item.title }))} ids={(draft as TechniqueContent).primary_theory_ids} onChange={(ids) => patch({ primary_theory_ids: ids, theory_ids: [...new Set([...ids,...(draft as TechniqueContent).theory_ids])] })} /><AppText variant="label">あわせて読む理論</AppText><MultiPicker options={theories.filter((item) => item.status === 'published').map((item) => ({ id: item.tagId, title: item.title }))} ids={(draft as TechniqueContent).theory_ids.filter((id) => !(draft as TechniqueContent).primary_theory_ids.includes(id))} onChange={(ids) => patch({ theory_ids: [...(draft as TechniqueContent).primary_theory_ids,...ids] })} /></Section></> : null}
          {selection.kind === 'theory' && editorTab === 'basic' ? <Section title="基本情報"><Field label="理論名" value={(draft as OwnerTheory).title} onChange={(title) => patch({ title })} /><Choice label="カテゴリ" value={(draft as OwnerTheory).categoryId} options={categories.filter((c) => c.kind === 'theory').sort((a,b) => a.display_order-b.display_order).map((c) => [c.id,c.title])} onChange={(categoryId) => patch({ categoryId, categoryTitle: categoryTitle('theory',categoryId,categories) })} /><IntegerField label="表示ID" value={(draft as OwnerTheory).displayId ?? (draft as OwnerTheory).draftDisplayId ?? (draft as OwnerTheory).displayOrder ?? 1} onChange={(display_id) => patch((draft as OwnerTheory).status === 'published' ? { displayId: display_id, displayOrder: display_id } : { draftDisplayId: display_id, displayOrder: display_id })} /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'body' ? <Section title="本文"><Field label="概要・本文" value={(draft as OwnerTheory).summary} onChange={(summary) => patch({ summary })} multi /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'memo' ? <Section title="補足メモ・別名"><Field label="別名（1行に1件）" value={((draft as OwnerTheory).aliases ?? []).join('\n')} onChange={(value) => patch({ aliases: value.split('\n').map((item) => item.trim()).filter(Boolean) })} multi /><TheoryDetailsEditor value={draft as OwnerTheory} options={theories.filter((item) => item.status === 'published')} disabled={busy} onChange={patch} /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'publish' ? <><MediaEditor path={imagePath} asset={imageAsset} onPick={selectImage} onRemove={() => { patch({ imagePath: null }); setImageAsset(null); }} /><Section title="公開設定"><Choice label="公開範囲" value={(draft as OwnerTheory).accessTier ?? 'complete'} options={[["free","無料版"],["complete","完全版"]]} onChange={(accessTier) => patch({ accessTier })} /><AppText style={styles.muted}>URLと関連付けには内部IDを使い、ここで変更する表示IDとは分離しています。</AppText><AppText variant="label">関連する処世術</AppText><MultiPicker options={techniques.filter((item) => item.status !== 'archived').map((item) => ({ id: item.id, title: item.title || '無題の処世術' }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><CmsButton onPress={() => { const path=theoryRoute(selection.id); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section></> : null}
          {selection.kind === 'category' && editorTab !== 'basic' ? <EmptyState title="カテゴリ設定" description="カテゴリ名と順序は基本情報タブで編集できます。" /> : null}
          {selection.kind !== 'category' ? <View style={styles.saveBar}><View style={styles.danger}><AppText style={styles.dangerTitle}>削除</AppText>{relatedLabels.length ? <AppText style={styles.muted}>関連・所属 {relatedLabels.length}件。削除はこの項目をアプリの公開一覧から外します。</AppText> : null}{deleting ? <View style={styles.confirm}><AppText>「{selectedTitle}」をアーカイブしますか？</AppText>{relatedLabels.slice(0,8).map((label,index) => <AppText key={`${index}:${label}`} style={styles.muted}>・{label}</AppText>)}{relatedLabels.length > 8 ? <AppText style={styles.muted}>ほか {relatedLabels.length-8}件</AppText> : null}{hasBlockingLinks ? <AppText style={styles.error}>参照先を移動・解除してから削除できます。</AppText> : null}<View style={styles.actions}><CmsButton onPress={() => setDeleting(false)}>キャンセル</CmsButton><CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => void remove()}>削除を確定</CmsButton></View></View> : <CmsButton variant="danger" disabled={busy || (selection.kind === 'persona' && relatedLabels.length > 0)} onPress={() => setDeleting(true)}>削除</CmsButton>}</View><View style={styles.saveActions}><CmsButton disabled={busy} onPress={() => void save(false)}>下書き保存</CmsButton><CmsButton variant="primary" disabled={busy} onPress={() => void save(true)}>{busy ? '保存中…' : '公開する'}</CmsButton></View></View> : <View style={styles.saveBar}><View style={styles.danger}><AppText style={styles.dangerTitle}>カテゴリの削除</AppText>{relatedLabels.length ? <AppText style={styles.muted}>所属するコンテンツ {relatedLabels.length}件。削除前に別カテゴリへ移動してください。</AppText> : null}{deleting ? <View style={styles.confirm}><AppText>「{selectedTitle}」を削除しますか？</AppText>{hasBlockingLinks ? <AppText style={styles.error}>子項目が残っているため削除できません。</AppText> : null}<View style={styles.actions}><CmsButton onPress={() => setDeleting(false)}>キャンセル</CmsButton><CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => void remove()}>削除を確定</CmsButton></View></View> : <CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => setDeleting(true)}>削除</CmsButton>}</View><View style={styles.saveActions}><CmsButton variant="primary" disabled={busy} onPress={() => void save(true)}>{busy ? '保存中…' : '保存'}</CmsButton></View></View>}
        </> : <EmptyState title="コンテンツを選択" description="左の階層を選び、中央の一覧から編集する項目を選択してください。" />}
      </ScrollView>
    </View>
  </Screen>;
}

function categoryTitle(kind: ContentCategory['kind'], id: string, categories: ContentCategory[]) { return categories.find((c) => c.kind === kind && c.id === id)?.title ?? id; }
function ModeCard({ title, description, active, onPress }: { title: string; description: string; active: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeCard,active && styles.modeCardActive]}><AppText style={[styles.modeCardTitle,active && styles.modeCardTitleActive]}>{title}</AppText><AppText style={[styles.modeCardDescription,active && styles.modeCardDescriptionActive]}>{description}</AppText></Pressable>; }
function CmsButton({ children, onPress, disabled, variant = 'secondary', compact }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; compact?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button,compact && styles.buttonCompact,variant === 'primary' && styles.buttonPrimary,variant === 'danger' && styles.buttonDanger,disabled && styles.buttonDisabled]}><AppText style={[styles.buttonText,variant === 'primary' && styles.buttonTextPrimary,variant === 'danger' && styles.buttonTextDanger]}>{children}</AppText></Pressable>; }
function StatusBadge({ status }: { status: string }) { return <AppText style={[styles.badge,status === 'draft' && styles.badgeDraft,status === 'archived' && styles.badgeArchived]}>{statusLabel(status)}</AppText>; }
type MenuAction = { label: string; onPress: () => void; danger?: boolean };
function ActionMenu({ actions }: { actions: MenuAction[] }) { return <View style={styles.menu}>{actions.map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress} style={[styles.menuItem,action.danger && styles.menuItemDanger]}><AppText style={action.danger ? styles.menuTextDanger : styles.menuText}>{action.label}</AppText></Pressable>)}</View>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><AppText style={styles.sectionTitle}>{title}</AppText>{children}</View>; }
function TreeRow({ label, count, active, expanded, nested, onPress, onMenu, onExpand, onDragStart, onDrop }: { label: string; count: string; active: boolean; expanded?: boolean; nested?: boolean; onPress: () => void; onMenu: () => void; onExpand?: () => void; onDragStart?: () => void; onDrop?: () => void }) { return <View style={[styles.treeRow,active && styles.treeActive,nested && { paddingLeft: 23 }]} {...(Platform.OS === 'web' && onDragStart ? { draggable: true, onDragStart, onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(), onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); onDrop?.(); } } as any : {})}>{onExpand ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}を${expanded ? '閉じる' : '開く'}`} onPress={onExpand} style={styles.treeDisclosure}><AppText style={styles.treeDisclosure}>{expanded ? '⌄' : '›'}</AppText></Pressable> : <AppText style={styles.handle}>⠿</AppText>}<Pressable accessibilityRole="button" onPress={onPress} style={{ flex: 1, minWidth: 0 }}><AppText numberOfLines={1} style={styles.treeText}>{label}</AppText></Pressable><AppText style={styles.treeCount}>{count}</AppText><Pressable accessibilityRole="button" accessibilityLabel={`${label}の操作`} onPress={onMenu} style={styles.menuButton}><AppText style={styles.menuDots}>⋮</AppText></Pressable></View>; }
function Field({ label, value, onChange, multi }: { label: string; value: string; onChange: (value: string) => void; multi?: boolean }) { return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multi} style={[styles.input, multi && styles.multi]} /></View>; }
function IntegerField({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (value: number) => void }) { const [text,setText] = useState(value == null ? '' : String(value)); useEffect(() => { setText(value == null ? '' : String(value)); }, [value]); return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} keyboardType="number-pad" value={text} onChangeText={setText} onBlur={() => { const parsed=Number.parseInt(text,10); const next=Number.isFinite(parsed) && parsed > 0 ? parsed : Math.max(1,value ?? 1); setText(String(next)); onChange(next); }} style={[styles.input,{ maxWidth: 130 }]} /><AppText style={styles.muted}>{label === '表示ID' ? '選択中カテゴリ内の表示番号です。移動時は同じカテゴリ内で自動採番します。' : '同じ人物像内の表示順です。保存時に周囲を自動調整します。'}</AppText></View>; }
function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <View style={styles.field}>{label ? <AppText variant="label">{label}</AppText> : null}<View style={styles.actions}>{options.map(([id,title]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: value === id }} onPress={() => onChange(id)} style={[styles.choice,value === id && styles.choiceActive]}><AppText style={styles.buttonText}>{title}</AppText></Pressable>)}</View></View>; }
function MultiPicker({ options, ids, onChange }: { options: Array<{ id: string; title: string }>; ids: string[]; onChange: (ids: string[]) => void }) { const [search,setSearch] = useState(''); return <View style={styles.field}><View style={styles.chips}>{ids.map((id) => <Pressable key={id} accessibilityRole="button" onPress={() => onChange(ids.filter((item) => item !== id))} style={styles.chip}><AppText numberOfLines={1}>{options.find((o) => o.id === id)?.title ?? id}　×</AppText></Pressable>)}</View><TextInput accessibilityLabel="関連コンテンツを検索" value={search} onChangeText={setSearch} placeholder="名前・IDで検索して追加" style={styles.input} /><ScrollView nestedScrollEnabled style={{ maxHeight: 170 }}>{options.filter((item) => !ids.includes(item.id) && [item.title,item.id].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,20).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { onChange([...ids,item.id]); setSearch(''); }} style={styles.option}><AppText numberOfLines={1}>＋ {item.title}</AppText></Pressable>)}</ScrollView></View>; }
function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) { return <View style={styles.field}><AppText variant="label">{label}</AppText>{items.map((item,index) => <View key={index} style={styles.actions}><TextInput value={item} onChangeText={(value) => onChange(items.map((x,i) => i === index ? value : x))} multiline style={[styles.input,{ flex: 1 }]} /><CmsButton onPress={() => onChange(items.filter((_,i) => i !== index))}>削除</CmsButton></View>)}<CmsButton onPress={() => onChange([...items,''])}>＋ 追加</CmsButton></View>; }
function MediaEditor({ source, path, asset, onPick, onRemove }: { source?: unknown; path?: string | null; asset: ContentImageAsset | null; onPick: (asset: ContentImageAsset | null) => void; onRemove: () => void }) { const [refs,setRefs] = useState(0); useEffect(() => { if (path) void countImageReferences(path).then(setRefs).catch(() => setRefs(0)); else setRefs(0); }, [path]); const shown = asset ? { uri: asset.uri } : contentImageUrl(path) ? { uri: contentImageUrl(path)! } : source; return <Section title="メディア"><View style={styles.mediaRow}>{shown ? <Image source={shown as any} style={styles.mediaPreview} contentFit="cover" /> : <View style={styles.mediaPreview}><AppText style={styles.muted}>画像なし</AppText></View>}<View style={styles.field}><AppText style={styles.muted}>{path?.startsWith('bundled:') ? `同梱画像: ${path}` : path ? `Storage: ${path}` : '未設定'}</AppText>{refs > 1 ? <AppText style={styles.error}>この画像は他の{refs-1}件でも使用中です。参照だけを外し、共有ファイルは残します。</AppText> : null}<CmsButton onPress={() => void pickContentImage().then(onPick)}>画像を選択・差し替え</CmsButton><CmsButton variant="danger" onPress={onRemove}>画像を削除</CmsButton></View></View><View style={styles.drop} {...(Platform.OS === 'web' ? { onDragOver: (e: { preventDefault: () => void }) => e.preventDefault(), onDrop: (e: { preventDefault: () => void; dataTransfer: { files: FileList } }) => { e.preventDefault(); const file=e.dataTransfer.files[0]; if (file?.type.startsWith('image/')) onPick({ uri: URL.createObjectURL(file), width: 0, height: 0, fileName: file.name, mimeType: file.type, fileSize: file.size }); } } as any : {})}><AppText style={styles.muted}>画像をここへドラッグ＆ドロップ</AppText></View></Section>; }
