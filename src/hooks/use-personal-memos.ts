import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { personalMemoCollection } from '@/data/personal-dashboard';
import { APP_ROUTES } from '@/navigation/app-routes';
import { useAppState, type PersonalMemo } from '@/state/app-state';

export type PersonalMemosOptions = {
  preview?: boolean;
  initialFolder?: string | null;
  composeRequested?: boolean;
  onComposeHandled?: () => void;
};

export type MemoDestination = { kind: 'new' } | { kind: 'unfiled' } | { kind: 'folder'; id: string };
type MemoDraft = { id?: string; text: string; destination: MemoDestination; folderName: string };
type MemoMenuMode = 'actions' | 'move' | 'delete';
type MemoDialog =
  | { kind: 'composer'; draft: MemoDraft }
  | { kind: 'memo-menu'; memo: PersonalMemo; mode: MemoMenuMode }
  | { kind: 'folder-manager' }
  | { kind: 'folder-editor'; id?: string; name: string }
  | { kind: 'folder-delete'; id: string }
  | null;

const PAGE_SIZE = 20;
const normalizeFolder = (id: string | null) => id === 'all' ? null : id;
export const memoDestinationKey = (destination: MemoDestination) => destination.kind === 'folder' ? `folder:${destination.id}` : destination.kind;
const destinationId = (destination: MemoDestination) => destination.kind === 'folder' ? destination.id : null;

