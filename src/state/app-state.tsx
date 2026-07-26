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

const STORAGE_KEY = '@shoseijutsu-roku/state/v1';
const CATEGORY_KEYS: CategoryKey[] = ['interpersonal', 'work', 'life'];

export type Collection = {
  id: string;
  name: string;
  cardIds: string[];
  createdAt: string;
};

type PersistedState = {
  onboardingCompleted: boolean;
  interests: CategoryKey[];
  savedIds: string[];
  historyIds: string[];
  notes: Record<string, string>;
  collections: Collection[];
};

const initialState: PersistedState = {
  onboardingCompleted: false,
  interests: CATEGORY_KEYS,
  savedIds: [],
  historyIds: [],
  notes: {},
  collections: [],
};

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  completeOnboarding: (interests: CategoryKey[]) => void;
  toggleSaved: (id: string) => void;
  addHistory: (id: string) => void;
  saveNote: (id: string, note: string) => void;
  createCollection: (name: string) => string;
  toggleCollectionCard: (collectionId: string, cardId: string) => void;
  deleteCollection: (collectionId: string) => void;
  toggleInterest: (category: CategoryKey) => void;
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
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<PersistedState>;
        const interests = (parsed.interests ?? []).filter(
          (interest): interest is CategoryKey =>
            CATEGORY_KEYS.includes(interest as CategoryKey),
        );
        setState({
          ...initialState,
          ...parsed,
          interests: interests.length ? interests : initialState.interests,
        });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
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
      addHistory,
      saveNote,
      createCollection,
      toggleCollectionCard,
      deleteCollection,
      toggleInterest,
      clearPersonalData,
    }),
    [
      state,
      hydrated,
      completeOnboarding,
      toggleSaved,
      addHistory,
      saveNote,
      createCollection,
      toggleCollectionCard,
      deleteCollection,
      toggleInterest,
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
