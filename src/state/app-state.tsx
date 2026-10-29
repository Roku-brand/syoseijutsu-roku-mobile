import AsyncStorage from '@react-native-async-storage/async-storage';
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
import type { CategoryKey } from '@/data/types';
import { resolveTheoryId } from '@/data/theory-taxonomy';
import { recordContentEvent } from '@/lib/content-events';
import { clearDiscoveryState } from '@/lib/discovery-storage';
import { libraryItemKey, type LibraryFolder, type LibraryItemKind } from './library-folders';
import { useAuth } from '@/auth/auth-state';
import { getLearningCase } from '@/data/learning';
import { hasPersonalRecords, LEGACY_PERSONAL_KEY, makePersonalBackup, mergePersonalData, normalizePersonalData, parsePersonalBackup, personalStorageKey } from './personal-data';

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
  clearPersonalData: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function haptic(style: Haptics.ImpactFeedbackStyle) {
  void Haptics.impactAsync(style).catch(() => undefined);
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const storageKey = personalStorageKey(user?.id);
  const activeKey = useRef(storageKey);
  const stateOwner = useRef(storageKey);
  activeKey.current = storageKey;
  const [state, setRawState] = useState(initialState);
  const loadedRef = useRef<string | null>(null);
  const queuedEdits = useRef<{ key: string; edit: SetStateAction<PersistedState> }[]>([]);
  const readVersion = useRef(0);
  const setState = useCallback((edit: SetStateAction<PersistedState>) => {
    if (loadedRef.current !== activeKey.current) queuedEdits.current.push({ key: activeKey.current, edit });
    setRawState(edit);
  }, []);
  const snapshot = useRef(state);
  snapshot.current = state;
  const [hydrated, setHydrated] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [guestImportAvailable, setGuestImportAvailable] = useState(false);
  const guestSnapshot = useRef<PersistedState | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const version = ++readVersion.current;
    loadedRef.current = null;
    queuedEdits.current = queuedEdits.current.filter(entry => entry.key === storageKey);
    stateOwner.current = storageKey;
    setRawState(initialState); setHydrated(false); setLoadedKey(null);
    setStorageError(null); setGuestImportAvailable(false); guestSnapshot.current = null;
    // A slow or failed read never writes defaults over the original records.
    const fallback = setTimeout(() => { if (active) { setHydrated(true); setStorageError('記録の読み込みに時間がかかっています。元の記録を保護したまま再試行できます。'); } }, STORAGE_HYDRATION_TIMEOUT_MS);
    void (async () => {
      try {
        await writes.current;
        const stored = await AsyncStorage.getItem(storageKey);
        if (!active || readVersion.current !== version) return;
        const original = stored ? normalizePersonalData(JSON.parse(stored), initialState) : initialState;
        const restored = queuedEdits.current.filter(entry => entry.key === storageKey).reduce((current, { edit }) => typeof edit === 'function' ? edit(current) : edit, original);
        queuedEdits.current = []; loadedRef.current = storageKey;
        setRawState(restored);
        setLoadedKey(storageKey);
        if (user && !stored) {
          const [guest, dismissed] = await Promise.all([
            AsyncStorage.getItem(LEGACY_PERSONAL_KEY), AsyncStorage.getItem(storageKey + '/guest-import'),
          ]);
          if (!active) return;
          if (guest && dismissed !== 'dismissed') {
            const data = normalizePersonalData(JSON.parse(guest), initialState);
            if (hasPersonalRecords(data)) { guestSnapshot.current = data; setGuestImportAvailable(true); }
          }
        }
      } catch {
        if (active) setStorageError('端末内の記録を読み込めませんでした。入力した内容は画面内に保持しています。');
      } finally {
        clearTimeout(fallback);
        if (active) setHydrated(true);
      }
    })();
    return () => { active = false; clearTimeout(fallback); };
  }, [authLoading, storageKey, user?.id]);

  useEffect(() => {
    if (!hydrated || loadedKey !== storageKey || authLoading) return;
    const json = JSON.stringify(state), key = storageKey;
    writes.current = writes.current.catch(() => undefined).then(async () => {
      try { await AsyncStorage.setItem(key, json); if (activeKey.current === key) setStorageError(null); }
      catch { if (activeKey.current === key) setStorageError('記録を端末に保存できませんでした。内容は画面内に残っています。'); }
    });
  }, [hydrated, loadedKey, storageKey, state, authLoading]);

  const retrySave = useCallback(async () => {
    const key = storageKey, current = stateOwner.current === storageKey ? snapshot.current : initialState;
    await writes.current;
    const old = await AsyncStorage.getItem(key);
    if (activeKey.current !== key) throw new Error('アカウントが変わりました。もう一度操作してください。');
    const next = old ? mergePersonalData(normalizePersonalData(JSON.parse(old), initialState), current) : current;
    readVersion.current++;
    await AsyncStorage.setItem(key, JSON.stringify(next));
    if (activeKey.current !== key) return;
    loadedRef.current = key; queuedEdits.current = []; setRawState(next); setLoadedKey(key); setStorageError(null);
  }, [storageKey]);
  const restorePersonalData = useCallback(async (json: string, mode: 'merge' | 'replace' = 'merge') => {
    const incoming = parsePersonalBackup(json, initialState), key = storageKey;
    await writes.current;
    if (activeKey.current !== key) throw new Error('アカウントが変わりました。もう一度操作してください。');
    readVersion.current++;
    const previous = loadedKey === key ? snapshot.current : normalizePersonalData(JSON.parse(await AsyncStorage.getItem(key) ?? '{}'), initialState);
    if (activeKey.current !== key) throw new Error('アカウントが変わりました。もう一度操作してください。');
    const next = mode === 'replace' ? incoming : mergePersonalData(incoming, previous);
    // Keep the previous snapshot locally for recovery before replacing anything.
    await AsyncStorage.setItem(key + '/before-restore', makePersonalBackup(previous));
    await AsyncStorage.setItem(key, JSON.stringify(next));
    if (activeKey.current !== key) return;
    loadedRef.current = key; queuedEdits.current = []; setRawState(next); setLoadedKey(key); setStorageError(null); setHydrated(true);
  }, [storageKey, loadedKey]);
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
  const setLearningUnlimited = useCallback((learningUnlimited: boolean) => setState(current => ({ ...current, learningUnlimited })), []);
  const toggleReviewCase = useCallback((id: string) => setState(current => ({ ...current, reviewCaseIds: current.reviewCaseIds.includes(id) ? current.reviewCaseIds.filter(key => key !== id) : [...current.reviewCaseIds, id] })), []);

  const startFreeEdition = useCallback((interests: CategoryKey[]) => {
    setState((current) => ({
      ...current,
      interests: interests.length ? interests : initialState.interests,
    }));
  }, []);

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
  }, []);

  const addHistory = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      historyIds: [id, ...current.historyIds.filter((item) => item !== id)].slice(
        0,
        100,
      ),
    }));
  }, []);

  const addFeatureHistory = useCallback((id: string) => {
    setState(current => ({ ...current, featureHistoryIds: [id, ...current.featureHistoryIds.filter(value => value !== id)].slice(0, 100) }));
  }, []);

  const createLibraryFolder = useCallback((name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return null;
    const id = `library-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setState(current => ({ ...current, libraryFolders: [...current.libraryFolders, { id, name: value, createdAt: new Date().toISOString() }] }));
    return id;
  }, []);
  const renameLibraryFolder = useCallback((id: string, name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return;
    setState(current => ({ ...current, libraryFolders: current.libraryFolders.map(folder => folder.id === id ? { ...folder, name: value } : folder) }));
  }, []);
  const deleteLibraryFolder = useCallback((id: string) => {
    setState(current => ({ ...current, libraryFolders: current.libraryFolders.filter(folder => folder.id !== id), libraryFolderByItem: Object.fromEntries(Object.entries(current.libraryFolderByItem).filter(([, folderId]) => folderId !== id)) }));
  }, []);
  const moveLibraryItem = useCallback((kind: LibraryItemKind, id: string, folderId: string | null) => {
    const key = libraryItemKey(kind, id);
    setState(current => {
      if (!(kind === 'feature' ? current.savedFeatureIds : kind === 'theory' ? current.savedTheoryIds : current.savedIds).includes(kind === 'theory' ? resolveTheoryId(id) : id)) return current;
      const libraryFolderByItem = { ...current.libraryFolderByItem };
      if (folderId && current.libraryFolders.some(folder => folder.id === folderId)) libraryFolderByItem[key] = folderId;
      else delete libraryFolderByItem[key];
      return { ...current, libraryFolderByItem };
    });
  }, []);

  const saveNote = useCallback((id: string, note: string) => {
    setState((current) => ({
      ...current,
      notes: { ...current.notes, [id]: note },
    }));
  }, []);

  const toggleInterest = useCallback((category: CategoryKey) => {
    setState((current) => {
      const exists = current.interests.includes(category);
      const interests = exists
        ? current.interests.filter((item) => item !== category)
        : [...current.interests, category];
      return { ...current, interests: interests.length ? interests : current.interests };
    });
  }, []);

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
  }, []);

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
  }, []);

  const updatePersonalPrinciple = useCallback((personalPrinciple: string) => {
    setState((current) => ({
      ...current,
      personalPrinciple: personalPrinciple.trim(),
    }));
  }, []);

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
  }, []);

  const removePersonalMemo = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.filter((memo) => memo.id !== id),
    }));
  }, []);

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
  }, []);

  const createPersonalMemoFolder = useCallback((name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return null;
    const id = `memo-folder-${Date.now()}`;
    setState((current) => ({
      ...current,
      personalMemoFolders: [...current.personalMemoFolders, { id, name: value, createdAt: new Date().toISOString() }],
    }));
    return id;
  }, []);

  const deletePersonalMemoFolder = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      personalMemoFolders: current.personalMemoFolders.filter((folder) => folder.id !== id),
      personalMemos: current.personalMemos.map((memo) => memo.folderId === id ? { ...memo, folderId: null } : memo),
    }));
  }, []);

  const renamePersonalMemoFolder = useCallback((id: string, name: string) => {
    const value = name.trim().slice(0, 32);
    if (!value) return;
    setState(current => ({ ...current, personalMemoFolders: current.personalMemoFolders.map(folder => folder.id === id ? { ...folder, name: value } : folder) }));
  }, []);

  const movePersonalMemo = useCallback((memoId: string, folderId: string | null) => {
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.map((memo) => memo.id === memoId ? {
        ...memo,
        folderId: folderId && current.personalMemoFolders.some((folder) => folder.id === folderId) ? folderId : null,
      } : memo),
    }));
  }, []);

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
  }, []);

  const resetLearningCase = useCallback((caseId: string) => {
    setState((current) => {
      const learningRecords = { ...current.learningRecords };
      delete learningRecords[caseId];
      return { ...current, learningRecords };
    });
  }, []);

  const clearPersonalData = useCallback(async () => {
    setState(initialState);
    await writes.current;
    await Promise.all([AsyncStorage.multiRemove([storageKey, storageKey + '/before-restore', storageKey + '/cloud-before-overwrite']), clearDiscoveryState()]);
  }, [storageKey]);

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
      clearPersonalData,
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
