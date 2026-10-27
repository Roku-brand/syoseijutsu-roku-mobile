import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { CategoryKey } from '@/data/types';
import { resolveTheoryId, resolveTheoryIds } from '@/data/theory-taxonomy';
import { recordContentEvent } from '@/lib/content-events';
import { clearDiscoveryState } from '@/lib/discovery-storage';
import { libraryItemKey, restoreLibraryFolders, type LibraryFolder, type LibraryItemKind } from './library-folders';

const STORAGE_KEY = '@shoseijutsu-roku/state/v1';
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

type PersistedState = {
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
};

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
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
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    // AsyncStorage can be unavailable or stall in a browser privacy mode.
    // Release the app with the safe default, while still accepting a late
    // result when the storage implementation recovers.
    const fallback = setTimeout(() => {
      if (active) setHydrated(true);
    }, STORAGE_HYDRATION_TIMEOUT_MS);
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<PersistedState> & {
          contentActivity?: unknown;
          welcomePageHidden?: unknown;
          homeWelcomeSeen?: unknown;
          homeWelcomePending?: unknown;
          homeImpressions?: unknown;
          onboardingCompleted?: unknown;
          collections?: unknown;
        };
        const supportedState = { ...parsed, historyIds: resolveTheoryIds(parsed.historyIds) };
        delete supportedState.contentActivity;
        delete supportedState.welcomePageHidden;
        delete supportedState.homeWelcomeSeen;
        delete supportedState.homeWelcomePending;
        delete supportedState.homeImpressions;
        delete supportedState.onboardingCompleted;
        delete supportedState.collections;
        const interests = (parsed.interests ?? []).filter(
          (interest): interest is CategoryKey =>
            CATEGORY_KEYS.includes(interest as CategoryKey),
        );
        if (!active) return;
        const savedTheoryIds = resolveTheoryIds(parsed.savedTheoryIds);
        const learningRecords = parsed.learningCurriculumVersion === LEARNING_CURRICULUM_VERSION
          ? parsed.learningRecords ?? {}
          : {};
        const personalMemos = Array.isArray(parsed.personalMemos)
          ? (parsed.personalMemos as unknown[])
            .map((memo, index): PersonalMemo | null => {
              if (typeof memo === 'string') {
                const text = memo.trim();
                return text ? {
                  id: `legacy-memo-${index}-${text.slice(0, 12)}`,
                  text,
                  folderId: null,
                  createdAt: new Date(0).toISOString(),
                } : null;
              }
              if (!memo || typeof memo !== 'object') return null;
              const value = memo as Partial<PersonalMemo>;
              const text = typeof value.text === 'string' ? value.text.trim() : '';
              return text ? {
                id: typeof value.id === 'string' && value.id ? value.id : `memo-${index}-${text.slice(0, 12)}`,
                text,
                folderId: typeof value.folderId === 'string' ? value.folderId : null,
                createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date(0).toISOString(),
              } : null;
            })
            .filter((memo): memo is PersonalMemo => memo !== null)
          : [];
        const personalMemoFolders = Array.isArray(parsed.personalMemoFolders)
          ? parsed.personalMemoFolders
            .filter((folder): folder is PersonalMemoFolder => Boolean(
              folder
              && typeof folder === 'object'
              && typeof (folder as PersonalMemoFolder).id === 'string'
              && typeof (folder as PersonalMemoFolder).name === 'string',
            ))
            .map((folder) => ({
              id: folder.id,
              name: folder.name.trim() || '無題のフォルダー',
              createdAt: typeof folder.createdAt === 'string' ? folder.createdAt : new Date(0).toISOString(),
            }))
          : [];
        setState({
          ...initialState,
          ...supportedState,
          learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
          learningRecords,
          savedTheoryIds,
          featureHistoryIds: Array.isArray(parsed.featureHistoryIds) ? [...new Set(parsed.featureHistoryIds.filter((id): id is string => typeof id === 'string'))].slice(0, 100) : [],
          savedFeatureIds: Array.isArray(parsed.savedFeatureIds) ? parsed.savedFeatureIds.filter(id => typeof id === 'string') : [],
          ...restoreLibraryFolders(parsed.libraryFolders, parsed.libraryFolderByItem, parsed.savedIds ?? [], savedTheoryIds, Array.isArray(parsed.savedFeatureIds) ? parsed.savedFeatureIds.filter(id => typeof id === 'string') : []),
          personalMemos,
          personalMemoFolders,
          interests: interests.length ? interests : initialState.interests,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(fallback);
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

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
    await Promise.all([AsyncStorage.removeItem(STORAGE_KEY), clearDiscoveryState()]);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
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
      resetLearningCase,
      clearPersonalData,
    }),
    [
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
