import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type SetStateAction,
  type PropsWithChildren,
} from 'react';
import type { CategoryKey } from '@/data/types';
import { resolveTheoryId, resolveTheoryIds } from '@/data/theory-taxonomy';
import { recordContentEvent } from '@/lib/content-events';
import { createStatePersistence } from './state-persistence';
import { restoreAppState } from './app-state-model';
import { libraryItemKey, restoreLibraryFolders, type LibraryFolder, type LibraryItemKind } from './library-folders';

const STORAGE_KEY = '@shoseijutsu-roku/state/v1';
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

type PersistedState = {
  learningCurriculumVersion: number;
  interests: CategoryKey[];
  savedIds: string[];
  savedTheoryIds: string[];
  libraryFolders: LibraryFolder[];
  libraryFolderByItem: Record<string, string>;
  historyIds: string[];
  notes: Record<string, string>;
  practiceRecords: Record<string, PracticeRecord>;
  personalPrinciple: string;
  personalMemos: PersonalMemo[];
  personalMemoFolders: PersonalMemoFolder[];
  learningRecords: Record<string, LearningRecord>;
};

const initialState: PersistedState = {
  learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
  interests: CATEGORY_KEYS,
  savedIds: [],
  savedTheoryIds: [],
  libraryFolders: [],
  libraryFolderByItem: {},
  historyIds: [],
  notes: {},
  practiceRecords: {},
  personalPrinciple: '志は高く、腰は低く。',
  personalMemos: [],
  personalMemoFolders: [],
  learningRecords: {},
};

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  startFreeEdition: (interests: CategoryKey[]) => void;
  toggleSaved: (id: string) => void;
  toggleSavedTheory: (id: string) => void;
  createLibraryFolder: (name: string) => string | null;
  renameLibraryFolder: (id: string, name: string) => void;
  deleteLibraryFolder: (id: string) => void;
  moveLibraryItem: (kind: LibraryItemKind, id: string, folderId: string | null) => void;
  addHistory: (id: string) => void;
  saveNote: (id: string, note: string) => void;
  planPractice: (cardId: string) => void;
  completePractice: (cardId: string) => void;
  toggleInterest: (category: CategoryKey) => void;
  updatePersonalPrinciple: (principle: string) => void;
  addPersonalMemo: (memo: string, folderId?: string | null) => void;
  updatePersonalMemo: (id: string, text: string, folderId: string | null) => void;
  removePersonalMemo: (id: string) => void;
  createPersonalMemoFolder: (name: string) => string | null;
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
  const [persistence] = useState(() => createStatePersistence<PersistedState, SetStateAction<PersistedState>>({
    storage: AsyncStorage, key: STORAGE_KEY, initialState: () => initialState, persistRestoredState: true,
    restore: value => {
      const restored = restoreAppState(value, () => true);
      const raw = value && typeof value === 'object' ? value as Partial<PersistedState> : {};
      const savedTheoryIds = resolveTheoryIds(restored.savedTheoryIds);
      return { ...initialState, ...restored, savedTheoryIds, historyIds: resolveTheoryIds(restored.historyIds),
        ...restoreLibraryFolders(raw.libraryFolders, raw.libraryFolderByItem, restored.savedIds, savedTheoryIds) };
    },
    reduce: (current, action) => typeof action === 'function' ? action(current) : action,
    onError: (operation, error) => console.warn('Personal state storage ' + operation + ' failed', error),
  }));
  const [snapshot, setSnapshot] = useState(persistence.getSnapshot);
  const { state, hydrated } = snapshot;
  const setState = useCallback((action: SetStateAction<PersistedState>) => persistence.dispatch(action), [persistence]);
  useEffect(() => {
    const unsubscribe = persistence.subscribe(setSnapshot);
    setSnapshot(persistence.getSnapshot());
    persistence.start();
    return unsubscribe;
  }, [persistence]);

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

  const addHistory = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      historyIds: [id, ...current.historyIds.filter((item) => item !== id)].slice(
        0,
        100,
      ),
    }));
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
      if (!(kind === 'theory' ? current.savedTheoryIds : current.savedIds).includes(kind === 'theory' ? resolveTheoryId(id) : id)) return current;
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

  const addPersonalMemo = useCallback((memo: string, folderId: string | null = null) => {
    const value = memo.trim();
    if (!value) return;
    haptic(Haptics.ImpactFeedbackStyle.Light);
    setState((current) => ({
      ...current,
      personalMemos: [{
        id: `memo-${Date.now()}`,
        text: value,
        folderId: folderId && current.personalMemoFolders.some((folder) => folder.id === folderId) ? folderId : null,
        createdAt: new Date().toISOString(),
      }, ...current.personalMemos].slice(0, 100),
    }));
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
    await persistence.clear();
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      startFreeEdition,
      toggleSaved,
      toggleSavedTheory,
      createLibraryFolder,
      renameLibraryFolder,
      deleteLibraryFolder,
      moveLibraryItem,
      addHistory,
      saveNote,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
      updatePersonalMemo,
      removePersonalMemo,
      createPersonalMemoFolder,
      deletePersonalMemoFolder,
      movePersonalMemo,
      answerLearningCase,
      resetLearningCase,
      clearPersonalData,
    }),
    [
      state,
      hydrated,
      startFreeEdition,
      toggleSaved,
      toggleSavedTheory,
      createLibraryFolder,
      renameLibraryFolder,
      deleteLibraryFolder,
      moveLibraryItem,
      addHistory,
      saveNote,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
      updatePersonalMemo,
      removePersonalMemo,
      createPersonalMemoFolder,
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
