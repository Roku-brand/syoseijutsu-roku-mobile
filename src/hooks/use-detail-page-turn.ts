import { createContext, type ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

type Direction = -1 | 1;
export type DetailPageDestination = { path: string; open: () => void; preview: ReactNode };
type Page = { direction: Direction; destination: DetailPageDestination };
type PageTurn = {
  active: boolean;
  busy: () => boolean;
  preview: (direction: Direction, distance: number, destination: DetailPageDestination) => void;
  finish: (direction: Direction, destination: DetailPageDestination) => void;
  cancel: () => void;
};

export const DetailPageTurnContext = createContext<PageTurn | null>(null);
export const useDetailPageTurn = () => useContext(DetailPageTurnContext);

export function useDetailPageTurnMotion(path: string, reduced: boolean, width: number) {
  const progress = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState<Page | null>(null);
  const visiblePage = useRef<Page | null>(null);
  const completion = useRef<{ destination: DetailPageDestination; opened: boolean } | null>(null);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPath = useRef(path);
  const arrivalPath = useRef<string | null>(null);
  const options = useRef({ reduced, width });
  options.current = { reduced, width };

  const clearWatchdog = useCallback(() => {
    if (watchdog.current !== null) clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);

  const reset = useCallback(() => {
    completion.current = null;
    visiblePage.current = null;
    clearWatchdog();
    animation.current?.stop();
    progress.setValue(0);
    setPage(null);
  }, [clearWatchdog, progress]);

  const showPage = useCallback((direction: Direction, destination: DetailPageDestination) => {
    if (visiblePage.current?.direction === direction && visiblePage.current.destination.path === destination.path) return;
    const next = { direction, destination };
    visiblePage.current = next;
    setPage(next);
  }, []);

  const animate = useCallback((value: number, duration: number, finish: () => void) => {
    animation.current?.stop();
    animation.current = Animated.timing(progress, {
      toValue: value,
      duration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.current.start(({ finished }) => { if (finished) finish(); });
  }, [progress]);

  useLayoutEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    arrivalPath.current = completion.current?.destination.path === path ? path : null;
    reset();
  }, [path, reset]);

  useEffect(() => {
    if (!reduced) return;
    const pending = completion.current;
    reset();
    if (pending && !pending.opened) pending.destination.open();
  }, [reduced, reset]);

  useEffect(() => () => {
    completion.current = null;
    clearWatchdog();
    animation.current?.stop();
  }, [clearWatchdog]);

  const actions = useMemo(() => ({
    busy: () => completion.current !== null,
    preview: (direction: Direction, distance: number, destination: DetailPageDestination) => {
      if (options.current.reduced || !options.current.width || completion.current) return;
      animation.current?.stop();
      showPage(direction, destination);
      progress.setValue(Math.min(0.73, 0.85 * distance / options.current.width));
    },
    finish: (direction: Direction, destination: DetailPageDestination) => {
      if (completion.current) return;
      if (options.current.reduced || !options.current.width) { destination.open(); return; }
      const pending = { destination, opened: false };
      completion.current = pending;
      showPage(direction, destination);
      animate(1, 325, () => {
        if (completion.current !== pending) return;
        pending.opened = true;
        watchdog.current = setTimeout(reset, 1200);
        destination.open();
      });
    },
    cancel: () => {
      if (visiblePage.current && !completion.current) animate(0, 180, reset);
    },
  }), [animate, progress, reset, showPage]);

  const active = page !== null;
  const controls = useMemo(() => ({ ...actions, active }), [actions, active]);
  return { controls, page, progress, arrivalPath };
}
