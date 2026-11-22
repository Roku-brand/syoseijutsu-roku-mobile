import { OwnerQuotationReviews } from './owner-quotation-reviews';
import { OwnerPublicationStatus } from './owner-publication-status';
import { TheorySubcategoryFields, TheorySubcategoryManager } from './owner-theory-taxonomy';
import { theorySubcategories } from '@/data/theory-taxonomy';
import { fetchTheorySubcategories, reorderSubcategoryTheories } from '@/data/owner-theory-taxonomy';
import { Redirect, router, useFocusEffect, useLocalSearchParams, useRootNavigationState, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { PageScroll } from './page-scroll';
import { CmsWheel } from './owner-cms-wheel';
import { TheoryDetailsEditor } from '@/components/owner-theory-details';
import { ownerCmsStyles as styles } from './owner-cms.styles';
import { archivePersona, fetchOwnerPersonas, savePersona, type OwnerPersona } from '@/data/owner-personas';
import { archiveTechnique, createTechnique, fetchOwnerTechniques, normalizeSnapshot, reorderTechniqueDrafts, saveAndPublishTechnique, saveTechniqueDraft, snapshotFromTechnique, type TechniqueContent } from '@/data/owner-content';
import { archiveTheory, fetchOwnerTheories, publishTheory } from '@/data/owner-theories';
import { createTheoryDraft, deleteContentCategory, fetchContentCategories, reorderContent, saveContentCategory, saveTheoryDraft, type ContentCategory, type ContentKind } from '@/data/owner-cms';
import { contentImageUrl } from '@/lib/content-media';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { techniqueEditorialStages } from '@/data/technique-editorial-stage';
import { getTechniqueTags } from '@/data/technique-tags';
import { APP_ROUTES, personaRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { HeaderBackAction } from '@/navigation/header-back-action';
import { cmsErrorMessage } from '@/data/cms-errors';

type OwnerTheory = Awaited<ReturnType<typeof fetchOwnerTheories>>[number];
type Item = OwnerPersona | TechniqueContent | OwnerTheory | ContentCategory;
type Selection = { kind: ContentKind | 'category'; id: string };
type CmsMode = 'technique' | 'theory';
type EditorTab = 'basic' | 'body' | 'memo' | 'publish';
const statusLabel = (status: string) => status === 'published' ? '公開中' : status === 'draft' ? '下書き' : 'アーカイブ';

const catalogRoute = (kind: CmsMode): Href => ({ pathname: APP_ROUTES.ownerContent, params: { kind } });

export default function OwnerCmsScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const navigation = useRootNavigationState();
  const previous = navigation?.routes[(navigation.index ?? 0) - 1];
  const closeCatalog = () => {
    if (previous?.name === 'owner/content' && !(previous.params && 'kind' in previous.params)) router.back();
    else router.replace(APP_ROUTES.ownerContent);
  };
  const { loading, user, role } = useAuth();
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="この画面はオーナー専用です。" /></Screen>;
  if (kind === 'technique' || kind === 'theory') return <OwnerCatalogEditor key={kind} mode={kind} closeCatalog={closeCatalog} />;

  return <Screen contentContainerStyle={styles.screen}>
    <View style={styles.modeSwitch}>
      {([
        ['処世術', catalogRoute('technique')],
        ['理論', catalogRoute('theory')],
        ['人気ランキング', '/owner/rankings'],
        ['特集', APP_ROUTES.ownerFeatures],
      ] satisfies [string, Href][]).map(([title, href]) =>
        <Pressable key={title} accessibilityRole="button" onPress={() => router.push(href)} style={styles.modeCard}>
          <AppText style={styles.modeCardTitle}>{title}</AppText>
        </Pressable>,
      )}
    </View>
    <OwnerPublicationStatus />
  </Screen>;
}

function OwnerCatalogEditor({ mode, closeCatalog }: { mode: CmsMode; closeCatalog: () => void }) {
  const { refreshPublishedContent } = useAccess();
  const [editing, setEditing] = useState(true);
  const [showTheoryList, setShowTheoryList] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('basic');
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
  useEffect(() => { setEditing(true); }, [selection?.id]);
  const [draft, setDraft] = useState<Item | null>(null);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<Selection | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ scope: string; allTheories?: boolean } | null>(null);
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
      const [p, t, h, c] = await Promise.all([fetchOwnerPersonas(), fetchOwnerTechniques(), fetchOwnerTheories(), fetchContentCategories(), fetchTheorySubcategories()]);
      setPersonas(p); setTechniques(t); setTheories(h); setCategories(c);
      return true;
    } catch (cause) { setError(cmsErrorMessage(cause)); return false; }
    finally { setFetching(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
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
    setEditing(true);
    setEditorTab('basic');
    setSelection(target); setDraft(item ? structuredClone(item) : null);
    setRelatedIds(target.kind === 'persona' && item ? (item as OwnerPersona).status === 'draft' ? (item as OwnerPersona).draft_technique_ids ?? [] : techniques.filter((t) => t.persona_id === (item as OwnerPersona).name && t.status !== 'archived').map((t) => t.id)
      : target.kind === 'theory' && item ? (item as OwnerTheory).status === 'draft' ? (item as OwnerTheory).draftTechniqueIds ?? [] : techniques.filter((t) => t.theory_ids.includes(target.id) && t.status !== 'archived').map((t) => t.id) : []);
    setDirty(false); setPending(null); setPendingDelete(false); setPendingCreate(false); setDeleting(false); setRowMenu(null); setTreeMenu(null); setError(''); setNotice('');
  };
  const choose = (target: Selection) => { if (busy) return; if (dirty) { setPendingDelete(false); setPending(target); } else chooseNow(target); };
  const openScope = ({ scope: nextScope, allTheories = false }: { scope: string; allTheories?: boolean }) => {
    setScope(nextScope); setShowTheoryList(allTheories); setQuery(''); setSelection(null); setDraft(null);
    setDirty(false); setRowMenu(null); setTreeMenu(null); setCreationMenu(false); setPendingLocation(null);
    setError(''); setNotice('');
  };
  const navigateTree = (nextScope: string, allTheories?: boolean) => {
    if (busy) return;
    const location = { scope: nextScope, allTheories };
    if (dirty) setPendingLocation(location);
    else openScope(location);
  };
  const patch = (changes: Record<string, unknown>) => { setDraft((item) => item ? { ...item, ...changes } as Item : item); setDirty(true); setNotice(''); };

  const allRows = useMemo(() => [
    ...personas.map((item) => ({ kind: 'persona' as const, id: item.id, title: item.name, category: categoryTitle('technique', item.category, categories), status: item.status, order: item.display_order, updated: item.updated_at, subtitle: item.subtitle, searchBody: '', image: item.image_path, reference: techniques.filter((t) => t.persona_id === item.name && t.status !== 'archived').length, detail: item.category })),
    ...techniques.map((item) => ({ kind: 'technique' as const, id: item.id, title: item.title || '無題の処世術', category: item.persona_id, status: item.status, order: item.display_order ?? item.draft_display_order, updated: item.updated_at, subtitle: item.essence, searchBody: [item.explanation,item.memo,...item.practices,...item.cautions].join(' '), image: item.image_path, reference: item.importance, detail: item.category })),
    ...theories.map((item) => ({ kind: 'theory' as const, id: item.tagId, title: item.title || '無題の理論', category: [categoryTitle('theory', item.categoryId, categories),theorySubcategories.find(s=>s.id===item.subcategoryId)?.title].filter(Boolean).join(' > '), status: item.status, order: item.sortOrder ?? item.displayId ?? item.draftDisplayId ?? item.displayOrder, updated: item.updatedAt, subtitle: item.summary, searchBody: (item.aliases ?? []).join(' '), image: item.imagePath, reference: techniques.filter((t) => t.theory_ids.includes(item.tagId) && t.status !== 'archived').length, detail: item.categoryId })),
  ], [personas, techniques, theories, categories]);
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const stage = mode === 'technique' ? techniqueEditorialStages.find(([id]) => scope === 'stage:' + id) : undefined;
  const scopedPersona = mode === 'technique' && scope.startsWith('persona:') ? personas.find((persona) => persona.id === scope.slice(8)) : undefined;
  const techniquePersonaList = mode === 'technique' && !stage && !scope.startsWith('persona:');
  const stageCounts = new Map(techniqueEditorialStages.map(([id]) => [
    id, techniques.filter((item) => item.status !== 'archived' && item.editorial_stage === id).length,
  ]));
  const stageTechniqueIds = stage ? new Set(techniques.filter((item) => item.status !== 'archived' && item.editorial_stage === stage[0]).map((item) => item.id)) : null;
  const orderNumber = (order: number | null | undefined) => order ?? Number.MAX_SAFE_INTEGER;
  const visibleRows = allRows.filter((row) => stageTechniqueIds
    ? row.kind === 'technique' && stageTechniqueIds.has(row.id) && words.every((word) => [row.id, row.title, row.category, row.subtitle, row.searchBody].join(' ').toLocaleLowerCase().includes(word))
    : words.length
    ? (mode === 'theory' ? row.kind === 'theory' : row.kind !== 'theory') && words.every((word) => [row.id, row.title, row.category, row.subtitle, row.searchBody, row.detail].join(' ').toLocaleLowerCase().includes(word))
    : techniquePersonaList
      ? row.kind === 'persona' && (!scope || (scope.startsWith('category:') ? row.detail === scope.slice(9) : true))
      : row.kind === mode && (!scope || (mode === 'technique' ? row.category === scopedPersona?.name : scope.startsWith('sub:') ? theories.find(t=>t.tagId===row.id)?.subcategoryId===scope.slice(4) : row.detail === scope)));
  const theoryCategoryOrder = new Map(categories.filter((item) => item.kind === 'theory').sort((a, b) => a.display_order - b.display_order).map((item, index) => [item.id, index]));
  const techniqueCategoryOrder = new Map(categories.filter((item) => item.kind === 'technique').map((item) => [item.id, item.display_order]));
  const theorySubcategoryOrder = new Map(theorySubcategories.map((item) => [item.id, item.displayOrder]));
  const sortSubcategory = new Map(theories.map((item) => [item.tagId, theorySubcategoryOrder.get(item.subcategoryId ?? '')]));
  const personaOrder = new Map(personas.slice().sort((a, b) => orderNumber(a.display_order) - orderNumber(b.display_order)).map((item, index) => [item.name, index]));
  const rows = visibleRows.sort((a, b) => (
    mode === 'theory' ? orderNumber(theoryCategoryOrder.get(a.detail)) - orderNumber(theoryCategoryOrder.get(b.detail))
      || orderNumber(sortSubcategory.get(a.id)) - orderNumber(sortSubcategory.get(b.id))
      : stage ? orderNumber(techniqueCategoryOrder.get(a.detail)) - orderNumber(techniqueCategoryOrder.get(b.detail))
        || orderNumber(personaOrder.get(a.category)) - orderNumber(personaOrder.get(b.category)) : 0
  ) || orderNumber(a.order) - orderNumber(b.order) || a.title.localeCompare(b.title, 'ja'));
  const selectedTitle = draft ? selection?.kind === 'persona' ? (draft as OwnerPersona).name
    : selection?.kind === 'technique' ? (draft as TechniqueContent).title
      : selection?.kind === 'theory' ? (draft as OwnerTheory).title : (draft as ContentCategory).title : '';
  const selectedRow = selection && selection.kind !== 'category' ? allRows.find((row) => row.kind === selection.kind && row.id === selection.id) : undefined;
  const scopeLabel = stage ? stage[1] : !scope ? '' : mode === 'theory' ? scope.startsWith('sub:') ? theorySubcategories.find(s=>s.id===scope.slice(4))?.title ?? '' : categoryTitle('theory',scope,categories)
    : scope.startsWith('category:') ? categoryTitle('technique',scope.slice(9),categories)
      : techniquePersonaList ? '人物像'
        : scopedPersona ? `${categoryTitle('technique',scopedPersona.category,categories)}　›　${scopedPersona.name}` : '処世術';
  const selectedPath = !selection || !draft ? '' : selection.kind === 'category' ? `カテゴリ　›　${(draft as ContentCategory).title}`
    : selection.kind === 'persona' ? `人物像　›　${categoryTitle('technique',(draft as OwnerPersona).category,categories)}　›　${selectedTitle || '新規'}`
      : selection.kind === 'technique' ? `処世術　›　${categoryTitle('technique',(draft as TechniqueContent).category,categories)}　›　${(draft as TechniqueContent).persona_id}　›　${selectedTitle || '新規'}`
        : `理論　›　${categoryTitle('theory',(draft as OwnerTheory).categoryId,categories)}　›　${selectedTitle || '新規'}`;
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
    let persisted = false;
    try {
      if (selection.kind === 'category') await saveContentCategory(draft as ContentCategory);
      if (selection.kind === 'persona') {
        const item = draft as OwnerPersona;
        await savePersona({ ...item, status: publish ? 'published' : 'draft' }, relatedIds);
      }
      if (selection.kind === 'technique') {
        const item = draft as TechniqueContent;
        const snapshot = snapshotFromTechnique(item);
        if (publish) await saveAndPublishTechnique(item.id, snapshot, techniques.find((t) => t.id === item.id)?.updated_at ?? null);
        else await saveTechniqueDraft(item.id, snapshot, techniques.find((t) => t.id === item.id)?.updated_at ?? null);
      }
      if (selection.kind === 'theory') {
        const item = draft as OwnerTheory;
        if (publish) await publishTheory({ ...item, relatedTechniqueIds: relatedIds });
        else await saveTheoryDraft({ ...item, draftTechniqueIds: relatedIds });
      }
      persisted = true;
      const listLoaded = await reload(); const reflected = await refreshPublishedContent();
      setDirty(false); setNotice(!listLoaded || !reflected ? '変更を保存しました。画面の再読込は確認できませんでした。' : publish ? '変更を保存し、アプリへ反映しました。' : '下書きを保存しました。');
      if (selection.kind !== 'category') {
        const item = selection.kind === 'persona' ? await fetchOwnerPersonas().then((p) => p.find((x) => x.id === selection.id))
          : selection.kind === 'technique' ? await fetchOwnerTechniques().then((t) => t.find((x) => x.id === selection.id))
            : await fetchOwnerTheories().then((t) => t.find((x) => x.tagId === selection.id));
        if (item) setDraft(item);
      }
    } catch (cause) {
      if (persisted) { setDirty(false); setNotice('変更を保存しました。再読込に失敗したため、画面を更新して確認してください。'); }
      else setError(cmsErrorMessage(cause));
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
        setDraft(item); setSelection({ kind: 'persona', id }); setRelatedIds([]); setDirty(true); setEditorTab('basic');
      } else if (mode === 'technique') {
        if (scopedPersona?.status !== 'published') throw new Error('先に公開中の人物像を選択してください。');
        const item = await createTechnique(scopedPersona.name);
        await reload(); setDraft(item); setSelection({ kind: 'technique', id: item.id }); setRelatedIds([]); setDirty(false); setEditorTab('basic');
      } else {
        const subcategory = scope.startsWith('sub:') ? theorySubcategories.find(s=>s.id===scope.slice(4)) : undefined;
        const category = categories.find((c) => c.kind === 'theory' && c.id === (subcategory?.categoryId ?? scope)) ?? categories.find((c) => c.kind === 'theory');
        if (!category) throw new Error('理論カテゴリがありません。');
        const item = await createTheoryDraft(category);
        if (subcategory) Object.assign(item,{subcategoryId:subcategory.id,subcategoryTitle:subcategory.title,sortOrder:theories.filter(t=>t.subcategoryId===subcategory.id).length+1});
        await reload(); setDraft({ ...item, relations: item.relations ?? [] }); setSelection({ kind: 'theory', id: item.tagId }); setRelatedIds([]); setDirty(Boolean(subcategory)); setEditorTab('basic');
      }
    } catch (cause) { setError(cmsErrorMessage(cause)); }
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
    } catch (cause) { setError(cmsErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const canReorder = (row: typeof allRows[number]) => !words.length && !stage && (techniquePersonaList
    ? scope.startsWith('category:') && row.kind === 'persona' && row.status !== 'archived'
    : row.kind === mode && row.status !== 'archived' && (mode === 'technique' ? Boolean(scopedPersona) : scope.startsWith('sub:')));
  const peers = (row: typeof allRows[number]) => rows.filter((item) =>
    canReorder(item) && (row.kind === 'persona' || item.status === row.status));
  const move = async (row: typeof allRows[number], targetId: string, placement?: 'before' | 'after') => {
    if (busy || row.id === targetId || !canReorder(row)) return;
    const ordered = peers(row).map((item) => item.id);
    const source = ordered.indexOf(row.id);
    const target = ordered.indexOf(targetId);
    if (source < 0 || target < 0) return;
    const after = placement ? placement === 'after' : source < target;
    ordered.splice(source, 1);
    ordered.splice(ordered.indexOf(targetId) + Number(after), 0, row.id);
    setBusy(true);
    try {
      if (mode === 'theory') await reorderSubcategoryTheories(scope.slice(4), ordered, row.status === 'draft' ? 'draft' : 'published');
      else if (techniquePersonaList) await reorderContent('persona', scope.slice(9), ordered);
      else if (scopedPersona && row.status === 'draft') await reorderTechniqueDrafts(scopedPersona.name, ordered);
      else if (scopedPersona) await reorderContent('technique', scopedPersona.name, ordered);
      await reload();
      await refreshPublishedContent();
      setNotice('移動を保存しました。');
    } catch (cause) { setError(cmsErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const addCategory = () => {
    if (dirty || busy) return;
    const categoryKind = 'technique';
    const id = `custom-${Date.now()}`;
    const item: ContentCategory = { kind: categoryKind, id, title: '', display_order: categories.filter((category) => category.kind === categoryKind).length + 1, updated_at: '' };
    setDraft(item); setSelection({ kind: 'category', id: `${categoryKind}:${id}` }); setDirty(true); setDeleting(false); setCreationMenu(false); setTreeMenu(null); setEditorTab('basic');
  };
  const addPersona = () => {
    if (dirty || busy) return;
    const category = categories.find((item) => item.kind === 'technique')?.id;
    if (!category) { setError('先に処世術カテゴリを作成してください。'); return; }
    const id = `persona-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const item: OwnerPersona = { id, name: '', subtitle: '', category, image_path: null, access_tier: 'complete', draft_technique_ids: [], display_order: null, updated_at: '', status: 'draft' };
    setDraft(item); setSelection({ kind: 'persona', id }); setRelatedIds([]); setDirty(true); setDeleting(false); setCreationMenu(false); setTreeMenu(null); setEditorTab('basic');
  };
  const duplicate = async (row: typeof allRows[number]) => {
    if (busy || dirty) { if (dirty) setError('複製する前に、編集中の変更を保存してください。'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      if (row.kind === 'technique') {
        const source = techniques.find((item) => item.id === row.id);
        if (!source) throw new Error('処世術が見つかりません。');
        const created = await createTechnique(source.persona_id);
        const snapshot = normalizeSnapshot({ ...snapshotFromTechnique(source), title: `${source.title}（コピー）` });
        await saveTechniqueDraft(created.id, snapshot, created.updated_at || null);
        await reload();
        const clone = await fetchOwnerTechniques().then((items) => items.find((item) => item.id === created.id));
        if (clone) { setSelection({ kind: 'technique', id: clone.id }); setDraft(clone); setRelatedIds([]); setDirty(false); }
      } else if (row.kind === 'theory') {
        const source = theories.find((item) => item.tagId === row.id);
        const category = categories.find((item) => item.kind === 'theory' && item.id === source?.categoryId);
        if (!source || !category) throw new Error('複製する理論のカテゴリが見つかりません。');
        const created = await createTheoryDraft(category);
        const clone = { ...source, tagId: created.tagId, title: `${source.title}（コピー）`, displayId: null, draftDisplayId: created.draftDisplayId, displayOrder: created.draftDisplayId ?? 1, status: undefined, draftTechniqueIds: [] };
        await saveTheoryDraft(clone);
        await reload();
        const saved = await fetchOwnerTheories().then((items) => items.find((item) => item.tagId === created.tagId));
        if (saved) { setSelection({ kind: 'theory', id: saved.tagId }); setDraft(saved); setRelatedIds([]); setDirty(false); }
      } else {
        throw new Error('人物像は一覧メニューから複製できません。');
      }
      setEditorTab('basic'); setNotice('複製を下書きとして作成しました。'); await refreshPublishedContent();
    } catch (cause) { setError(cmsErrorMessage(cause)); }
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
    } catch (cause) { setError(cmsErrorMessage(cause)); }
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
    catch (cause) { setError(cmsErrorMessage(cause)); }
    finally { setBusy(false); }
  };
  const dropCategory = async (section: 'technique' | 'theory', targetId: string) => {
    const source = draggedCategory.current;
    draggedCategory.current = null;
    if (!source || source.section !== section || source.id === targetId || busy) return;
    const ids = categories.filter((c) => c.kind === section).sort((a,b) => a.display_order-b.display_order).map((c) => c.id);
    const from = ids.indexOf(source.id); const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from,1); ids.splice(ids.indexOf(targetId) + Number(from < to),0,source.id);
    setBusy(true);
    try { await reorderContent(`${section}-category`, '', ids); await reload(); await refreshPublishedContent(); setNotice('カテゴリの並び順を保存しました。'); }
    catch (cause) { setError(cmsErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const inEditor = Boolean(selection && editing);
  const inTheoryCategory = mode === 'theory' && Boolean(scope) && !scope.startsWith('sub:');
  const inTree = !inEditor && !query && (!scope || (inTheoryCategory && !showTheoryList));
  const parentScope = scopedPersona ? `category:${scopedPersona.category}`
    : scope.startsWith('sub:') ? theorySubcategories.find(item => item.id === scope.slice(4))?.categoryId ?? '' : '';
  const back = () => {
    if (busy) return;
    if (inEditor) setEditing(false);
    else if (query) setQuery('');
    else if (inTheoryCategory && showTheoryList) navigateTree(scope);
    else if (scope) navigateTree(parentScope);
    else if (dirty) setPendingPreview(APP_ROUTES.ownerContent);
    else closeCatalog();
  };
  const headerBack = useContext(HeaderBackAction);
  useFocusEffect(useCallback(() => {
    if (!headerBack) return;
    headerBack.current = back;
    return () => { if (headerBack.current === back) headerBack.current = null; };
  }, [back, headerBack]));
  const canAddContent = !stage && (mode === 'theory'
    ? categories.some((category) => category.kind === 'theory')
    : techniquePersonaList || scopedPersona?.status === 'published');
  const pageKey = inEditor ? 'edit:' + selection?.kind + ':' + selection?.id : JSON.stringify([scope, showTheoryList]);
  const scrollOffsets = useRef(new Map<string, number>());
  const page = useRef<FlatList<typeof rows[number]>>(null);
  const restoredPage = useRef('');
  const restorePosition = () => {
    if (restoredPage.current === pageKey || !page.current) return;
    restoredPage.current = pageKey;
    page.current.scrollToOffset({ offset: scrollOffsets.current.get(pageKey) ?? 0, animated: false });
  };

  const renderRow = ({ item: row }: { item: typeof rows[number] }) => {
    const reorderable = canReorder(row);
    const active = selection?.kind === row.kind && selection.id === row.id;
    const menuKey = `${row.kind}:${row.id}`;
    const siblings = rowMenu === menuKey && reorderable ? peers(row) : [];
    const index = siblings.findIndex((item) => item.id === row.id);
    const previous = siblings[index - 1];
    const next = index >= 0 ? siblings[index + 1] : undefined;
    return <View style={styles.listRow}>
      <View style={[styles.row, active && styles.rowActive]} {...(Platform.OS === 'web' ? { draggable: Boolean(reorderable), onDragStart: () => { draggedId.current = row.id; }, onDragEnd: () => { draggedId.current = null; }, onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(), onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); const source = rows.find((item) => item.id === draggedId.current && item.kind === row.kind); if (source && reorderable) void move(source,row.id); draggedId.current = null; } } as any : {})}>
        {reorderable && Platform.OS === 'web' ? <AppText aria-hidden style={styles.handle}>⠿</AppText> : null}
        {row.image ? <Image source={row.kind === 'persona' ? getPersonaPresentation(row.title)?.image : { uri: contentImageUrl(row.image) ?? '' }} style={styles.thumb} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={row.title} accessibilityState={{ selected: active }} onPress={() => row.kind === 'persona' && row.title && !query ? navigateTree('persona:' + row.id) : choose({ kind: row.kind, id: row.id })} style={styles.rowCopy}>
          <AppText numberOfLines={1} style={styles.rowTitle}>{row.title}</AppText>
          {row.subtitle ? <AppText numberOfLines={1} style={styles.rowSummary}>{row.subtitle}</AppText> : null}
          <AppText numberOfLines={1} style={styles.muted}>{row.kind === 'technique' ? `${categoryTitle('technique',row.detail,categories)}　›　${row.category}` : row.category}{row.kind === 'technique' ? `　·　重要度 ${'★'.repeat(Number(row.reference))}` : `　·　関連 ${row.reference}件`}</AppText>
        </Pressable>
        <StatusBadge status={row.status} />
        <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}の操作`} onPress={() => setRowMenu(rowMenu === menuKey ? null : menuKey)} style={styles.menuButton}><AppText style={styles.menuDots}>⋮</AppText></Pressable>
      </View>
      {rowMenu === menuKey ? <ActionMenu actions={[
        { label: '編集', onPress: () => { choose({ kind: row.kind, id: row.id }); setRowMenu(null); } },
        ...(previous ? [{ label: '上へ移動', onPress: () => { setRowMenu(null); void move(row, previous.id, 'before'); } }] : []),
        ...(next ? [{ label: '下へ移動', onPress: () => { setRowMenu(null); void move(row, next.id, 'after'); } }] : []),
        ...(row.kind === 'technique' || row.kind === 'theory' ? [{ label: '複製して下書き作成', onPress: () => { setRowMenu(null); void duplicate(row); } }] : []),
        { label: row.status === 'published' ? '下書きに戻す' : '公開する', onPress: () => { setRowMenu(null); void togglePublication(row); } },
        { label: '削除', danger: true, onPress: () => requestDelete(row) },
      ]} /> : null}
    </View>;
  };

  const header = <View style={styles.pageHeader}>
    <View style={styles.navigation}>
      <CmsButton disabled={busy} onPress={back}>{inEditor ? '‹ 一覧へ戻る' : '‹ 戻る'}</CmsButton>
      <AppText style={styles.breadcrumb} numberOfLines={1}>{inEditor ? selectedTitle || '新規コンテンツ' : scopeLabel || (mode === 'theory' ? '理論' : '処世術')}</AppText>
      {selection && !inEditor ? <CmsButton onPress={() => setEditing(true)}>編集に戻る</CmsButton> : null}
    </View>
    {error && !inEditor ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
    {notice && !inEditor ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    {pending ? <View style={styles.confirm}><AppText>未保存の変更があります。{pendingDelete ? '破棄して削除しますか？' : '破棄して移動しますか？'}</AppText><View style={styles.actions}><CmsButton onPress={() => { setPending(null); setPendingDelete(false); }}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => { chooseNow(pending); if (pendingDelete) setDeleting(true); setPendingDelete(false); }}>{pendingDelete ? '破棄して削除' : '破棄して移動'}</CmsButton></View></View> : null}
    {pendingLocation ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して階層を移動しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingLocation(null)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => openScope(pendingLocation)}>破棄して移動</CmsButton></View></View> : null}
    {pendingCreate ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して新規作成しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingCreate(false)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => void create(true)}>破棄して追加</CmsButton></View></View> : null}
    {pendingPreview ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して移動しますか？</AppText><View style={styles.actions}><CmsButton onPress={() => setPendingPreview(null)}>編集を続ける</CmsButton><CmsButton variant="primary" onPress={() => { const path = pendingPreview; setPendingPreview(null); setDirty(false); if (path === APP_ROUTES.ownerContent) closeCatalog(); else router.push(path); }}>破棄して確認</CmsButton></View></View> : null}
    {!inEditor ? <View style={styles.listControls}>
      <TextInput accessibilityLabel="タイトル・本文で検索" value={query} onChangeText={setQuery} placeholder="タイトル・本文で検索" style={[styles.search, { flex: 1 }]} />
      {scopedPersona ? <CmsButton disabled={busy} onPress={() => choose({ kind: 'persona', id: scopedPersona.id })}>人物像を編集</CmsButton> : null}
    </View> : null}
    {inTree ? <View style={styles.tree}>
        <View style={styles.paneTitleRow}>
          <AppText style={styles.paneTitle}>{inTheoryCategory ? '内部分類' : 'カテゴリ'}</AppText>
          {mode === 'technique' ? <View>
            <CmsButton compact disabled={dirty || busy} onPress={() => setCreationMenu((value) => !value)}>＋ 追加</CmsButton>
            {creationMenu ? <ActionMenu actions={[
              { label: 'カテゴリを追加', onPress: addCategory },
              { label: '人物像を追加', onPress: addPersona },
            ]} /> : null}
          </View> : !inTheoryCategory ? <CmsButton disabled={busy || !canAddContent} onPress={() => void create()}>＋ 理論を追加</CmsButton> : null}
        </View>
        {fetching ? <AppText style={styles.muted}>読み込み中…</AppText> : null}
        {mode === 'technique' ? categories.filter((category) => category.kind === 'technique').sort((a,b) => a.display_order-b.display_order).map((category) => {
          const categoryScope = `category:${category.id}`;
          const childPersonas = personas.filter((persona) => persona.category === category.id && persona.status !== 'archived').sort((a,b) => (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER));
          const categoryMenuKey = `category:${category.id}`;
          return <View key={category.id}>
            <TreeRow label={category.title} count={String(childPersonas.length)} onPress={() => navigateTree(categoryScope)} onMenu={() => setTreeMenu(treeMenu === categoryMenuKey ? null : categoryMenuKey)} onDragStart={() => { draggedCategory.current = { section: 'technique', id: category.id }; }} onDrop={() => void dropCategory('technique',category.id)} />
            {treeMenu === categoryMenuKey ? <ActionMenu actions={[
              { label: '編集', onPress: () => { choose({ kind: 'category', id: `technique:${category.id}` }); setTreeMenu(null); } },
              { label: '上へ並び替え', onPress: () => { void moveCategory('technique',category.id,-1); setTreeMenu(null); } },
              { label: '下へ並び替え', onPress: () => { void moveCategory('technique',category.id,1); setTreeMenu(null); } },
              { label: '削除', danger: true, onPress: () => requestCategoryDelete(category) },
            ]} /> : null}
          </View>;
        }) : inTheoryCategory ? <>
          <TreeRow label="カテゴリ内のすべての理論" count={String(theories.filter(item => item.categoryId === scope).length)} onPress={() => navigateTree(scope, true)} />
          {theorySubcategories.filter(item => item.categoryId === scope).map(item =>
            <TreeRow key={item.id} label={item.title} count={String(theories.filter(theory => theory.subcategoryId === item.id && theory.status !== 'archived').length)} onPress={() => navigateTree('sub:' + item.id)} />
          )}
          <TheorySubcategoryManager categoryId={scope} onSaved={async () => { await reload(); await refreshPublishedContent(); }} />
        </> : categories.filter((category) => category.kind === 'theory').sort((a,b) => a.display_order-b.display_order).map((category) => {
          const categoryMenuKey = `category:${category.id}`;
          const count = theories.filter((item) => item.categoryId === category.id && item.status !== 'archived').length;
          return <View key={category.id}>
            <TreeRow label={category.title} count={String(count)} onPress={() => navigateTree(category.id)} onMenu={() => setTreeMenu(treeMenu === categoryMenuKey ? null : categoryMenuKey)} onDragStart={() => { draggedCategory.current = { section: 'theory', id: category.id }; }} onDrop={() => void dropCategory('theory',category.id)} />
            {treeMenu === categoryMenuKey ? <ActionMenu actions={[
              { label: '編集', onPress: () => { choose({ kind: 'category', id: `theory:${category.id}` }); setTreeMenu(null); } },
              { label: '上へ並び替え', onPress: () => { void moveCategory('theory',category.id,-1); setTreeMenu(null); } },
              { label: '下へ並び替え', onPress: () => { void moveCategory('theory',category.id,1); setTreeMenu(null); } },
            ]} /> : null}
          </View>;
        })}
      </View> : null}
    {inTree && mode === 'technique' ? <Section title="編集段階">
      <View style={styles.stageGrid}>
        {techniqueEditorialStages.map(([id, title]) => <Pressable key={id} accessibilityRole="button"
          accessibilityLabel={title + 'の一覧'} disabled={busy} onPress={() => navigateTree('stage:' + id)} style={styles.stageCard}>
          <AppText style={styles.rowTitle}>{title}</AppText>
          <AppText style={styles.count}>{fetching ? '読込中…' : (stageCounts.get(id) ?? 0) + '件'}</AppText>
        </Pressable>)}
      </View>
    </Section> : null}
      {!inEditor && !inTree ? <View style={styles.listTop}>
        <View style={styles.listHeading}><AppText style={styles.breadcrumb}>{query ? '検索結果' : scopeLabel}</AppText><AppText style={styles.count}>{fetching ? '読込中…' : rows.length + '件'}</AppText></View>
        {canAddContent ? <View style={styles.listControls}>
          <CmsButton variant="primary" disabled={busy} onPress={() => void create()}>{mode === 'theory' ? '＋ 理論を追加' : techniquePersonaList ? '＋ 人物像を追加' : '＋ 処世術を追加'}</CmsButton>
        </View> : null}
      </View> : null}
      {inEditor ? <View style={styles.editor}>
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
          <View style={styles.editorTabs}>{([['basic','基本情報'],['body','本文'],['memo', selection.kind === 'persona' ? '所属する処世術' : '補足メモ'],['publish','公開設定']] as Array<[EditorTab,string]>).filter(([tab]) => selection.kind === 'category' ? tab === 'basic' : selection.kind !== 'persona' || tab !== 'body').map(([tab,label]) => <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: editorTab === tab }} onPress={() => setEditorTab(tab)} style={[styles.editorTab,editorTab === tab && styles.editorTabActive]}><AppText style={[styles.editorTabText,editorTab === tab && styles.editorTabTextActive]}>{label}</AppText></Pressable>)}</View>
          {selection.kind === 'category' && editorTab === 'basic' ? <Section title="カテゴリ"><Field label="カテゴリ名" value={(draft as ContentCategory).title} onChange={(title) => patch({ title })} /></Section> : null}
          {selection.kind === 'persona' && editorTab === 'basic' ? <Section title="基本情報"><Field label="人物像名" value={(draft as OwnerPersona).name} onChange={(name) => patch({ name })} /><Field label="副題" value={(draft as OwnerPersona).subtitle} onChange={(subtitle) => patch({ subtitle })} /><CmsWheel label="カテゴリ" value={(draft as OwnerPersona).category} options={categories.filter((c) => c.kind === 'technique').sort((a,b) => a.display_order-b.display_order).map((c) => [c.id,c.title])} onChange={(category) => patch({ category })} /></Section> : null}
          {selection.kind === 'persona' && editorTab === 'memo' ? <Section title="所属する処世術"><MultiPicker options={techniques.filter((item) => item.status !== 'archived').map((item) => ({ id: item.id, title: item.title || '無題の処世術' }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><AppText style={styles.muted}>所属する処世術は、移動先を指定してからこの人物像から外してください。</AppText></Section> : null}
          {selection.kind === 'persona' && editorTab === 'publish' ? <><Section title="公開設定"><Choice label="公開範囲" value={(draft as OwnerPersona).access_tier} options={[["free","無料版"],["complete","完全版"]]} onChange={(access_tier) => patch({ access_tier })} /><CmsButton onPress={() => { const path=personaRoute((draft as OwnerPersona).category,(draft as OwnerPersona).name); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section></> : null}
          {selection.kind === 'technique' && editorTab === 'basic' ? <Section title="基本情報"><Field label="タイトル" value={(draft as TechniqueContent).title} onChange={(title) => patch({ title })} /><Field label="本質" value={(draft as TechniqueContent).essence} onChange={(essence) => patch({ essence })} multi />
          <CmsWheel label="編集段階" value={(draft as TechniqueContent).editorial_stage} options={techniqueEditorialStages} onChange={(editorial_stage) => patch({ editorial_stage })} />
          <CmsWheel label="カテゴリ" value={(draft as TechniqueContent).category} options={categories.filter((c) => c.kind === 'technique').map((c) => [c.id,c.title])} onChange={(category) => patch({ category, persona_id: '' })} />
          <CmsWheel label="人物像" value={(draft as TechniqueContent).persona_id} options={personas.filter((p) => p.category === (draft as TechniqueContent).category && p.status === 'published').map((p) => [p.name,p.name])} onChange={(persona_id) => patch({ persona_id })} /><ListField label="タグ" items={(draft as TechniqueContent).tags ?? getTechniqueTags({ id: (draft as TechniqueContent).id, title: (draft as TechniqueContent).title, subtitle: (draft as TechniqueContent).essence, explanation: (draft as TechniqueContent).explanation, categoryName: categoryTitle('technique',(draft as TechniqueContent).category,categories), subcategory: (draft as TechniqueContent).persona_id, articleTitle: (draft as TechniqueContent).persona_id })} onChange={(tags) => patch({ tags })} />{(draft as TechniqueContent).tags === null ? <AppText style={styles.muted}>現在のタグは自動生成です。編集するとタグを明示保存します。</AppText> : null}</Section> : null}
          {selection.kind === 'technique' && editorTab === 'body' ? <Section title="本文"><Field label="解説" value={(draft as TechniqueContent).explanation} onChange={(explanation) => patch({ explanation })} multi /><ListField label="今日からできる実践" items={(draft as TechniqueContent).practices} onChange={(practices) => patch({ practices })} /><ListField label="注意点" items={(draft as TechniqueContent).cautions} onChange={(cautions) => patch({ cautions })} /></Section> : null}
          {selection.kind === 'technique' && editorTab === 'memo' ? <Section title="補足メモ"><Field label="メモ" value={(draft as TechniqueContent).memo} onChange={(memo) => patch({ memo })} multi /></Section> : null}
          {selection.kind === 'technique' && editorTab === 'publish' ? <><Section title="公開設定"><Choice label="重要度" value={String((draft as TechniqueContent).importance)} options={[["1","★"],["2","★★"],["3","★★★"]]} onChange={(importance) => patch({ importance: Number(importance) })} /><CmsButton onPress={() => { const path=techniqueRoute(selection.id); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section><Section title="関連付け"><AppText variant="label">主要理論</AppText><MultiPicker options={theories.filter((item) => item.status === 'published').map((item) => ({ id: item.tagId, title: item.title }))} ids={(draft as TechniqueContent).primary_theory_ids} onChange={(ids) => patch({ primary_theory_ids: ids, theory_ids: [...new Set([...ids,...(draft as TechniqueContent).theory_ids])] })} /><AppText variant="label">あわせて読む理論</AppText><MultiPicker options={theories.filter((item) => item.status === 'published').map((item) => ({ id: item.tagId, title: item.title }))} ids={(draft as TechniqueContent).theory_ids.filter((id) => !(draft as TechniqueContent).primary_theory_ids.includes(id))} onChange={(ids) => patch({ theory_ids: [...(draft as TechniqueContent).primary_theory_ids,...ids] })} /></Section></> : null}
          {selection.kind === 'theory' && editorTab === 'basic' ? <Section title="基本情報"><Field label="理論名" editable={!(draft as OwnerTheory).quotation} value={(draft as OwnerTheory).title} onChange={(title) => patch({ title })} /><CmsWheel label="カテゴリ" value={(draft as OwnerTheory).categoryId} options={categories.filter((c) => c.kind === 'theory').sort((a,b) => a.display_order-b.display_order).map((c) => [c.id,c.title])} onChange={(categoryId) => patch({ categoryId, categoryTitle: categoryTitle('theory',categoryId,categories), subcategoryId: undefined, subcategoryTitle: undefined, sortOrder: undefined })} /><TheorySubcategoryFields value={draft as OwnerTheory} onChange={patch} /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'body' ? <Section title="本文"><AppText style={styles.muted}>{(draft as OwnerTheory).quotation ? '原典の言葉は保ち、背景や日常での受け取り方を短く説明します。' : '一文目は「〜こと」「〜という考え方・理論」などの簡潔な定義に。必要な分類・手順・短い場面例は、改行して続けてください。'}</AppText><Field label={(draft as OwnerTheory).quotation ? '格言の短い背景説明' : '概要・本文'} value={(draft as OwnerTheory).quotation?.contextNote ?? (draft as OwnerTheory).summary} onChange={(summary) => patch({ summary, ...((draft as OwnerTheory).quotation ? {quotation:{...(draft as OwnerTheory).quotation!,contextNote:summary}} : {}) })} multi /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'memo' ? <Section title="補足メモ・別名"><Field label="別名（1行に1件）" value={((draft as OwnerTheory).aliases ?? []).join('\n')} onChange={(value) => patch({ aliases: value.split('\n').map((item) => item.trim()).filter(Boolean) })} multi /><TheoryDetailsEditor value={draft as OwnerTheory} options={theories.filter((item) => item.status === 'published')} disabled={busy} onChange={patch} /><OwnerQuotationReviews /></Section> : null}
          {selection.kind === 'theory' && editorTab === 'publish' ? <><Section title="公開設定"><Choice label="公開範囲" value={(draft as OwnerTheory).accessTier ?? 'complete'} options={[["free","無料版"],["complete","完全版"]]} onChange={(accessTier) => patch({ accessTier })} /><AppText variant="label">関連する処世術</AppText><MultiPicker options={techniques.filter((item) => item.status !== 'archived').map((item) => ({ id: item.id, title: item.title || '無題の処世術' }))} ids={relatedIds} onChange={(ids) => { setRelatedIds(ids); setDirty(true); }} /><CmsButton onPress={() => { const path=theoryRoute(selection.id); if (dirty) setPendingPreview(path); else router.push(path); }}>アプリで確認 ↗</CmsButton></Section></> : null}
          {selection.kind !== 'category' ? <View style={styles.saveBar}><View style={styles.danger}><AppText style={styles.dangerTitle}>削除</AppText>{relatedLabels.length ? <AppText style={styles.muted}>関連・所属 {relatedLabels.length}件。削除はこの項目をアプリの公開一覧から外します。</AppText> : null}{deleting ? <View style={styles.confirm}><AppText>「{selectedTitle}」をアーカイブしますか？</AppText>{relatedLabels.slice(0,8).map((label,index) => <AppText key={`${index}:${label}`} style={styles.muted}>・{label}</AppText>)}{relatedLabels.length > 8 ? <AppText style={styles.muted}>ほか {relatedLabels.length-8}件</AppText> : null}{hasBlockingLinks ? <AppText style={styles.error}>参照先を移動・解除してから削除できます。</AppText> : null}<View style={styles.actions}><CmsButton onPress={() => setDeleting(false)}>キャンセル</CmsButton><CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => void remove()}>削除を確定</CmsButton></View></View> : <CmsButton variant="danger" disabled={busy || (selection.kind === 'persona' && relatedLabels.length > 0)} onPress={() => setDeleting(true)}>削除</CmsButton>}</View></View> : <View style={styles.saveBar}>{(draft as ContentCategory).kind !== 'theory' ? <View style={styles.danger}><AppText style={styles.dangerTitle}>カテゴリの削除</AppText>{relatedLabels.length ? <AppText style={styles.muted}>所属するコンテンツ {relatedLabels.length}件。削除前に別カテゴリへ移動してください。</AppText> : null}{deleting ? <View style={styles.confirm}><AppText>「{selectedTitle}」を削除しますか？</AppText>{hasBlockingLinks ? <AppText style={styles.error}>子項目が残っているため削除できません。</AppText> : null}<View style={styles.actions}><CmsButton onPress={() => setDeleting(false)}>キャンセル</CmsButton><CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => void remove()}>削除を確定</CmsButton></View></View> : <CmsButton variant="danger" disabled={busy || hasBlockingLinks} onPress={() => setDeleting(true)}>削除</CmsButton>}</View>: <AppText style={styles.muted}>既存の6大分類を維持します。</AppText>}</View>}
        </> : <EmptyState title="コンテンツを選択" description="一覧から編集する項目を選択してください。" />}
        {selection && draft ? <View testID="owner-editor-actions" style={styles.editorFooter}>
          {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
          {notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
          <View style={styles.saveActions}>{selection.kind !== 'category' ? <CmsButton disabled={busy} onPress={() => void save(false)}>下書き保存</CmsButton> : null}<CmsButton variant="primary" disabled={busy} onPress={() => void save(true)}>{busy ? '保存中…' : selection.kind === 'category' ? '保存' : '公開する'}</CmsButton></View>
        </View> : null}
      </View> : null}
    </View>;

  return <Screen scroll={false} style={styles.canvas}>
    <FlatList key={pageKey} ref={page} testID="owner-cms-page" data={inEditor || inTree ? [] : rows}
      keyExtractor={(row) => row.kind + ':' + row.id} renderItem={renderRow} ListHeaderComponent={header}
      ListEmptyComponent={!inEditor && !inTree && !fetching ? <AppText style={styles.muted}>一致するコンテンツはありません。</AppText> : null}
      contentContainerStyle={styles.screen} initialNumToRender={20} windowSize={7}
      keyboardShouldPersistTaps="handled" renderScrollComponent={(props) => <PageScroll {...props} />}
      onContentSizeChange={restorePosition}
      onScroll={(event) => {
        if (restoredPage.current === pageKey) scrollOffsets.current.set(pageKey, event.nativeEvent.contentOffset.y);
      }}
    />
  </Screen>;
}

function categoryTitle(kind: ContentCategory['kind'], id: string, categories: ContentCategory[]) { return categories.find((c) => c.kind === kind && c.id === id)?.title ?? id; }
function CmsButton({ children, onPress, disabled, variant = 'secondary', compact }: { children: React.ReactNode; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; compact?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button,compact && styles.buttonCompact,variant === 'primary' && styles.buttonPrimary,variant === 'danger' && styles.buttonDanger,disabled && styles.buttonDisabled]}><AppText style={[styles.buttonText,variant === 'primary' && styles.buttonTextPrimary,variant === 'danger' && styles.buttonTextDanger]}>{children}</AppText></Pressable>; }
function StatusBadge({ status }: { status: string }) { return <AppText style={[styles.badge,status === 'draft' && styles.badgeDraft,status === 'archived' && styles.badgeArchived]}>{statusLabel(status)}</AppText>; }
type MenuAction = { label: string; onPress: () => void; danger?: boolean };
function ActionMenu({ actions }: { actions: MenuAction[] }) { return <View style={styles.menu}>{actions.map((action) => <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress} style={[styles.menuItem,action.danger && styles.menuItemDanger]}><AppText style={action.danger ? styles.menuTextDanger : styles.menuText}>{action.label}</AppText></Pressable>)}</View>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><AppText style={styles.sectionTitle}>{title}</AppText>{children}</View>; }
function TreeRow({ label, count, onPress, onMenu, onDragStart, onDrop }: {
  label: string;
  count: string;
  onPress: () => void;
  onMenu?: () => void;
  onDragStart?: () => void;
  onDrop?: () => void;
}) {
  const drag = Platform.OS === 'web' && onDragStart ? {
    draggable: true,
    onDragStart,
    onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(),
    onDrop: (event: { preventDefault: () => void }) => { event.preventDefault(); onDrop?.(); },
  } : {};
  return <View style={styles.treeRow} {...drag}>
    {onDragStart ? <AppText style={styles.handle}>⠿</AppText> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.treeLink}>
      <AppText numberOfLines={1} style={styles.treeText}>{label}</AppText>
      <AppText style={styles.treeCount}>{count}</AppText>
      <AppText aria-hidden style={styles.treeChevron}>›</AppText>
    </Pressable>
    {onMenu ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}の操作`} onPress={onMenu} style={styles.menuButton}><AppText style={styles.menuDots}>⋮</AppText></Pressable> : null}
  </View>;
}
function Field({ label, value, onChange, multi, editable = true }: { label: string; value: string; onChange: (value: string) => void; multi?: boolean; editable?: boolean }) { return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} multiline={multi} editable={editable} style={[styles.input, multi && styles.multi]} /></View>; }
function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <View style={styles.field}>{label ? <AppText variant="label">{label}</AppText> : null}<View style={styles.actions}>{options.map(([id,title]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: value === id }} onPress={() => onChange(id)} style={[styles.choice,value === id && styles.choiceActive]}><AppText style={styles.buttonText}>{title}</AppText></Pressable>)}</View></View>; }
function MultiPicker({ options, ids, onChange }: { options: Array<{ id: string; title: string }>; ids: string[]; onChange: (ids: string[]) => void }) { const [search,setSearch] = useState(''); return <View style={styles.field}><View style={styles.chips}>{ids.map((id) => <Pressable key={id} accessibilityRole="button" onPress={() => onChange(ids.filter((item) => item !== id))} style={styles.chip}><AppText numberOfLines={1}>{options.find((o) => o.id === id)?.title ?? id}　×</AppText></Pressable>)}</View><TextInput accessibilityLabel="関連コンテンツを検索" value={search} onChangeText={setSearch} placeholder="名前・IDで検索して追加" style={styles.input} /><View>{options.filter((item) => !ids.includes(item.id) && [item.title,item.id].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase())).slice(0,20).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { onChange([...ids,item.id]); setSearch(''); }} style={styles.option}><AppText numberOfLines={1}>＋ {item.title}</AppText></Pressable>)}</View></View>; }
function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) { return <View style={styles.field}><AppText variant="label">{label}</AppText>{items.map((item,index) => <View key={index} style={styles.actions}><TextInput value={item} onChangeText={(value) => onChange(items.map((x,i) => i === index ? value : x))} multiline style={[styles.input,{ flex: 1 }]} /><CmsButton onPress={() => onChange(items.filter((_,i) => i !== index))}>削除</CmsButton></View>)}<CmsButton onPress={() => onChange([...items,''])}>＋ 追加</CmsButton></View>; }
