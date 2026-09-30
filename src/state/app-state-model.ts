import type { CategoryKey } from '../data/types';

export const APP_STATE_STORAGE_KEY = '@shoseijutsu-roku/state/v1';
export const LEARNING_CURRICULUM_VERSION = 2;
const DEFAULT_INTERESTS: CategoryKey[] = ['interpersonal', 'work', 'life'];
const MAX_HISTORY = 100;
const MAX_MEMOS = 100;
const LEGACY_DATE = new Date(0).toISOString();

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
  historyIds: string[];
  notes: Record<string, string>;
  practiceRecords: Record<string, PracticeRecord>;
  personalPrinciple: string;
  personalMemos: PersonalMemo[];
  personalMemoFolders: PersonalMemoFolder[];
  learningRecords: Record<string, LearningRecord>;
};

export function createInitialAppState(): PersistedState {
  return {
    learningCurriculumVersion: LEARNING_CURRICULUM_VERSION,
    interests: [...DEFAULT_INTERESTS],
    savedIds: [],
    savedTheoryIds: [],
    historyIds: [],
    notes: {},
    practiceRecords: {},
    personalPrinciple: '志は高く、腰は低く。',
    personalMemos: [],
    personalMemoFolders: [],
    learningRecords: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function uniqueStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())))]
    : [];
}

function records<T>(value: unknown, decode: (item: Record<string, unknown>, id: string) => T | null): Record<string, T> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, item]) => {
    const decoded = isRecord(item) ? decode(item, id) : null;
    return decoded === null ? [] : [[id, decoded]];
  }));
}

/** Whitelist supported fields. Never trust the shape of device storage. */
export function restoreAppState(value: unknown, isKnownTheory: (id: string) => boolean): PersistedState {
  const initial = createInitialAppState();
  if (!isRecord(value)) return initial;
  const interests = uniqueStrings(value.interests);
  const folderIds = new Set<string>();
  const personalMemoFolders = Array.isArray(value.personalMemoFolders)
    ? value.personalMemoFolders.flatMap((folder): PersonalMemoFolder[] => {
      if (!isRecord(folder) || typeof folder.id !== 'string' || !folder.id || folderIds.has(folder.id) || typeof folder.name !== 'string') return [];
      folderIds.add(folder.id);
      return [{
        id: folder.id,
        name: folder.name.trim() || '無題のフォルダー',
        createdAt: typeof folder.createdAt === 'string' ? folder.createdAt : LEGACY_DATE,
      }];
    }) : [];
  const memoIds = new Set<string>();
  const personalMemos = Array.isArray(value.personalMemos)
    ? value.personalMemos.flatMap((memo, index): PersonalMemo[] => {
      const record = isRecord(memo) ? memo : {};
      const text = typeof memo === 'string' ? memo.trim() : typeof record.text === 'string' ? record.text.trim() : '';
      if (!text) return [];
      const id = typeof record.id === 'string' && record.id ? record.id : `${typeof memo === 'string' ? 'legacy-memo' : 'memo'}-${index}-${text.slice(0, 12)}`;
      if (memoIds.has(id)) return [];
      memoIds.add(id);
      return [{
        id,
        text,
        folderId: typeof record.folderId === 'string' && folderIds.has(record.folderId) ? record.folderId : null,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : LEGACY_DATE,
      }];
    }).slice(0, MAX_MEMOS) : [];
  return {
    ...initial,
    interests: interests.length ? interests : initial.interests,
    savedIds: uniqueStrings(value.savedIds),
    savedTheoryIds: uniqueStrings(value.savedTheoryIds).filter(isKnownTheory),
    historyIds: uniqueStrings(value.historyIds).slice(0, MAX_HISTORY),
    notes: isRecord(value.notes) ? Object.fromEntries(Object.entries(value.notes).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : {},
    practiceRecords: records<PracticeRecord>(value.practiceRecords, (item, cardId) => {
      if ((item.status !== 'planned' && item.status !== 'tried') || typeof item.plannedAt !== 'string') return null;
      return { cardId, status: item.status, plannedAt: item.plannedAt, ...(typeof item.triedAt === 'string' ? { triedAt: item.triedAt } : {}) };
    }),
    learningRecords: value.learningCurriculumVersion === LEARNING_CURRICULUM_VERSION
      ? records<LearningRecord>(value.learningRecords, (item, caseId) => {
        if ((item.choiceId !== 'a' && item.choiceId !== 'b' && item.choiceId !== 'c') || typeof item.answeredAt !== 'string') return null;
        return { caseId, choiceId: item.choiceId, answeredAt: item.answeredAt };
      }) : {},
    personalPrinciple: typeof value.personalPrinciple === 'string' ? value.personalPrinciple : initial.personalPrinciple,
    personalMemos,
    personalMemoFolders,
  };
}

export type AppStateAction =
  | { type: 'interests/set'; interests: CategoryKey[] }
  | { type: 'interests/toggle'; category: CategoryKey }
  | { type: 'saved/set' | 'theory/set'; id: string; saved: boolean }
  | { type: 'history/add'; id: string }
  | { type: 'note/save'; id: string; note: string }
  | { type: 'practice/plan' | 'practice/complete'; cardId: string; at: string }
  | { type: 'principle/set'; text: string }
  | { type: 'memo/add'; id: string; text: string; folderId: string | null; at: string }
  | { type: 'memo/update'; id: string; text: string; folderId: string | null }
  | { type: 'memo/remove' | 'folder/remove' | 'learning/reset'; id: string }
  | { type: 'memo/move'; id: string; folderId: string | null }
  | { type: 'folder/add'; id: string; name: string; at: string }
  | { type: 'learning/answer'; caseId: string; choiceId: LearningRecord['choiceId']; at: string };

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids];
}

