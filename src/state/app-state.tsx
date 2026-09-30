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
import { recordContentEvent } from '@/lib/content-events';
import {
  APP_STATE_STORAGE_KEY,
  createInitialAppState,
  restoreAppState,
  reduceAppState,
  type AppStateAction,
  type PersistedState,
  type LearningRecord,
} from './app-state-model';
import { createStatePersistence } from './state-persistence';

export type { PracticeRecord, LearningRecord, PersonalMemo, PersonalMemoFolder } from './app-state-model';

type AppStateContextValue = PersistedState & {
  hydrated: boolean;
  startFreeEdition: (interests: CategoryKey[]) => void;
  toggleSaved: (id: string) => void;
  toggleSavedTheory: (id: string) => void;
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

let personalIdSequence = 0;
function personalId(prefix: string) {
  return prefix + '-' + Date.now() + '-' + (++personalIdSequence);
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const [persistence] = useState(() => createStatePersistence<PersistedState, AppStateAction>({
    storage: AsyncStorage,
    key: APP_STATE_STORAGE_KEY,
    initialState: createInitialAppState,
    restore: (stored) => restoreAppState(stored, (id) => theoryById.has(id)),
    reduce: reduceAppState,
    onError: (operation, error) => console.warn(
      'Personal state storage operation failed:',
      operation,
      error instanceof Error ? error.name : 'UnknownError',
    ),
  }));
  const [{ state, hydrated }, setSnapshot] = useState(persistence.getSnapshot);

  useEffect(() => {
    const unsubscribe = persistence.subscribe(setSnapshot);
    setSnapshot(persistence.getSnapshot());
    persistence.start();
    return unsubscribe;
  }, [persistence]);

  const startFreeEdition = useCallback((interests: CategoryKey[]) => {
    persistence.dispatch({ type: 'interests/set', interests });
  }, [persistence]);
  const toggleSaved = useCallback((id: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const saved = !persistence.getSnapshot().state.savedIds.includes(id);
    if (saved) void recordContentEvent('technique', id, 'save').catch(() => undefined);
    persistence.dispatch({ type: 'saved/set', id, saved });
  }, [persistence]);
  const toggleSavedTheory = useCallback((id: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    const saved = !persistence.getSnapshot().state.savedTheoryIds.includes(id);
    if (saved) void recordContentEvent('theory', id, 'save').catch(() => undefined);
    persistence.dispatch({ type: 'theory/set', id, saved });
  }, [persistence]);
  const addHistory = useCallback((id: string) => persistence.dispatch({ type: 'history/add', id }), [persistence]);
  const saveNote = useCallback((id: string, note: string) => persistence.dispatch({ type: 'note/save', id, note }), [persistence]);
  const toggleInterest = useCallback((category: CategoryKey) => persistence.dispatch({ type: 'interests/toggle', category }), [persistence]);
  const planPractice = useCallback((cardId: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    persistence.dispatch({ type: 'practice/plan', cardId, at: new Date().toISOString() });
  }, [persistence]);
  const completePractice = useCallback((cardId: string) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    persistence.dispatch({ type: 'practice/complete', cardId, at: new Date().toISOString() });
  }, [persistence]);
  const updatePersonalPrinciple = useCallback((text: string) => persistence.dispatch({ type: 'principle/set', text }), [persistence]);
  const addPersonalMemo = useCallback((text: string, folderId: string | null = null) => {
    if (!text.trim()) return;
    haptic(Haptics.ImpactFeedbackStyle.Light);
    persistence.dispatch({ type: 'memo/add', id: personalId('memo'), text, folderId, at: new Date().toISOString() });
  }, [persistence]);
  const updatePersonalMemo = useCallback((id: string, text: string, folderId: string | null) => persistence.dispatch({ type: 'memo/update', id, text, folderId }), [persistence]);
  const removePersonalMemo = useCallback((id: string) => persistence.dispatch({ type: 'memo/remove', id }), [persistence]);
  const createPersonalMemoFolder = useCallback((name: string) => {
    if (!name.trim()) return null;
    const id = personalId('memo-folder');
    persistence.dispatch({ type: 'folder/add', id, name, at: new Date().toISOString() });
    return id;
  }, [persistence]);
  const deletePersonalMemoFolder = useCallback((id: string) => persistence.dispatch({ type: 'folder/remove', id }), [persistence]);
  const movePersonalMemo = useCallback((id: string, folderId: string | null) => persistence.dispatch({ type: 'memo/move', id, folderId }), [persistence]);
  const answerLearningCase = useCallback((caseId: string, choiceId: LearningRecord['choiceId']) => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    persistence.dispatch({ type: 'learning/answer', caseId, choiceId, at: new Date().toISOString() });
  }, [persistence]);
  const resetLearningCase = useCallback((id: string) => persistence.dispatch({ type: 'learning/reset', id }), [persistence]);
  const clearPersonalData = useCallback(() => persistence.clear(), [persistence]);

  const value = useMemo(() => ({
    ...state, hydrated, startFreeEdition, toggleSaved, toggleSavedTheory, addHistory, saveNote,
    planPractice, completePractice, toggleInterest, updatePersonalPrinciple, addPersonalMemo,
    updatePersonalMemo, removePersonalMemo, createPersonalMemoFolder, deletePersonalMemoFolder,
    movePersonalMemo, answerLearningCase, resetLearningCase, clearPersonalData,
  }), [
    state, hydrated, startFreeEdition, toggleSaved, toggleSavedTheory, addHistory, saveNote,
    planPractice, completePractice, toggleInterest, updatePersonalPrinciple, addPersonalMemo,
    updatePersonalMemo, removePersonalMemo, createPersonalMemoFolder, deletePersonalMemoFolder,
    movePersonalMemo, answerLearningCase, resetLearningCase, clearPersonalData,
  ]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
