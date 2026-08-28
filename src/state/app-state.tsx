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
import { theoryById } from '@/data/catalog';

const STORAGE_KEY = '@shoseijutsu-roku/state/v1';
const STORAGE_HYDRATION_TIMEOUT_MS = 900;
const LEARNING_CURRICULUM_VERSION = 2;
const CATEGORY_KEYS: CategoryKey[] = ['interpersonal', 'work', 'life'];

export type Collection = {
  id: string;
  name: string;
  cardIds: string[];
  createdAt: string;
};

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
  onboardingCompleted: boolean;
  welcomePageHidden: boolean;
  interests: CategoryKey[];
  savedIds: string[];
  savedTheoryIds: string[];
  historyIds: string[];
  notes: Record<string, string>;
  collections: Collection[];
  practiceRecords: Record<string, PracticeRecord>;
  personalPrinciple: string;
  personalMemos: PersonalMemo[];
  personalMemoFolders: PersonalMemoFolder[];
  learningRecords: Record<string, LearningRecord>;
};

const initialState: PersistedState = {
  learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
  onboardingCompleted: false,
  welcomePageHidden: false,
  interests: CATEGORY_KEYS,
  savedIds: [],
  savedTheoryIds: [],
  historyIds: [],
  notes: {},
  collections: [],
  practiceRecords: {},
  personalPrinciple: '目的を守り、手段には執着しない。',
  personalMemos: [],
  personalMemoFolders: [],
  learningRecords: {},
};

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  completeOnboarding: (interests: CategoryKey[]) => void;
  setWelcomePageHidden: (hidden: boolean) => void;
  toggleSaved: (id: string) => void;
  toggleSavedTheory: (id: string) => void;
  addHistory: (id: string) => void;
  saveNote: (id: string, note: string) => void;
  createCollection: (name: string) => string;
  toggleCollectionCard: (collectionId: string, cardId: string) => void;
  deleteCollection: (collectionId: string) => void;
  planPractice: (cardId: string) => void;
  completePractice: (cardId: string) => void;
  toggleInterest: (category: CategoryKey) => void;
  updatePersonalPrinciple: (principle: string) => void;
  addPersonalMemo: (memo: string, folderId?: string | null) => void;
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
        const parsed = JSON.parse(stored) as Partial<PersistedState>;
        const interests = (parsed.interests ?? []).filter(
          (interest): interest is CategoryKey =>
            CATEGORY_KEYS.includes(interest as CategoryKey),
        );
        if (!active) return;
        const savedTheoryIds = Array.isArray(parsed.savedTheoryIds)
          ? parsed.savedTheoryIds.filter((id): id is string => typeof id === 'string' && theoryById.has(id))
          : [];
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
          ...parsed,
          learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
          learningRecords,
          savedTheoryIds,
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

  const completeOnboarding = useCallback((interests: CategoryKey[]) => {
    setState((current) => ({
      ...current,
      onboardingCompleted: true,
      interests: interests.length ? interests : initialState.interests,
    }));
  }, []);

  const setWelcomePageHidden = useCallback((hidden: boolean) => {
    setState((current) => ({ ...current, welcomePageHidden: hidden }));
  }, []);

  const toggleSaved = useCallback((id: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setState((current) => ({
      ...current,
      savedIds: current.savedIds.includes(id)
        ? current.savedIds.filter((savedId) => savedId !== id)
        : [id, ...current.savedIds],
    }));
  }, []);

  const toggleSavedTheory = useCallback((id: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    setState((current) => ({
      ...current,
      savedTheoryIds: current.savedTheoryIds.includes(id)
        ? current.savedTheoryIds.filter((savedId) => savedId !== id)
        : [id, ...current.savedTheoryIds],
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

  const saveNote = useCallback((id: string, note: string) => {
    setState((current) => ({
      ...current,
      notes: { ...current.notes, [id]: note },
    }));
  }, []);

  const createCollection = useCallback((name: string) => {
    const id = `collection-${Date.now()}`;
    setState((current) => ({
      ...current,
      collections: [
        ...current.collections,
        { id, name: name.trim(), cardIds: [], createdAt: new Date().toISOString() },
      ],
    }));
    return id;
  }, []);

  const toggleCollectionCard = useCallback(
    (collectionId: string, cardId: string) => {
      haptic(Haptics.ImpactFeedbackStyle.Light);
      setState((current) => ({
        ...current,
        collections: current.collections.map((collection) =>
          collection.id !== collectionId
            ? collection
            : {
                ...collection,
                cardIds: collection.cardIds.includes(cardId)
                  ? collection.cardIds.filter((id) => id !== cardId)
                  : [cardId, ...collection.cardIds],
              },
        ),
      }));
    },
    [],
  );

  const deleteCollection = useCallback((collectionId: string) => {
    setState((current) => ({
      ...current,
      collections: current.collections.filter(
        (collection) => collection.id !== collectionId,
      ),
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
      personalPrinciple:
        personalPrinciple.trim() || initialState.personalPrinciple,
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
    setState({ ...initialState, onboardingCompleted: true });
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      completeOnboarding,
      setWelcomePageHidden,
      toggleSaved,
      toggleSavedTheory,
      addHistory,
      saveNote,
      createCollection,
      toggleCollectionCard,
      deleteCollection,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
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
      completeOnboarding,
      setWelcomePageHidden,
      toggleSaved,
      toggleSavedTheory,
      addHistory,
      saveNote,
      createCollection,
      toggleCollectionCard,
      deleteCollection,
      planPractice,
      completePractice,
      toggleInterest,
      updatePersonalPrinciple,
      addPersonalMemo,
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