function setSaved(ids: string[], id: string, saved: boolean) {
  if (!saved) return ids.filter((item) => item !== id);
  return ids.includes(id) ? ids : [id, ...ids];
}

function resolveFolder(state: PersistedState, id: string | null) {
  return id && state.personalMemoFolders.some((folder) => folder.id === id) ? id : null;
}

/** Pure transitions allow storage recovery to replay edits made while loading. */
export function reduceAppState(state: PersistedState, action: AppStateAction): PersistedState {
  switch (action.type) {
    case 'interests/set': {
      const interests = uniqueStrings(action.interests);
      return { ...state, interests: interests.length ? interests : [...DEFAULT_INTERESTS] };
    }
    case 'interests/toggle': {
      const interests = toggle(state.interests, action.category);
      return { ...state, interests: interests.length ? interests : state.interests };
    }
    case 'saved/set':
      return { ...state, savedIds: setSaved(state.savedIds, action.id, action.saved) };
    case 'theory/set':
      return { ...state, savedTheoryIds: setSaved(state.savedTheoryIds, action.id, action.saved) };
    case 'history/add':
      return {
        ...state,
        historyIds: [action.id, ...state.historyIds.filter((id) => id !== action.id)].slice(0, MAX_HISTORY),
      };
    case 'note/save':
      return { ...state, notes: { ...state.notes, [action.id]: action.note } };
    case 'principle/set':
      return { ...state, personalPrinciple: action.text.trim() };
    case 'practice/plan':
    case 'practice/complete':
      return {
        ...state,
        practiceRecords: {
          ...state.practiceRecords,
          [action.cardId]: {
            cardId: action.cardId,
            status: action.type === 'practice/plan' ? 'planned' : 'tried',
            plannedAt: state.practiceRecords[action.cardId]?.plannedAt ?? action.at,
            ...(action.type === 'practice/complete' ? { triedAt: action.at } : {}),
          },
        },
      };
    case 'memo/add': {
      const text = action.text.trim();
      if (!text) return state;
      const memo: PersonalMemo = {
        id: action.id,
        text,
        folderId: resolveFolder(state, action.folderId),
        createdAt: action.at,
      };
      return { ...state, personalMemos: [memo, ...state.personalMemos].slice(0, MAX_MEMOS) };
    }
    case 'memo/update': {
      const text = action.text.trim();
      if (!text) return state;
      return {
        ...state,
        personalMemos: state.personalMemos.map((memo) => memo.id === action.id
          ? { ...memo, text, folderId: resolveFolder(state, action.folderId) }
          : memo),
      };
    }
    case 'memo/remove':
      return { ...state, personalMemos: state.personalMemos.filter((memo) => memo.id !== action.id) };
    case 'memo/move':
      return {
        ...state,
        personalMemos: state.personalMemos.map((memo) => memo.id === action.id
          ? { ...memo, folderId: resolveFolder(state, action.folderId) }
          : memo),
      };
    case 'folder/add': {
      const name = action.name.trim().slice(0, 32);
      if (!name) return state;
      return {
        ...state,
        personalMemoFolders: [...state.personalMemoFolders, { id: action.id, name, createdAt: action.at }],
      };
    }
    case 'folder/remove':
      return {
        ...state,
        personalMemoFolders: state.personalMemoFolders.filter((folder) => folder.id !== action.id),
        personalMemos: state.personalMemos.map((memo) => memo.folderId === action.id ? { ...memo, folderId: null } : memo),
      };
    case 'learning/answer':
      return {
        ...state,
        learningRecords: {
          ...state.learningRecords,
          [action.caseId]: { caseId: action.caseId, choiceId: action.choiceId, answeredAt: action.at },
        },
      };
    case 'learning/reset': {
      const learningRecords = { ...state.learningRecords };
      delete learningRecords[action.id];
      return { ...state, learningRecords };
    }
  }
}
