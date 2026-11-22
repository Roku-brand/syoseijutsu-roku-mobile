import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as DeviceAppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/data/legal-documents';
import type { CategoryKey } from '@/data/types';
import { resolveTheoryId } from '@/data/theory-taxonomy';
import { recordContentEvent } from '@/lib/content-events';
import { clearDiscoveryState } from '@/lib/discovery-storage';
import { libraryItemKey, type LibraryFolder, type LibraryItemKind } from './library-folders';
import { useAuth } from '@/auth/auth-state';
import { getLearningCase } from '@/data/learning';
import { hasPersonalRecords, LEGACY_PERSONAL_KEY, makePersonalBackup, mergePersonalData, normalizePersonalData, parsePersonalBackup, personalStorageKey } from './personal-data';

import { readSyncJournal, removeLegacyCopies, withSyncJournalLock, writeSyncJournal } from './personal-sync-storage';
import { personalSyncRpc, type SyncAccount } from './personal-sync-api';
import {
  applySyncPage, newSyncJournal, personalSyncChanges, projectSyncState, queueSyncChanges,
  readSyncPage, startSyncBatch, syncIdentity, type RecoveryEntry, type SyncJournal,
} from './personal-sync-model';

const STORAGE_HYDRATION_TIMEOUT_MS = 900;
const LEARNING_CURRICULUM_VERSION = 2;
const CATEGORY_KEYS: CategoryKey[] = ['interpersonal', 'work', 'life'];

export type PracticeRecord = {
  cardId: string;
  status: 'planned' | 'tried';
  plannedAt: string;
  triedAt?: string;
};

export type LearningRecord = {
  caseId: string;
  choiceId: 'a' | 'b' | 'c';
  answeredAt: string;
};

export type PersonalMemoFolder = {
  id: string;
  name: string;
  createdAt: string;
};

export type PersonalMemo = {
  id: string;
  text: string;
  folderId: string | null;
  createdAt: string;
};

export type PersistedState = {
  learningCurriculumVersion: number;
  interests: CategoryKey[];
  savedIds: string[];
  savedTheoryIds: string[];
  savedFeatureIds: string[];
  libraryFolders: LibraryFolder[];
  libraryFolderByItem: Record<string, string>;
  historyIds: string[];
  featureHistoryIds: string[];
  notes: Record<string, string>;
  practiceRecords: Record<string, PracticeRecord>;
  personalPrinciple: string;
  personalMemos: PersonalMemo[];
  personalMemoFolders: PersonalMemoFolder[];
  learningRecords: Record<string, LearningRecord>;
  learningUnlimited: boolean;
  reviewCaseIds: string[];
};

const initialState: PersistedState = {
  learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
  interests: CATEGORY_KEYS,
  savedIds: [],
  savedTheoryIds: [],
  savedFeatureIds: [],
  libraryFolders: [],
  libraryFolderByItem: {},
  historyIds: [],
  featureHistoryIds: [],
  notes: {},
  practiceRecords: {},
  personalPrinciple: '志は高く、腰は低く。',
  personalMemos: [],
  personalMemoFolders: [],
  learningRecords: {},
  learningUnlimited: false,
  reviewCaseIds: [],
};

