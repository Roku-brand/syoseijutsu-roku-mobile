import type { PersonalMemo, PersonalMemoFolder } from '@/state/app-state';

// Display-only projections. The persisted records and their IDs stay intact.
export const uniqueSavedIds = (ids: readonly string[]) => [...new Set(ids)];

export function latestPersonalMemos<T extends { id: string; createdAt: string }>(memos: readonly T[]) {
  return [...new Map(memos.map(memo => [memo.id, memo])).values()]
    .sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

export function personalMemoCopy(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length > 1) return { title: lines[0], excerpt: lines.slice(1).join('\n').trim() };
  const sentence = text.match(/^(.+?[。！？])\s*([\s\S]+)$/);
  return sentence ? { title: sentence[1], excerpt: sentence[2] } : { title: text, excerpt: '' };
}

export function personalMemoCollection(memos: readonly PersonalMemo[], folders: readonly PersonalMemoFolder[]) {
  const all = latestPersonalMemos(memos);
  const byFolder = new Map<string | null, PersonalMemo[]>();
  for (const memo of all) {
    const id = memo.folderId;
    const entries = byFolder.get(id);
    if (entries) entries.push(memo);
    else byFolder.set(id, [memo]);
  }

  const unfiled = all.filter(memo => !memo.folderId);
  const folderById = new Map<string, PersonalMemoFolder>();
  for (const folder of folders) if (!folderById.has(folder.id)) folderById.set(folder.id, folder);
  const folderTiles = folders.map(({ id, name }) => ({ id, name, count: byFolder.get(id)?.length ?? 0 }));
  if (unfiled.length) folderTiles.push({ id: 'unfiled', name: '未整理', count: unfiled.length });

  const entriesFor = (id: string | null) => {
    if (id === 'all') return all;
    if (id === 'unfiled') return unfiled;
    return id === null ? [] : byFolder.get(id) ?? [];
  };
  const nameFor = (id: string | null) => {
    if (id === 'all') return 'すべて';
    if (id === 'unfiled' || id === null) return '未整理';
    return folderById.get(id)?.name ?? '';
  };
  return { all, unfiled, folderById, folderTiles, entriesFor, nameFor };
}
