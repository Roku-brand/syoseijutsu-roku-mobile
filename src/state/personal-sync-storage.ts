import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { SyncJournal } from './personal-sync-model';

// AsyncStorage on Android limits the size of an individual value. The root
// is the commit pointer: a killed process can only see a complete generation.
const CHUNK_LENGTH = 180_000;
type Generation = 'a' | 'b';
type Manifest = { format: 'chunked-v1'; generation: Generation; count: number; length: number };
const manifest = (data: unknown): data is Manifest => Boolean(data && typeof data === 'object' && 'format' in data && data.format === 'chunked-v1');
const chunkKey = (key: string, generation: Generation, part: number) => key + '/parts/' + generation + '/' + part;

async function storedValue(key: string): Promise<SyncJournal | Manifest | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw) as SyncJournal | Manifest;
}

export async function readSyncJournal(key: string): Promise<SyncJournal | null> {
  const data = await storedValue(key);
  if (!manifest(data)) return data;
  if ((data.generation !== 'a' && data.generation !== 'b') || !Number.isSafeInteger(data.count) || data.count < 1 || data.count > 1000) {
    throw new Error('Invalid journal storage manifest');
  }
  const parts = await AsyncStorage.multiGet(Array.from({ length: data.count }, (_, i) => chunkKey(key, data.generation, i)));
  const json = parts.map(([, value]) => {
    if (value === null) throw new Error('Incomplete journal');
    return value;
  }).join('');
  if (json.length !== data.length) throw new Error('Incomplete journal');
  return JSON.parse(json) as SyncJournal;
}

export async function writeSyncJournal(key: string, journal: SyncJournal) {
  const json = JSON.stringify(journal);
  if (Platform.OS !== 'android') {
    await AsyncStorage.setItem(key, json);
    return;
  }
  const previous = await storedValue(key);
  if (json.length <= CHUNK_LENGTH) await AsyncStorage.setItem(key, json);
  else {
    const generation = manifest(previous) && previous.generation === 'a' ? 'b' : 'a';
    const parts: [string, string][] = [];
    for (let start = 0, end = 0; start < json.length; start = end) {
      end = Math.min(start + CHUNK_LENGTH, json.length);
      const last = json.charCodeAt(end - 1);
      if (end < json.length && last >= 0xD800 && last <= 0xDBFF) end--;
      parts.push([chunkKey(key, generation, parts.length), json.slice(start, end)]);
    }
    await AsyncStorage.multiSet(parts);
    await AsyncStorage.setItem(key, JSON.stringify({ format: 'chunked-v1', generation, count: parts.length, length: json.length }));
  }
  if (manifest(previous)) {
    const inactive = Array.from({ length: previous.count }, (_, i) => chunkKey(key, previous.generation, i));
    await AsyncStorage.multiRemove(inactive).catch(() => undefined);
  }
}

export async function removeLegacyCopies(storageKey: string, currentJournalKey: string) {
  const keys = await AsyncStorage.getAllKeys();
  const old = new Set([storageKey, storageKey + '/before-restore', storageKey + '/cloud-before-overwrite']);
  await AsyncStorage.multiRemove(keys.filter(key => old.has(key) || key.startsWith(currentJournalKey + '/parts/')));
}

/** Browser tabs that share localStorage also share the pending device queue. */
export function withSyncJournalLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(key, task);
  }
  return task();
}