type SyncStatus = 'notice' | 'local' | 'waiting' | 'syncing' | 'synced' | 'offline' | 'reset';
type SyncRuntime = {
  key: string;
  accountId: string;
  journal: SyncJournal;
  committedId?: string;
  dirty: boolean;
};
const noticeKey = (key: string) => key + '/sync-notice-' + TERMS_VERSION + '-' + PRIVACY_VERSION;
const journalKey = (key: string) => key + '/sync-v1';
const newDeviceId = () => Date.now().toString(36) + '-' + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join('-');
const accountChanged = () => new Error('アカウントが変わりました。もう一度操作してください。');
const project = (journal: SyncJournal) => normalizePersonalData(projectSyncState(journal, initialState), initialState);
const hasPending = (journal: SyncJournal) => Boolean(journal.flight || Object.keys(journal.pending).length);

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  storageError: string | null;
  guestImportAvailable: boolean;
  importGuestRecords: () => Promise<void>;
  dismissGuestImport: () => void;
  retrySave: () => Promise<void>;
  exportPersonalData: () => string;
  restorePersonalData: (json: string, mode?: 'merge' | 'replace') => Promise<void>;
  setLearningUnlimited: (value: boolean) => void;
  toggleReviewCase: (id: string) => void;
  startFreeEdition: (interests: CategoryKey[]) => void;
  toggleSaved: (id: string) => void;
  toggleSavedTheory: (id: string) => void;
  toggleSavedFeature: (id: string) => void;
  createLibraryFolder: (name: string) => string | null;
  renameLibraryFolder: (id: string, name: string) => void;
  deleteLibraryFolder: (id: string) => void;
  moveLibraryItem: (kind: LibraryItemKind, id: string, folderId: string | null) => void;
  addHistory: (id: string) => void;
  addFeatureHistory: (id: string) => void;
  saveNote: (id: string, note: string) => void;
  planPractice: (cardId: string) => void;
  completePractice: (cardId: string) => void;
  toggleInterest: (category: CategoryKey) => void;
  updatePersonalPrinciple: (principle: string) => void;
  addPersonalMemo: (memo: string, folderId?: string | null, newFolderName?: string) => string | null;
  updatePersonalMemo: (id: string, text: string, folderId: string | null) => void;
  removePersonalMemo: (id: string) => void;
  createPersonalMemoFolder: (name: string) => string | null;
  renamePersonalMemoFolder: (id: string, name: string) => void;
  deletePersonalMemoFolder: (id: string) => void;
  movePersonalMemo: (memoId: string, folderId: string | null) => void;
  answerLearningCase: (caseId: string, choiceId: LearningRecord['choiceId']) => void;
  resetLearningCase: (caseId: string) => void;
  clearPersonalData: (afterAccountDeletion?: boolean) => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  hasUnsyncedRecords: boolean;
  syncNow: () => Promise<void>;
  acceptSyncNotice: () => Promise<void>;
  clearCloudPersonalData: () => Promise<void>;
  listPersonalRecovery: (before?: number) => Promise<RecoveryEntry[]>;
  restorePersonalRecovery: (id: number) => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function haptic(style: Haptics.ImpactFeedbackStyle) {
  void Haptics.impactAsync(style).catch(() => undefined);
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const userId = user?.id;
  const storageKey = personalStorageKey(userId);
  const activeKey = useRef(storageKey);
  const stateOwner = useRef(storageKey);
  activeKey.current = storageKey;
  const account = useRef<SyncAccount | null>(null);
  account.current = userId && session?.user.id === userId
    ? { id: userId, token: session.access_token, expiresAt: session.expires_at } : null;
  const metadata = user?.user_metadata;
  const acceptedOnAccount = useRef(false);
  acceptedOnAccount.current = Boolean(
    (metadata?.terms_version === TERMS_VERSION && metadata?.privacy_version === PRIVACY_VERSION && metadata?.terms_accepted_at) ||
    (metadata?.personal_sync_terms_version === TERMS_VERSION && metadata?.personal_sync_privacy_version === PRIVACY_VERSION && metadata?.personal_sync_accepted_at),
  );
  const acceptedLocally = useRef<string | null>(null);
  const canSync = useCallback((current: SyncRuntime) =>
    account.current?.id === current.accountId && (acceptedOnAccount.current || acceptedLocally.current === current.key), []);
  const [state, setRawState] = useState(initialState);
  const snapshot = useRef(initialState);
  const loadedRef = useRef<string | null>(null);
  const queuedEdits = useRef<{ key: string; edit: SetStateAction<PersistedState> }[]>([]);
  const editVersion = useRef(0);
  const [hydrated, setHydrated] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [guestImportAvailable, setGuestImportAvailable] = useState(false);
  const guestSnapshot = useRef<PersistedState | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const runtime = useRef<SyncRuntime | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasUnsyncedRecords, setHasUnsyncedRecords] = useState(false);
  const [reload, setReload] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runner = useRef<{ runtime: SyncRuntime; abort: AbortController; promise: Promise<void> } | null>(null);
  const clearing = useRef<string | null>(null);
  const failures = useRef(0);

  const serial = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = writes.current.then(task);
    writes.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);
  const showState = useCallback((next: PersistedState) => {
    snapshot.current = next;
    setRawState(next);
  }, []);
  const isActive = useCallback((current: SyncRuntime) => runtime.current === current &&
    activeKey.current === current.key && loadedRef.current === current.key && clearing.current !== current.key, []);
  const syncTransaction = useCallback(<T,>(current: SyncRuntime, task: () => Promise<T>, localOnly = false): Promise<T> =>
    serial(() => withSyncJournalLock(journalKey(current.key), async () => {
      const mayWrite = () => localOnly ? clearing.current !== current.key && runtime.current === current : isActive(current);
      if (!mayWrite()) throw accountChanged();
      if (Platform.OS === 'web') {
        const latest = await readSyncJournal(journalKey(current.key));
        if (!mayWrite() || (!latest && current.committedId)) throw accountChanged();
        if (latest && latest.commitId !== current.committedId) {
          if (current.dirty) throw new Error('別のタブで記録が更新されました。この画面の変更をファイルに書き出して保護できます。');
          current.journal = latest;
          current.committedId = latest.commitId;
        }
      }
      return task();
    })), [isActive, serial]);

  const saveJournal = useCallback(async (current: SyncRuntime, next: SyncJournal, renderVersion?: number) => {
    const committed = { ...next, commitId: newDeviceId() };
    current.journal = committed;
    current.dirty = true;
    try {
      await writeSyncJournal(journalKey(current.key), committed);
      current.committedId = committed.commitId;
      current.dirty = false;
      if (isActive(current)) {
        setStorageError(null);
        setLastSyncedAt(next.syncedAt);
        setHasUnsyncedRecords(hasPending(next));
        if (renderVersion === editVersion.current) showState(project(next));
      }
    } catch (error) {
      if (isActive(current)) setStorageError('記録を端末に保存できませんでした。端末の空き容量を確認してください。');
      throw error;
    }
  }, [isActive, showState]);

  const syncNow = useCallback(async function runSync(): Promise<void> {
    const current = runtime.current;
    if (!current || !isActive(current)) return;
    if (!canSync(current) && !current.journal.resetRequested) { setSyncStatus('notice'); return; }
    if (runner.current?.runtime === current) return runner.current.promise;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const abort = new AbortController();
    const schedule = (delay: number) => {
      if (isActive(current)) timer.current = setTimeout(() => { void runSync().catch(() => undefined); }, delay);
    };
    const rpc = async (name: 'sync_personal_records' | 'clear_personal_records', args: object) => {
      const signedIn = account.current;
      if (signedIn?.id !== current.accountId || !isActive(current) || abort.signal.aborted) throw accountChanged();
      const request = new AbortController();
      const cancel = () => request.abort();
      abort.signal.addEventListener('abort', cancel, { once: true });
      const deadline = setTimeout(cancel, 15_000);
      try { return await personalSyncRpc(signedIn, name, args, request.signal); }
      finally { clearTimeout(deadline); abort.signal.removeEventListener('abort', cancel); }
    };
    const promise = (async () => {
      setSyncStatus('syncing');
      let resetObserved = false;
      try {
        // Limit each pass so a large first sync cannot monopolize a foreground session.
        for (let slice = 0; slice < 12 && isActive(current) && !abort.signal.aborted; slice++) {
          const sent = await syncTransaction(current, async () => {
            if (!isActive(current)) throw accountChanged();
            const next = current.journal.resetRequested ? current.journal : startSyncBatch(current.journal);
            if (next !== current.journal || current.dirty) await saveJournal(current, next);
            return current.journal;
          });
          if (sent.resetRequested) {
            const deleted = await rpc('clear_personal_records', { p_epoch: sent.epoch });
            if (typeof deleted !== 'number' || !Number.isSafeInteger(deleted) || deleted <= (sent.epoch ?? 0)) throw new Error('Invalid reset response');
            await syncTransaction(current, async () => {
              if (!isActive(current) || abort.signal.aborted) throw accountChanged();
              if (current.journal.epoch !== sent.epoch) return;
              await saveJournal(current, { ...newSyncJournal(sent.device), epoch: deleted }, editVersion.current);
              await removeLegacyCopies(current.key, journalKey(current.key));
              resetObserved = true;
            });
            if (!canSync(current)) { if (isActive(current)) setSyncStatus('notice'); return; }
            continue;
          }
          const sending = sent.flight && !sent.flight.acknowledged ? sent.flight : null;
          const args = { p_epoch: sent.epoch, p_cursor: sent.cursor, p_device: sent.device, p_sequence: sending?.sequence ?? 0, p_changes: sending?.changes ?? [] };
          const page = readSyncPage(await rpc('sync_personal_records', args), sent);
          const changedEpoch = page.reset && !(sent.epoch === null && page.epoch === 1);
          resetObserved ||= changedEpoch;
          const more = await syncTransaction(current, async () => {
            if (!isActive(current) || abort.signal.aborted) throw accountChanged();
            const latest = current.journal;
            // Another browser tab may have already applied this receipt or
            // advanced the cursor. Its pending edits remain in the journal.
            if (latest.epoch !== sent.epoch || latest.cursor !== sent.cursor ||
              latest.sequence !== sent.sequence || latest.flight?.sequence !== sent.flight?.sequence ||
              latest.flight?.acknowledged !== sent.flight?.acknowledged) return true;
            const next = applySyncPage(latest, page, new Date().toISOString());
            const renderVersion = editVersion.current;
            await saveJournal(current, next, renderVersion);
            if (changedEpoch) await removeLegacyCopies(current.key, journalKey(current.key));
            return page.reset || page.more || hasPending(next) || next.resetRequested;
          });
          if (!more) {
            failures.current = 0;
            if (isActive(current)) setSyncStatus(resetObserved ? 'reset' : 'synced');
            return;
          }
        }
        schedule(500);
      } catch (error) {
        if (isActive(current) && !abort.signal.aborted) {
          setSyncStatus('offline');
          // Only retry failed work. A successful pull has no polling timer.
          schedule(Math.min(60_000, 2500 * 2 ** Math.min(failures.current++, 5)));
          throw error;
        }
      }
    })();
    runner.current = { runtime: current, abort, promise };
    try { await promise; } finally { if (runner.current?.promise === promise) runner.current = null; }
  }, [canSync, isActive, saveJournal, syncTransaction]);

  const saveEdit = useCallback((previous: PersistedState, next: PersistedState) => {
    const key = activeKey.current;
    const current = runtime.current?.key === key ? runtime.current : null;
    const epoch = current?.journal.epoch;
    const version = ++editVersion.current;
    showState(next);
    const persisted = current ? syncTransaction(current, async () => {
      const changedEpoch = epoch !== current.journal.epoch && !(epoch === null && current.journal.epoch === 1);
      if (changedEpoch) { if (isActive(current)) showState(project(current.journal)); return; }
      const changes = personalSyncChanges(previous, next);
      if (!changes.length) return;
      await saveJournal(current, queueSyncChanges(current.journal, changes), version);
      if (isActive(current) && canSync(current) && !current.journal.resetRequested) {
        if (!runner.current) setSyncStatus('waiting');
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void syncNow().catch(() => undefined); }, 800);
      }
    }, true) : serial(async () => {
      if (clearing.current === key) return;
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (activeKey.current === key) setStorageError(null);
    });
    return persisted.catch(error => {
      if (activeKey.current === key) setStorageError('記録を端末に保存できませんでした。内容は画面内に残っています。');
      throw error;
    });
  }, [canSync, isActive, saveJournal, serial, showState, syncNow, syncTransaction]);

  const setState = useCallback((edit: SetStateAction<PersistedState>) => {
    const key = activeKey.current;
    if (clearing.current === key) return;
    if (loadedRef.current !== key) {
      queuedEdits.current.push({ key, edit });
      return;
    }
    const previous = snapshot.current;
    const next = typeof edit === 'function' ? edit(previous) : edit;
    if (next !== previous) void saveEdit(previous, next).catch(() => undefined);
  }, [saveEdit]);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    loadedRef.current = null;
    queuedEdits.current = queuedEdits.current.filter(entry => entry.key === storageKey);
    stateOwner.current = storageKey;
    showState(initialState); setHydrated(false); setLoadedKey(null); setSyncStatus(userId ? 'waiting' : 'local');
    setStorageError(null); setGuestImportAvailable(false); setHasUnsyncedRecords(false); setLastSyncedAt(null);
    guestSnapshot.current = null;
    acceptedLocally.current = null;
    failures.current = 0;
    const fallback = setTimeout(() => {
      if (active) { setHydrated(true); setStorageError('記録の読み込みに時間がかかっています。元の記録を保護したまま再試行できます。'); }
    }, STORAGE_HYDRATION_TIMEOUT_MS);
    void (async () => {
      try {
        await writes.current;
        const [saved, notice] = userId ? await Promise.all([
          readSyncJournal(journalKey(storageKey)), AsyncStorage.getItem(noticeKey(storageKey)),
        ]) : [null, null];
        const stored = saved ? null : await AsyncStorage.getItem(storageKey);
        if (!active || activeKey.current !== storageKey || clearing.current === storageKey) return;
        const journal = saved;
        if (journal && (journal.version !== 1 || !journal.device || !journal.items || !journal.pending)) throw new Error('Invalid journal');
        const original = journal ? project(journal) : stored ? normalizePersonalData(JSON.parse(stored), initialState) : initialState;
        runtime.current = userId ? {
          key: storageKey, accountId: userId, committedId: journal?.commitId, dirty: false,
          journal: journal ?? queueSyncChanges(newSyncJournal(newDeviceId()), personalSyncChanges(initialState, original)),
        } : null;
        const restored = queuedEdits.current.filter(entry => entry.key === storageKey).reduce((current, { edit }) =>
          typeof edit === 'function' ? edit(current) : edit, original);
        queuedEdits.current = []; loadedRef.current = storageKey;
        if (notice === 'accepted') acceptedLocally.current = storageKey;
        showState(original); setLoadedKey(storageKey); setStorageError(null);
        setHasUnsyncedRecords(Boolean(runtime.current && hasPending(runtime.current.journal)));
        if (restored !== original || (!userId && stored)) {
          void saveEdit(original, restored).catch(() => undefined);
        }
        if (userId) {
          void syncNow().catch(() => undefined);
          try {
            const [guest, dismissed] = await Promise.all([
              AsyncStorage.getItem(LEGACY_PERSONAL_KEY), AsyncStorage.getItem(storageKey + '/guest-import'),
            ]);
            if (!active || activeKey.current !== storageKey || !guest || dismissed === 'dismissed') return;
            const data = normalizePersonalData(JSON.parse(guest), initialState);
            if (hasPersonalRecords(data)) { guestSnapshot.current = data; setGuestImportAvailable(true); }
          } catch { /* Guest data remains on the device for another attempt. */ }
        }
      } catch {
        if (active) setStorageError('端末内の記録を読み込めませんでした。元の記録を保護しています。');
      } finally {
        clearTimeout(fallback);
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false; clearTimeout(fallback);
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (runner.current?.runtime.key === storageKey) runner.current.abort.abort();
    };
  }, [authLoading, reload, storageKey, userId, saveEdit, showState, syncNow]);

  useEffect(() => {
    if (!userId || authLoading) return;
    const wake = () => { void syncNow().catch(() => undefined); };
    const subscription = DeviceAppState.addEventListener('change', next => { if (next === 'active') wake(); });
    const storageChanged = (event: StorageEvent) => {
      const current = runtime.current;
      if (!current || event.key !== journalKey(current.key) || event.newValue === null || !isActive(current)) return;
      const version = editVersion.current;
      void syncTransaction(current, async () => {
        if (!isActive(current) || current.dirty || version !== editVersion.current) return;
        showState(project(current.journal));
        setLastSyncedAt(current.journal.syncedAt);
        setHasUnsyncedRecords(hasPending(current.journal));
      }).catch(() => undefined);
    };
    const visibility = () => { if (document.visibilityState === 'visible') wake(); };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('online', wake);
      window.addEventListener('storage', storageChanged);
      document.addEventListener('visibilitychange', visibility);
    }
    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('online', wake);
        window.removeEventListener('storage', storageChanged);
        document.removeEventListener('visibilitychange', visibility);
      }
    };
  }, [authLoading, isActive, showState, syncNow, syncTransaction, userId]);

  const acceptSyncNotice = useCallback(async () => {
    const current = runtime.current, signedIn = account.current;
    if (!current || !isActive(current) || signedIn?.id !== current.accountId) throw accountChanged();
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15_000);
    try {
      const accepted = await personalSyncRpc(signedIn, 'accept_personal_sync_notice', {
        p_terms: TERMS_VERSION, p_privacy: PRIVACY_VERSION,
      }, abort.signal);
      if (accepted !== true || !isActive(current)) throw accountChanged();
      await AsyncStorage.setItem(noticeKey(current.key), 'accepted');
      if (!isActive(current)) throw accountChanged();
      acceptedLocally.current = current.key;
      void syncNow().catch(() => undefined);
    } finally { clearTimeout(timeout); }
  }, [isActive, syncNow]);

  const retrySave = useCallback(async () => {
    const key = storageKey;
    if (loadedRef.current !== key) { setReload(value => value + 1); return; }
    const current = runtime.current;
    if (current?.key === key) {
      await syncTransaction(current, () => saveJournal(current, current.journal, editVersion.current));
    } else {
      await serial(async () => {
        if (activeKey.current !== key) throw accountChanged();
        await AsyncStorage.setItem(key, JSON.stringify(snapshot.current));
        if (activeKey.current === key) setStorageError(null);
      });
    }
    void syncNow().catch(() => undefined);
  }, [saveJournal, serial, storageKey, syncNow, syncTransaction]);
  const restorePersonalData = useCallback(async (json: string, mode: 'merge' | 'replace' = 'merge') => {
    const incoming = parsePersonalBackup(json, initialState), key = storageKey;
    let saved: Promise<void> | undefined;
    await serial(async () => {
      if (activeKey.current !== key || loadedRef.current !== key || clearing.current === key) throw accountChanged();
      await AsyncStorage.setItem(key + '/before-restore', makePersonalBackup(snapshot.current));
      if (activeKey.current !== key || loadedRef.current !== key || clearing.current === key) throw accountChanged();
      const previous = snapshot.current;
      saved = saveEdit(previous, mode === 'replace' ? incoming : mergePersonalData(incoming, previous));
    });
    await saved;
  }, [saveEdit, serial, storageKey]);
  const exportPersonalData = useCallback(() => makePersonalBackup(stateOwner.current === storageKey ? snapshot.current : initialState), [storageKey]);
  const dismissGuestImport = useCallback(() => {
    setGuestImportAvailable(false);
    void AsyncStorage.setItem(storageKey + '/guest-import', 'dismissed').catch(() => undefined);
  }, [storageKey]);
  const importGuestRecords = useCallback(async () => {
    const guest = guestSnapshot.current;
    if (!guest) return;
    await restorePersonalData(makePersonalBackup(guest));
    dismissGuestImport();
  }, [restorePersonalData, dismissGuestImport]);
  const setLearningUnlimited = useCallback((learningUnlimited: boolean) => setState(current => ({ ...current, learningUnlimited })), [setState]);
  const toggleReviewCase = useCallback((id: string) => setState(current => ({ ...current, reviewCaseIds: current.reviewCaseIds.includes(id) ? current.reviewCaseIds.filter(key => key !== id) : [...current.reviewCaseIds, id] })), [setState]);

  const startFreeEdition = useCallback((interests: CategoryKey[]) => {
    setState((current) => ({
      ...current,
      interests: interests.length ? interests : initialState.interests,
    }));
  }, [setState]);

  const toggleSaved = useCallback((id: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    if (!state.savedIds.includes(id)) void recordContentEvent('technique', id, 'save').catch(() => undefined);
    setState((current) => ({
      ...current,
      savedIds: current.savedIds.includes(id)
        ? current.savedIds.filter((savedId) => savedId !== id)
        : [id, ...current.savedIds],
      libraryFolderByItem: current.savedIds.includes(id)
        ? Object.fromEntries(Object.entries(current.libraryFolderByItem).filter(([key]) => key !== libraryItemKey('technique', id)))
        : current.libraryFolderByItem,
    }));
  }, [state.savedIds]);

  const toggleSavedTheory = useCallback((id: string) => {
    id = resolveTheoryId(id);
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    if (!state.savedTheoryIds.includes(id)) void recordContentEvent('theory', id, 'save').catch(() => undefined);
    setState((current) => ({
      ...current,
      savedTheoryIds: current.savedTheoryIds.includes(id)
        ? current.savedTheoryIds.filter((savedId) => savedId !== id)
        : [id, ...current.savedTheoryIds],
      libraryFolderByItem: current.savedTheoryIds.includes(id)
        ? Object.fromEntries(Object.entries(current.libraryFolderByItem).filter(([key]) => key !== libraryItemKey('theory', id)))
        : current.libraryFolderByItem,
    }));
  }, [state.savedTheoryIds]);

  const toggleSavedFeature = useCallback((id: string) => {
    setState(current => ({ ...current,
      savedFeatureIds: current.savedFeatureIds.includes(id) ? current.savedFeatureIds.filter(item => item !== id) : [id, ...current.savedFeatureIds],
      libraryFolderByItem: current.savedFeatureIds.includes(id) ? Object.fromEntries(Object.entries(current.libraryFolderByItem).filter(([key]) => key !== libraryItemKey('feature', id))) : current.libraryFolderByItem,
    }));
  }, [setState]);

  const addHistory = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      historyIds: [id, ...current.historyIds.filter((item) => item !== id)].slice(
        0,
        100,
      ),
    }));
  }, [setState]);

  const addFeatureHistory = useCallback((id: string) => {
    setState(current => ({ ...current, featureHistoryIds: [id, ...current.featureHistoryIds.filter(value => value !== id)].slice(0, 100) }));
  }, [setState]);

  const createLibraryFolder = useCallback((name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return null;
    const id = `library-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setState(current => ({ ...current, libraryFolders: [...current.libraryFolders, { id, name: value, createdAt: new Date().toISOString() }] }));
    return id;
  }, [setState]);
  const renameLibraryFolder = useCallback((id: string, name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return;
    setState(current => ({ ...current, libraryFolders: current.libraryFolders.map(folder => folder.id === id ? { ...folder, name: value } : folder) }));
  }, [setState]);
  const deleteLibraryFolder = useCallback((id: string) => {
    setState(current => ({ ...current, libraryFolders: current.libraryFolders.filter(folder => folder.id !== id), libraryFolderByItem: Object.fromEntries(Object.entries(current.libraryFolderByItem).filter(([, folderId]) => folderId !== id)) }));
  }, [setState]);
  const moveLibraryItem = useCallback((kind: LibraryItemKind, id: string, folderId: string | null) => {
    const key = libraryItemKey(kind, id);
    setState(current => {
      if (!(kind === 'feature' ? current.savedFeatureIds : kind === 'theory' ? current.savedTheoryIds : current.savedIds).includes(kind === 'theory' ? resolveTheoryId(id) : id)) return current;
      const libraryFolderByItem = { ...current.libraryFolderByItem };
      if (folderId && current.libraryFolders.some(folder => folder.id === folderId)) libraryFolderByItem[key] = folderId;
      else delete libraryFolderByItem[key];
      return { ...current, libraryFolderByItem };
    });
  }, [setState]);

  const saveNote = useCallback((id: string, note: string) => {
    setState((current) => ({
      ...current,
      notes: { ...current.notes, [id]: note },
    }));
  }, [setState]);

  const toggleInterest = useCallback((category: CategoryKey) => {
    setState((current) => {
      const exists = current.interests.includes(category);
      const interests = exists
        ? current.interests.filter((item) => item !== category)
        : [...current.interests, category];
      return { ...current, interests: interests.length ? interests : current.interests };
    });
  }, [setState]);

  const planPractice = useCallback((cardId: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setState((current) => ({
      ...current,
      practiceRecords: {
        ...current.practiceRecords,
        [cardId]: {
          cardId,
          status: 'planned',
          plannedAt:
            current.practiceRecords[cardId]?.plannedAt ??
            new Date().toISOString(),
        },
      },
    }));
  }, [setState]);

  const completePractice = useCallback((cardId: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setState((current) => ({
      ...current,
      practiceRecords: {
        ...current.practiceRecords,
        [cardId]: {
          cardId,
          status: 'tried',
          plannedAt:
            current.practiceRecords[cardId]?.plannedAt ??
            new Date().toISOString(),
          triedAt: new Date().toISOString(),
        },
      },
    }));
  }, [setState]);

  const updatePersonalPrinciple = useCallback((personalPrinciple: string) => {
    setState((current) => ({
      ...current,
      personalPrinciple: personalPrinciple.trim(),
    }));
  }, [setState]);

  const addPersonalMemo = useCallback((memo: string, folderId: string | null = null, newFolderName?: string) => {
    const value = memo.trim();
    if (!value) return null;
    const name = newFolderName?.trim().slice(0, 32);
    if (newFolderName !== undefined && !name) return null;
    const createdAt = new Date().toISOString();
    const memoId = `memo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newFolder = name ? { id: `memo-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, createdAt } : null;
    const destination = newFolder?.id ?? folderId;
    haptic(Haptics.ImpactFeedbackStyle.Light);
    // Persist the first memo and its folder together so every entry point sees
    // the same complete collection, including after a reload.
    setState((current) => {
      const folders = newFolder ? [...current.personalMemoFolders, newFolder] : current.personalMemoFolders;
      return {
        ...current,
        personalMemoFolders: folders,
        personalMemos: [{
          id: memoId,
          text: value,
          folderId: destination && folders.some((folder) => folder.id === destination) ? destination : null,
          createdAt,
        }, ...current.personalMemos],
      };
    });
    return destination;
  }, [setState]);

  const removePersonalMemo = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.filter((memo) => memo.id !== id),
    }));
  }, [setState]);

  const updatePersonalMemo = useCallback((id: string, text: string, folderId: string | null) => {
    const value = text.trim();
    if (!value) return;
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.map((memo) => memo.id === id ? {
        ...memo,
        text: value,
        folderId: folderId && current.personalMemoFolders.some((folder) => folder.id === folderId) ? folderId : null,
      } : memo),
    }));
  }, [setState]);

  const createPersonalMemoFolder = useCallback((name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return null;
    const id = `memo-folder-${Date.now()}`;
    setState((current) => ({
      ...current,
      personalMemoFolders: [...current.personalMemoFolders, { id, name: value, createdAt: new Date().toISOString() }],
    }));
    return id;
  }, [setState]);

  const deletePersonalMemoFolder = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      personalMemoFolders: current.personalMemoFolders.filter((folder) => folder.id !== id),
      personalMemos: current.personalMemos.map((memo) => memo.folderId === id ? { ...memo, folderId: null } : memo),
    }));
  }, [setState]);

  const renamePersonalMemoFolder = useCallback((id: string, name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return;
    setState(current => ({ ...current, personalMemoFolders: current.personalMemoFolders.map(folder => folder.id === id ? { ...folder, name: value } : folder) }));
  }, [setState]);

  const movePersonalMemo = useCallback((memoId: string, folderId: string | null) => {
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.map((memo) => memo.id === memoId ? {
        ...memo,
        folderId: folderId && current.personalMemoFolders.some((folder) => folder.id === folderId) ? folderId : null,
      } : memo),
    }));
  }, [setState]);

  const answerLearningCase = useCallback((caseId: string, choiceId: LearningRecord['choiceId']) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setState((current) => ({
      ...current,
      reviewCaseIds: getLearningCase(caseId) && getLearningCase(caseId)?.goodChoiceId !== choiceId ? [...new Set([...current.reviewCaseIds, caseId])] : current.reviewCaseIds,
      learningRecords: {
        ...current.learningRecords,
        [caseId]: { caseId, choiceId, answeredAt: new Date().toISOString() },
      },
    }));
  }, [setState]);

  const resetLearningCase = useCallback((caseId: string) => {
    setState((current) => {
      const learningRecords = { ...current.learningRecords };
      delete learningRecords[caseId];
      return { ...current, learningRecords };
    });
  }, [setState]);

  const clearPersonalData = useCallback(async (afterAccountDeletion = false) => {
    const key = storageKey;
    clearing.current = key;
    if (timer.current) clearTimeout(timer.current);
    if (runner.current?.runtime.key === key) runner.current.abort.abort();
    try {
      await writes.current;
      if (userId) {
        if (!afterAccountDeletion) {
          if (activeKey.current !== key) throw accountChanged();
          await signOut('local');
        }
      }
      await serial(() => withSyncJournalLock(journalKey(key), async () => {
        const keys = await AsyncStorage.getAllKeys();
        await AsyncStorage.multiRemove(keys.filter(candidate => candidate === key || candidate.startsWith(key + '/')));
        await clearDiscoveryState();
        if (runtime.current?.key === key) runtime.current = null;
        if (activeKey.current === key) {
          showState(initialState);
          if (!userId && loadedRef.current !== key) setReload(value => value + 1);
        }
      }));
    } finally {
      clearing.current = null;
    }
  }, [serial, showState, signOut, storageKey, userId]);

  const clearCloudPersonalData = useCallback(async () => {
    const current = runtime.current, signedIn = account.current;
    if (!current || !isActive(current) || signedIn?.id !== current.accountId) throw accountChanged();
    const startingEpoch = current.journal.epoch;
    let confirmedEpoch = startingEpoch;
    if (confirmedEpoch === null) {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 15_000);
      try {
        const epoch = await personalSyncRpc(signedIn, 'personal_record_sync_epoch', {}, abort.signal);
        if (typeof epoch !== 'number' || !Number.isSafeInteger(epoch) || epoch < 1) throw new Error('削除対象を確認できませんでした。');
        confirmedEpoch = epoch;
      } finally { clearTimeout(timeout); }
    }
    await syncTransaction(current, async () => {
      if (!isActive(current)) throw accountChanged();
      if (current.journal.epoch !== startingEpoch && current.journal.epoch !== confirmedEpoch) {
        throw new Error('別の端末で記録が削除されました。現在の同期状況を確認してください。');
      }
      await saveJournal(current, { ...current.journal, epoch: confirmedEpoch, resetRequested: true });
    });
    await syncNow();
    if (current.journal.resetRequested) {
      await syncNow();
      if (current.journal.resetRequested) throw new Error('通信が回復したら削除を再試行します。');
    }
  }, [isActive, saveJournal, syncNow, syncTransaction]);

  const readRecovery = useCallback(async (before?: number, id?: number) => {
    const current = runtime.current, signedIn = account.current;
    if (!current || !isActive(current) || signedIn?.id !== current.accountId || current.journal.epoch === null) throw new Error('ログインして同期してから、もう一度お試しください。');
    const epoch = current.journal.epoch;
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15_000);
    try {
      const rows = await personalSyncRpc(signedIn, 'personal_record_recovery', {
        p_epoch: epoch, p_before: before ?? null, p_id: id ?? null,
      }, abort.signal);
      if (!isActive(current) || current.journal.epoch !== epoch) throw accountChanged();
      if (!Array.isArray(rows)) throw new Error('履歴を読み込めませんでした。');
      return rows as RecoveryEntry[];
    } finally { clearTimeout(timeout); }
  }, [isActive]);

  const restorePersonalRecovery = useCallback(async (id: number) => {
    const current = runtime.current;
    await syncNow();
    const [entry] = await readRecovery(undefined, id);
    if (!current || !entry || entry.value === null) throw new Error('この復旧履歴は利用できません。');
    await syncTransaction(current, async () => {
      if (!isActive(current)) throw accountChanged();
      const key = JSON.stringify(syncIdentity(entry.key));
      const next = queueSyncChanges(current.journal, [{ key, value: entry.value, deleted: false }]);
      await saveJournal(current, next, editVersion.current);
    });
    await syncNow();
  }, [isActive, readRecovery, saveJournal, syncNow, syncTransaction]);

  const value = useMemo(
    () => ({
      ...(stateOwner.current === storageKey ? state : initialState),
      hydrated: hydrated && (loadedKey === storageKey || Boolean(storageError)),
      storageError, guestImportAvailable, importGuestRecords, dismissGuestImport, retrySave, exportPersonalData, restorePersonalData, setLearningUnlimited, toggleReviewCase,
      startFreeEdition,
      toggleSaved,
      toggleSavedTheory,
      toggleSavedFeature,
      createLibraryFolder,
      renameLibraryFolder,
      deleteLibraryFolder,
      moveLibraryItem,
      addHistory,
      addFeatureHistory,
      saveNote,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
      updatePersonalMemo,
      removePersonalMemo,
      createPersonalMemoFolder,
      renamePersonalMemoFolder,
      deletePersonalMemoFolder,
      movePersonalMemo,
      answerLearningCase,
      resetLearningCase,
      clearPersonalData,
      syncStatus: loadedKey === storageKey ? syncStatus : userId ? 'waiting' as const : 'local' as const,
      lastSyncedAt: loadedKey === storageKey ? lastSyncedAt : null,
      hasUnsyncedRecords: loadedKey === storageKey && hasUnsyncedRecords,
      syncNow, acceptSyncNotice, clearCloudPersonalData, listPersonalRecovery: readRecovery, restorePersonalRecovery,
    }),
    [
      loadedKey, storageKey, storageError, guestImportAvailable, importGuestRecords, dismissGuestImport, retrySave, exportPersonalData, restorePersonalData, setLearningUnlimited, toggleReviewCase,
      state,
      hydrated,
      startFreeEdition,
      toggleSaved,
      toggleSavedTheory,
      toggleSavedFeature,
      createLibraryFolder,
      renameLibraryFolder,
      deleteLibraryFolder,
      moveLibraryItem,
      addHistory,
      addFeatureHistory,
      saveNote,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
      updatePersonalMemo,
      removePersonalMemo,
      createPersonalMemoFolder,
      renamePersonalMemoFolder,
      deletePersonalMemoFolder,
      movePersonalMemo,
      answerLearningCase,
      clearPersonalData, syncStatus, lastSyncedAt, hasUnsyncedRecords, syncNow, acceptSyncNotice, clearCloudPersonalData, readRecovery, restorePersonalRecovery, resetLearningCase, userId,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