export function usePersonalMemos({ preview = false, initialFolder = null, composeRequested = false, onComposeHandled }: PersonalMemosOptions) {
  const router = useRouter();
  const {
    hydrated, personalMemos, personalMemoFolders,
    addPersonalMemo, updatePersonalMemo, removePersonalMemo, movePersonalMemo,
    createPersonalMemoFolder, renamePersonalMemoFolder, deletePersonalMemoFolder,
  } = useAppState();
  const collection = useMemo(() => personalMemoCollection(personalMemos, personalMemoFolders), [personalMemos, personalMemoFolders]);
  const [folder, setFolder] = useState(normalizeFolder(initialFolder));
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [dialog, setDialog] = useState<MemoDialog>(null);
  const composeHandled = useRef(false);

  useEffect(() => setFolder(normalizeFolder(initialFolder)), [initialFolder]);
  useEffect(() => {
    if (!hydrated || !folder || folder === 'all' || folder === 'unfiled') return;
    if (!collection.folderById.has(folder)) setFolder(null);
  }, [hydrated, folder, collection]);

  const openFolder = (id: string | null) => { setFolder(id); setLimit(PAGE_SIZE); };
  const closeDialog = useCallback(() => setDialog(null), []);
  const openComposer = useCallback((memo?: PersonalMemo, requestedFolder = folder) => {
    let destination: MemoDestination = { kind: 'new' };
    if (memo) destination = memo.folderId ? { kind: 'folder', id: memo.folderId } : { kind: 'unfiled' };
    else if (!preview && requestedFolder === 'unfiled') destination = { kind: 'unfiled' };
    else if (!preview && requestedFolder && collection.folderById.has(requestedFolder)) destination = { kind: 'folder', id: requestedFolder };

    const id = destinationId(destination);
    setDialog({ kind: 'composer', draft: {
      id: memo?.id,
      text: memo?.text ?? '',
      destination,
      folderName: id ? collection.folderById.get(id)?.name ?? '' : '',
    } });
  }, [folder, collection, preview]);

  useEffect(() => {
    if (!composeRequested) { composeHandled.current = false; return; }
    if (!hydrated || composeHandled.current) return;
    composeHandled.current = true;
    openComposer(undefined, initialFolder);
    onComposeHandled?.();
  }, [composeRequested, hydrated, initialFolder, openComposer, onComposeHandled]);

  const draft = dialog?.kind === 'composer' ? dialog.draft : null;
  const needsFolderName = Boolean(draft && !draft.id && (
    draft.destination.kind === 'new'
    || (draft.destination.kind === 'folder' && collection.entriesFor(draft.destination.id).length === 0)
  ));
  const canSaveMemo = Boolean(draft?.text.trim() && (!needsFolderName || draft.folderName.trim()));
  const destinations: { label: string; destination: MemoDestination }[] = [];
  if (!draft?.id) destinations.push({ label: '新しいフォルダー＋', destination: { kind: 'new' } });
  if (draft?.id || collection.unfiled.length) destinations.push({ label: '未整理', destination: { kind: 'unfiled' } });
  for (const item of personalMemoFolders) destinations.push({ label: item.name, destination: { kind: 'folder', id: item.id } });

  const updateDraft = (patch: Partial<MemoDraft>) => {
    setDialog(current => current?.kind === 'composer' ? { ...current, draft: { ...current.draft, ...patch } } : current);
  };
  const selectDestination = (destination: MemoDestination) => {
    const id = destinationId(destination);
    updateDraft({ destination, folderName: id ? collection.folderById.get(id)?.name ?? '' : '' });
  };
  const saveMemo = () => {
    if (!draft || !canSaveMemo) return;
    let savedFolder = destinationId(draft.destination);
    if (draft.id) updatePersonalMemo(draft.id, draft.text, savedFolder);
    else if (draft.destination.kind === 'new') savedFolder = addPersonalMemo(draft.text, null, draft.folderName);
    else {
      if (needsFolderName && savedFolder) renamePersonalMemoFolder(savedFolder, draft.folderName);
      addPersonalMemo(draft.text, savedFolder);
    }
    closeDialog();
    if (!preview) openFolder(savedFolder ?? 'unfiled');
  };

  const openMemoMenu = (memo: PersonalMemo, mode: MemoMenuMode = 'actions') => setDialog({ kind: 'memo-menu', memo, mode });
  const moveMemo = (id: string, target: string | null) => { movePersonalMemo(id, target); closeDialog(); };
  const deleteMemo = (id: string) => { removePersonalMemo(id); closeDialog(); };
  const openFolderManager = () => setDialog({ kind: 'folder-manager' });
  const openFolderEditor = (id?: string) => setDialog({ kind: 'folder-editor', id, name: id ? collection.folderById.get(id)?.name ?? '' : '' });
  const updateFolderName = (name: string) => setDialog(current => current?.kind === 'folder-editor' ? { ...current, name } : current);
  const confirmFolderDelete = (id: string) => setDialog({ kind: 'folder-delete', id });
  const saveFolder = () => {
    if (dialog?.kind !== 'folder-editor' || !dialog.name.trim()) return;
    if (dialog.id) renamePersonalMemoFolder(dialog.id, dialog.name);
    else {
      const id = createPersonalMemoFolder(dialog.name);
      if (id && !preview) openFolder(id);
    }
    closeDialog();
  };
  const deleteFolder = (id: string) => {
    deletePersonalMemoFolder(id);
    closeDialog();
    if (folder === id) openFolder('unfiled');
  };
  const openTile = (id: string) => {
    if (preview) router.push({ pathname: APP_ROUTES.myTechniques, params: { folder: id } });
    else openFolder(id);
  };

  return {
    preview, folder, limit, dialog, collection, personalMemoFolders,
    visible: collection.entriesFor(folder),
    draft, needsFolderName, canSaveMemo, destinations,
    openComposer, updateDraft, selectDestination, saveMemo, closeDialog,
    openMemoMenu, moveMemo, deleteMemo,
    openFolderManager, openFolderEditor, updateFolderName, confirmFolderDelete, saveFolder, deleteFolder,
    openTile, openFolder,
    openAll: () => router.push(APP_ROUTES.myTechniques),
    showMore: () => setLimit(current => current + PAGE_SIZE),
  };
}

export type PersonalMemoController = ReturnType<typeof usePersonalMemos>;
