import type { PersistedState } from './app-state';

/** A stable identity for one independently synchronised personal record. */
export type PersonalSyncItem = { key: string; value: unknown };
export type PersonalSyncChange = { key: string; value: unknown | null; deleted: boolean };

const sets = ['savedIds', 'savedTheoryIds', 'savedFeatureIds', 'reviewCaseIds'] as const;
const objects = ['notes', 'practiceRecords', 'learningRecords', 'libraryFolderByItem'] as const;
const records = ['personalMemos', 'personalMemoFolders', 'libraryFolders'] as const;
const histories = ['historyIds', 'featureHistoryIds'] as const;
const scalars = ['personalPrinciple', 'learningUnlimited', 'interests', 'learningCurriculumVersion'] as const;

/** Serialises only user-created state. Each key is JSON encoded to avoid delimiter collisions. */
export function personalSyncItems(state: PersistedState): PersonalSyncItem[] {
  const items: PersonalSyncItem[] = [];
  for (const field of sets) for (const id of state[field]) items.push({ key: JSON.stringify([field, id]), value: true });
  for (const field of objects) for (const [id, value] of Object.entries(state[field])) items.push({ key: JSON.stringify([field, id]), value });
  for (const field of records) for (const value of state[field]) items.push({ key: JSON.stringify([field, value.id]), value });
  for (const field of histories) state[field].forEach((id, index) => items.push({ key: JSON.stringify([field, id]), value: -index - 1 }));
  for (const field of scalars) items.push({ key: JSON.stringify([field]), value: state[field] });
  return items;
}

/** Diff against the last locally journalled version, so removals become tombstones. */
export function personalSyncChanges(previous: PersistedState, next: PersistedState, timestamp = Date.now()): PersonalSyncChange[] {
  const entries = (state: PersistedState) => new Map(personalSyncItems(state)
    .filter(item => !histories.some(field => item.key.startsWith('["' + field + '",')))
    .map(item => [item.key, item.value]));
  const before = entries(previous), after = entries(next);
  const changes: PersonalSyncChange[] = [];
  for (const [key, value] of after) {
    if (!before.has(key) || JSON.stringify(before.get(key)) !== JSON.stringify(value)) changes.push({ key, value, deleted: false });
  }
  for (const key of before.keys()) if (!after.has(key)) changes.push({ key, value: null, deleted: true });

  for (const field of histories) {
    const old = previous[field], recent = next[field];
    if (old === recent) continue;
    const ids = new Set(recent);
    for (const id of old) if (!ids.has(id)) changes.push({ key: JSON.stringify([field, id]), value: null, deleted: true });
    // Keep the longest suffix whose relative order did not change. Opening a
    // card normally changes one rank, even when many cards shift down by one.
    let lastOld = old.length - 1, moved = recent.length - 1;
    for (; moved >= 0; moved--) {
      while (lastOld >= 0 && old[lastOld] !== recent[moved]) lastOld--;
      if (lastOld < 0) break;
      lastOld--;
    }
    for (let index = moved; index >= 0; index--) {
      changes.push({ key: JSON.stringify([field, recent[index]]), value: timestamp * 1000 - index, deleted: false });
    }
  }
  return changes;
}

export type SyncChange = PersonalSyncChange & { base: number };
export type ServerItem = { key: string; revision: number; value: unknown | null };
type Flight = { sequence: number; changes: SyncChange[]; acknowledged: boolean };
export type SyncJournal = {
  version: 1;
  commitId?: string;
  device: string;
  epoch: number | null;
  cursor: number;
  sequence: number;
  items: Record<string, ServerItem>;
  pending: Record<string, SyncChange>;
  flight: Flight | null;
  syncedAt: string | null;
  resetRequested: boolean;
};
export type SyncPage = {
  epoch: number;
  cursor: number;
  more: boolean;
  reset: boolean;
  ack: number;
  items: ServerItem[];
};
export type RecoveryEntry = {
  id: number;
  key: string;
  value: unknown | null;
  preview: string;
  reason: 'conflict' | 'delete_conflict' | 'deleted' | 'edited';
  created_at: string;
};

export function newSyncJournal(device: string): SyncJournal {
  return { version: 1, device, epoch: null, cursor: 0, sequence: 0, items: {}, pending: {}, flight: null, syncedAt: null, resetRequested: false };
}

export function syncIdentity(raw: string): [keyof PersistedState, string?] {
  const pair: unknown = JSON.parse(raw);
  if (!Array.isArray(pair) || typeof pair[0] !== 'string') throw new Error('Invalid record identity');
  const [field, id] = pair;
  if (pair.length === 1 && (scalars as readonly string[]).includes(field)) return [field as keyof PersistedState];
  if (pair.length === 2 && typeof id === 'string' && id &&
    [...sets, ...objects, ...records, ...histories].some(candidate => candidate === field)) return [field as keyof PersistedState, id];
  throw new Error('Invalid record identity');
}

function canonicalKey(key: string) {
  return JSON.stringify(syncIdentity(key));
}

