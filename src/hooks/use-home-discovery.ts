import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { techniqueCards, theories } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import { useAppState } from '@/state/app-state';
import { getHomeDayKey } from '@/data/home-brand-content';
import { buildReadingRecommendations, readingContentId, type ReadingContent } from '@/data/reading-recommendations';
import { onDiscoveryReset, readDiscoveryState, writeDiscoveryState } from '@/lib/discovery-storage';

type DeckState = { day: number; round: number; order: string[]; cursor: number; seen: string[]; offset?: number };
export const HOME_DECK_SIZE = 5;
export const discoveryKey = (item: ReadingContent) => `${item.type}:${readingContentId(item)}`;

/** Persist IDs, never paid content. Freeze a day's deck for the mounted visit. */
export function useHomeDiscovery() {
  const { accessState, catalogRevision } = useAccess();
  const signals = useAppState();
  const scope = accessState === 'paid' ? 'paid' : 'free';
  const [state, setState] = useState<DeckState | null>(null);
  const [retry, setRetry] = useState(0);
  const current = useRef(state);
  const readyScope = useRef<string | null>(null);
  useEffect(() => onDiscoveryReset(() => {
    readyScope.current = null;
    current.current = null;
    setRetry(value => value + 1);
  }), []);
  current.current = state;
  const latest = useRef({ signals, scope });
  latest.current = { signals, scope };
  const generate = useCallback((day: number, round: number, seen: string[], excludeIds: string[] = []) => buildReadingRecommendations({
    accessState: latest.current.scope, ...latest.current.signals, seed: `${day}:${round}`, seenIds: seen, excludeIds, count: HOME_DECK_SIZE,
  }), []);
  const byKey = useMemo(() => {
    const items: ReadingContent[] = [
      ...techniqueCards.filter(card => card.status !== 'locked' && card.title !== '完全版の処世術' && (scope === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))).map(card => ({ type: 'technique' as const, card })),
      ...theories.filter(card => !isLockedTheoryShell(card) && (scope === 'paid' || FREE_THEORY_ID_SET.has(card.tagId))).map(card => ({ type: 'theory' as const, card })),
    ];
    return new Map(items.map(item => [discoveryKey(item), item]));
  }, [scope, catalogRevision]);
  const catalog = useRef(byKey);
  catalog.current = byKey;
  useEffect(() => {
    if (!signals.hydrated) return;
    let active = true;
    readyScope.current = null;
    setState(null);
    const day = getHomeDayKey();
    // Reads follow writes so an immediate remount cannot restore stale state.
    void readDiscoveryState(scope).catch(() => null).then(raw => {
      if (!active) return;
      let stored: DeckState | undefined;
      try {
        const value = raw ? JSON.parse(raw) : null;
        if (value && Number.isInteger(value.day) && Number.isInteger(value.round) && value.round >= 0
          && Array.isArray(value.order) && value.order.length <= 500 && value.order.every((id: unknown) => typeof id === 'string')
          && Array.isArray(value.seen) && value.seen.every((id: unknown) => typeof id === 'string')
          && Number.isInteger(value.cursor) && value.cursor >= 0 && value.cursor < value.order.length) stored = value;
      } catch { /* A damaged cache is replaced by a usable daily deck. */ }
      const seen = stored?.seen.slice(-120) ?? [];
      let order = stored?.day === day ? [...new Set(stored.order.filter(id => catalog.current.has(id)))] : [];
      const cursor = stored ? stored.order.slice(0, stored.cursor).filter(id => catalog.current.has(id)).length : 0;
      // Migrate the former long queue without losing the card being read.
      const migrating = stored?.order.length !== HOME_DECK_SIZE || order.length !== HOME_DECK_SIZE;
      if (migrating && order.length) {
        const currentId = stored!.order[stored!.cursor];
        const start = Math.max(0, order.indexOf(currentId));
        order = [...order.slice(start), ...order.slice(0, start)].slice(0, HOME_DECK_SIZE);
        if (order.length < HOME_DECK_SIZE) order.push(...generate(day, stored!.round, seen, order).map(discoveryKey).slice(0, HOME_DECK_SIZE - order.length));
      }
      const offset = stored && Number.isSafeInteger(stored.offset) && stored.offset! >= 0 ? stored.offset! : 0;
      const next = order.length ? { ...stored!, order, cursor: migrating ? 0 : Math.min(cursor, order.length - 1), offset: migrating ? 0 : offset, seen }
        : { day, round: 0, cursor: 0, order: generate(day, 0, seen).map(discoveryKey), seen };
      if (next.order[next.cursor] && !next.seen.includes(next.order[next.cursor])) next.seen = [...seen, next.order[next.cursor]].slice(-120);
      current.current = next;
      readyScope.current = scope;
      setState(next);
    });
    return () => { active = false; };
  }, [signals.hydrated, scope, retry, generate]);
  useEffect(() => {
    if (!state || readyScope.current !== scope) return;
    writeDiscoveryState(scope, state);
  }, [state, scope]);
  const commit = useCallback((next: DeckState) => { current.current = next; setState(next); }, []);
  const shuffle = useCallback(() => {
    const old = current.current;
    if (!old) return;
    const round = old.round + 1;
    // A hard exclusion, including the four cards not yet seen, makes this a
    // complete new hand rather than advancing or reordering the same five.
    const order = generate(old.day, round, old.seen, old.order).map(discoveryKey);
    commit({ ...old, round, order, cursor: 0, offset: 0, seen: [...old.seen, ...order.slice(0, 1)].slice(-120) });
  }, [commit, generate]);
  const move = useCallback((direction: number) => {
    const old = current.current;
    if (!old) return;
    if (!old.order.length) return;
    const position = Math.max(0, (old.offset ?? 0) + old.cursor + direction);
    const cursor = position % old.order.length;
    commit({ ...old, cursor, offset: position - cursor, seen: [...old.seen, old.order[cursor]].slice(-120) });
  }, [commit]);
  const items = (state?.order ?? []).map(id => byKey.get(id) ?? null);
  return { items, cursor: state?.cursor ?? 0, position: (state?.offset ?? 0) + (state?.cursor ?? 0), day: state?.day, loading: !state,
    error: !!state && !items[state.cursor], shuffle, move, retry: () => setRetry(value => value + 1) };
}
