import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { techniqueCards, theories } from '@/data/catalog';
import { HOME_DECK_SELECTION_SIZE, HOME_DECK_SIZE } from '@/data/deck-motion';
import { isDiscoveryFilter, matchesDiscoveryFilter, type DiscoveryFilter } from '@/data/discovery-filter';
import { getHomeDayKey } from '@/data/home-brand-content';
import { drawHomeDeck } from '@/data/home-deck-selection';
import { HOME_RECOMMENDED_THEORY_IDS, readingContentId, type ReadingContent } from '@/data/reading-recommendations';
import { isLockedTheoryShell } from '@/data/theory-display';
import { groupTheorySections } from '@/data/theory-taxonomy';
import { onDiscoveryReset, readDiscoveryState, writeDiscoveryState } from '@/lib/discovery-storage';
import { hydratePublishedCache } from '@/lib/published-content';

type Group = { id: string; order: string[]; categoryId: string; name: string } & (
  { type: 'persona' } | { type: 'theory'; subcategoryId: string; categoryTitle: string }
);
export type HomeDeckCover = { type: 'cover'; group: Group; preview: ReadingContent; title: string };
export type HomeDeckCard = ReadingContent | HomeDeckCover;
type DeckState = { day: number; round: number; groupId: string; order: string[]; cursor: number; offset: number; filter: DiscoveryFilter };

const discoveryKey = (item: ReadingContent) => `${item.type}:${readingContentId(item)}`;

function accessibleCatalog(scope: string) {
  const items = new Map<string, ReadingContent>();
  const groups = new Map<string, Group>();
  for (const card of techniqueCards) {
    const name = card.subcategory.trim();
    if (!name || card.status === 'locked' || card.title === '完全版の処世術' || (scope !== 'paid' && !FREE_TECHNIQUE_IDS.has(card.id))) continue;
    const item = { type: 'technique', card } as const;
    const key = discoveryKey(item);
    const id = JSON.stringify(['persona', card.categoryKey, name]);
    const group = groups.get(id) ?? { type: 'persona', id, name, categoryId: card.categoryKey, order: [] };
    group.order.push(key);
    groups.set(id, group);
    items.set(key, item);
  }

  const readableTheories = theories.filter(card => HOME_RECOMMENDED_THEORY_IDS.has(card.tagId) && !isLockedTheoryShell(card) && (scope === 'paid' || FREE_THEORY_ID_SET.has(card.tagId)));
  for (const section of groupTheorySections(readableTheories)) {
    if (section.subcategoryId === 'unassigned') continue;
    const { categoryId, categoryTitle, subcategoryId, title: name } = section;
    const id = JSON.stringify(['theory', categoryId, subcategoryId]);
    const order = section.items.map(card => {
      const item = { type: 'theory', card } as const;
      const key = discoveryKey(item);
      items.set(key, item);
      return key;
    });
    groups.set(id, { type: 'theory', id, categoryId, categoryTitle, subcategoryId, name, order });
  }
  return { items, groups };
}

type Catalog = ReturnType<typeof accessibleCatalog>;

function draw(catalog: Catalog, filter: DiscoveryFilter, day: number, round = 0, previousGroup?: string): DeckState {
  const groups = [...catalog.groups.values()].filter(group => matchesDiscoveryFilter(catalog.items.get(group.order[0])!, filter));
  const picked = drawHomeDeck(groups, HOME_DECK_SELECTION_SIZE, previousGroup);
  return { day, round, filter, groupId: picked?.groupId ?? '', order: picked?.order ?? [], cursor: 0, offset: 0 };
}

function getGroup(catalog: Catalog, state: DeckState) {
  const group = catalog.groups.get(state.groupId);
  const first = catalog.items.get(state.order[0]);
  if (!group || !first || !matchesDiscoveryFilter(first, state.filter) || !state.order.every(id => group.order.includes(id))) return null;
  return group;
}

function readSavedDeck(raw: string | null, day: number) {
  try {
    const value = raw ? JSON.parse(raw) : null;
    const filter = isDiscoveryFilter(value?.filter) ? value.filter : 'all';
    if (value?.day === day && typeof value.groupId === 'string' && Number.isSafeInteger(value.round) && value.round >= 0
      && Array.isArray(value.order) && value.order.length === HOME_DECK_SELECTION_SIZE && new Set(value.order).size === HOME_DECK_SELECTION_SIZE
      && value.order.every((id: unknown) => typeof id === 'string')
      && Number.isInteger(value.cursor) && value.cursor >= 0 && value.cursor < HOME_DECK_SIZE) {
      const offset = Number.isSafeInteger(value.offset) && value.offset >= 0 ? value.offset : 0;
      const saved: DeckState = { day, filter, groupId: value.groupId, round: value.round, order: value.order, cursor: value.cursor, offset };
      return { filter, saved };
    }
    return { filter };
  } catch {
    return { filter: 'all' as const };
  }
}

