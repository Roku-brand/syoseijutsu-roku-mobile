import { resolveTheoryId } from '@/data/theory-taxonomy';

export type LibraryFolder = { id: string; name: string; createdAt: string };
export type LibraryItemKind = 'technique' | 'theory';

export function libraryItemKey(kind: LibraryItemKind, id: string) {
  return `${kind}:${kind === 'theory' ? resolveTheoryId(id) : id}`;
}

/** Preserve saved knowledge while accepting only valid, canonical folder links. */
export function restoreLibraryFolders(folders: unknown, assignments: unknown, savedIds: string[], savedTheoryIds: string[]) {
  const libraryFolders: LibraryFolder[] = [];
  if (Array.isArray(folders)) for (const value of folders) {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') continue;
    const name = value.name.trim().slice(0, 32);
    if (!name || libraryFolders.some(folder => folder.id === value.id)) continue;
    libraryFolders.push({ id: value.id, name, createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString() });
  }
  const folderIds = new Set(libraryFolders.map(folder => folder.id));
  const savedKeys = new Set([...savedIds.map(id => libraryItemKey('technique', id)), ...savedTheoryIds.map(id => libraryItemKey('theory', id))]);
  const libraryFolderByItem: Record<string, string> = {};
  if (assignments && typeof assignments === 'object' && !Array.isArray(assignments)) for (const [key, value] of Object.entries(assignments)) {
    const match = /^(technique|theory):(.+)$/.exec(key);
    if (!match || typeof value !== 'string' || !folderIds.has(value)) continue;
    const canonicalKey = libraryItemKey(match[1] as LibraryItemKind, match[2]);
    if (savedKeys.has(canonicalKey) && !libraryFolderByItem[canonicalKey]) libraryFolderByItem[canonicalKey] = value;
  }
  return { libraryFolders, libraryFolderByItem };
}