export function queueSyncChanges(journal: SyncJournal, changes: PersonalSyncChange[]): SyncJournal {
  if (!changes.length) return journal;
  const pending = { ...journal.pending };
  const sending = new Set(journal.flight?.changes.map(change => change.key));
  for (const change of changes) {
    const base = pending[change.key]?.base ?? (sending.has(change.key) ? -1 : journal.items[change.key]?.revision ?? 0);
    pending[change.key] = { ...change, base };
  }
  return { ...journal, pending };
}

export function startSyncBatch(journal: SyncJournal): SyncJournal {
  if (journal.flight || journal.epoch === null) return journal;
  const pending = { ...journal.pending }, changes: SyncChange[] = [];
  let size = 0;
  for (const change of Object.values(pending)) {
    const length = JSON.stringify(change).length;
    if (changes.length >= 32 || (changes.length > 0 && size + length > 80_000)) break;
    size += length;
    changes.push(change);
    delete pending[change.key];
  }
  return changes.length ? {
    ...journal, pending,
    flight: { sequence: journal.sequence + 1, changes, acknowledged: false },
  } : journal;
}

export function readSyncPage(raw: unknown, sent: SyncJournal): SyncPage {
  const page = raw as Partial<SyncPage> | null;
  if (!page || !Number.isSafeInteger(page.epoch) || page.epoch! < 1 || !Number.isSafeInteger(page.cursor) ||
    typeof page.reset !== 'boolean' || typeof page.more !== 'boolean' || !Number.isSafeInteger(page.ack) ||
    !Array.isArray(page.items)) throw new Error('Invalid sync response');
  if (page.reset) {
    if (page.cursor !== 0 || page.items.length || page.ack !== 0 ||
      (sent.epoch !== null && page.epoch! <= sent.epoch)) throw new Error('Invalid reset response');
    return page as SyncPage;
  }
  if (page.epoch !== sent.epoch || page.cursor! < sent.cursor ||
    (sent.flight && !sent.flight.acknowledged && page.ack !== sent.flight.sequence)) throw new Error('Invalid sync receipt');
  let revision = sent.cursor;
  const items = page.items.map(item => {
    if (!item || !Number.isSafeInteger(item.revision) || item.revision <= revision || !('value' in item)) throw new Error('Invalid record revision');
    revision = item.revision;
    return { ...item, key: canonicalKey(item.key) };
  });
  if (revision !== page.cursor || (page.more && items.length === 0)) throw new Error('Incomplete sync response');
  return { ...page, items } as SyncPage;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.entries(a), right = b as Record<string, unknown>;
  return left.length === Object.keys(right).length && left.every(([key, value]) => Object.hasOwn(right, key) && sameValue(value, right[key]));
}

export function applySyncPage(journal: SyncJournal, page: SyncPage, now: string): SyncJournal {
  if (page.reset) {
    return journal.epoch === null && page.epoch === 1
      ? { ...journal, epoch: 1 }
      : { ...newSyncJournal(journal.device), epoch: page.epoch };
  }
  const items = { ...journal.items };
  for (const item of page.items) items[item.key] = item;
  const flight = journal.flight ? { ...journal.flight, acknowledged: true } : null;
  if (!flight || page.more) return { ...journal, cursor: page.cursor, items, flight, ...(page.more ? {} : { syncedAt: now }) };

  const pending = { ...journal.pending };
  for (const change of flight.changes) {
    const queued = pending[change.key], current = items[change.key];
    if (queued?.base === -1) {
      const matches = change.deleted ? current?.value === null : sameValue(current?.value, change.value);
      // A second edit inherits the result of its first edit only when that
      // first edit is the version actually stored on the server.
      pending[change.key] = { ...queued, base: matches ? current.revision : change.base };
    }
  }
  return { ...journal, cursor: page.cursor, items, pending, flight: null, sequence: flight.sequence, syncedAt: now };
}

export function projectSyncState(journal: SyncJournal, defaults: PersistedState): unknown {
  const merged = new Map(Object.values(journal.items).map(item => [item.key, item.value]));
  for (const item of [...(journal.flight?.changes ?? []), ...Object.values(journal.pending)]) {
    merged.set(item.key, item.deleted ? null : item.value);
  }
  const state: Record<string, unknown> = { ...defaults };
  const ranks: Record<typeof histories[number], [string, number][]> = { historyIds: [], featureHistoryIds: [] };
  for (const [key, value] of merged) {
    if (value === null) continue;
    const [field, id] = syncIdentity(key);
    if (id === undefined) {
      state[field] = value;
    } else if (field === 'historyIds' || field === 'featureHistoryIds') {
      if (typeof value === 'number') ranks[field].push([id, value]);
    } else if ((sets as readonly string[]).includes(field)) {
      if (state[field] === defaults[field]) state[field] = [];
      (state[field] as string[]).push(id);
    } else if ((records as readonly string[]).includes(field)) {
      if (state[field] === defaults[field]) state[field] = [];
      (state[field] as unknown[]).push(value);
    } else {
      if (state[field] === defaults[field]) state[field] = {};
      Object.defineProperty(state[field], id, { value, enumerable: true, configurable: true, writable: true });
    }
  }
  for (const field of histories) state[field] = ranks[field].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 100).map(([id]) => id);
  return state;
}
