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

type PersistedState = {
  learningCurriculumVersion: number;
  onboardingCompleted: boolean;
  interests: CategoryKey[];
  savedIds: string[];
  savedTheoryIds: string[];
  historyIds: string[];
  notes: Record<string, string>;
  collections: Collection[];
  practiceRecords: Record<string, PracticeRecord>;
  personalPrinciple: string;
  personalMemos: string[];
  learningRecords: Record<string, LearningRecord>;
};

const initialState: PersistedState = {
  learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
  onboardingCompleted: false,
  interests: CATEGORY_KEYS,
  savedIds: [],
  savedTheoryIds: [],
  historyIds: [],
  notes: {},
  collections: [],
  practiceRecords: {},
  personalPrinciple: '目的を守り、手段には執着しない。',
  personalMemos: [],
  learningRecords: {},
};

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  completeOnboarding: (interests: CategoryKey[]) => void;
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
  addPersonalMemo: (memo: string) => void;
  removePersonalMemo: (index: number) => void;
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
        setState({
          ...initialState,
          ...parsed,
          learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
          learningRecords,
          savedTheoryIds,
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

  const addPersonalMemo = useCallback((memo: string) => {
    const value = memo.trim();
    if (!value) return;
    haptic(Haptics.ImpactFeedbackStyle.Light);
    setState((current) => ({
      ...current,
      personalMemos: [value, ...current.personalMemos].slice(0, 100),
    }));
  }, []);

  const removePersonalMemo = useCallback((index: number) => {
    setState((current) => ({
      ...current,
      personalMemos: current.personalMemos.filter((_, itemIndex) => itemIndex !== index),
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
      answerLearningCase,
      resetLearningCase,
      clearPersonalData,
    }),
    [
      state,
      hydrated,
      completeOnboarding,
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