/** Keep the current draw while navigating. Storage contains IDs, never paid content. */
export function useHomeDiscovery() {
  const { accessState, catalogRevision, secureContentStatus, refreshPublishedContent } = useAccess();
  const scope = accessState === 'paid' ? 'paid' : 'free';
  const [state, setState] = useState<DeckState | null>(null);
  const [retry, setRetry] = useState(0);
  const [restoredRevision, setRestoredRevision] = useState(0);
  const current = useRef<DeckState | null>(null);
  const readyScope = useRef<string | null>(null);
  const catalog = useMemo(() => accessibleCatalog(scope), [scope, catalogRevision, restoredRevision]);
  const latest = useRef({ catalog, refreshPublishedContent });
  latest.current = { catalog, refreshPublishedContent };

  const commit = useCallback((next: DeckState) => {
    current.current = next;
    setState(next);
  }, []);
  const reload = useCallback(() => {
    readyScope.current = null;
    current.current = null;
    setState(null);
    setRetry(value => value + 1);
  }, []);
  useEffect(() => onDiscoveryReset(reload), [reload]);
  useEffect(() => {
    let active = true;
    readyScope.current = null;
    current.current = null;
    setState(null);
    const day = getHomeDayKey();
    void (async () => {
      const { filter, saved } = readSavedDeck(await readDiscoveryState(scope).catch(() => null), day);
      if (!active) return;
      let available = latest.current.catalog;
      if (saved && !getGroup(available, saved)) {
        // A restored draw can refer to records supplied by the CMS or paid catalogue.
        await hydratePublishedCache().catch(() => undefined);
        if (!active) return;
        available = accessibleCatalog(scope);
        if (!getGroup(available, saved)) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            latest.current.refreshPublishedContent({ reuseInFlight: true }).catch(() => false),
            new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 6000); }),
          ]);
          clearTimeout(timeout);
          if (!active) return;
          available = accessibleCatalog(scope);
        }
        setRestoredRevision(value => value + 1);
      }
      readyScope.current = scope;
      commit(saved && getGroup(available, saved) ? saved : draw(available, filter, day));
    })();
    return () => { active = false; };
  }, [commit, retry, scope]);

  useEffect(() => {
    if (!state || readyScope.current !== scope) return;
    if (!getGroup(catalog, state)) {
      const replacement = draw(catalog, state.filter, state.day, state.round);
      if (replacement.order.length) commit(replacement);
      return;
    }
    writeDiscoveryState(scope, state);
  }, [catalog, commit, scope, state]);

  const shuffle = useCallback((filter?: DiscoveryFilter) => {
    const old = current.current;
    if (!old) return;
    commit(draw(latest.current.catalog, filter ?? old.filter, getHomeDayKey(), old.round + 1, old.groupId));
  }, [commit]);
  const move = useCallback((direction: number) => {
    const old = current.current;
    if (!old?.order.length) return;
    const position = old.offset + old.cursor + direction;
    const cursor = (position + HOME_DECK_SIZE) % HOME_DECK_SIZE;
    commit({ ...old, cursor, offset: Math.max(0, position - cursor) });
  }, [commit]);

  const ready = state && readyScope.current === scope ? state : null;
  const group = ready && getGroup(catalog, ready);
  const preview = group && ready && catalog.items.get(ready.order[0]);
  const cover: HomeDeckCover | null = group && preview ? {
    type: 'cover', group, preview,
    title: `${group.type === 'persona' ? group.name : `${group.categoryTitle}（${group.name}）`} ${HOME_DECK_SELECTION_SIZE}選`,
  } : null;
  const items: (HomeDeckCard | null)[] = cover ? [cover, ...ready!.order.map(id => catalog.items.get(id) ?? null)] : [];
  const waitingForSecure = scope === 'paid' && (secureContentStatus === 'idle' || secureContentStatus === 'loading') && !cover;
  return { items, filter: ready?.filter ?? 'all', cursor: ready?.cursor ?? 0, position: (ready?.offset ?? 0) + (ready?.cursor ?? 0),
    loading: !ready || waitingForSecure, error: !!ready && !cover && !waitingForSecure, shuffle, move, retry: reload };
}
