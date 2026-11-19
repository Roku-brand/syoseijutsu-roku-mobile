import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';

type Direction = -1 | 1;
type Turn = { from: string; direction: Direction; navigate: () => void; stage: 'leaving' | 'awaiting' | 'entering' };
type PageTurn = {
  active: boolean;
  busy: () => boolean;
  preview: (distance: number, width: number) => void;
  finish: (direction: Direction, navigate: () => void) => void;
  cancel: () => void;
};

export const DetailPageTurnContext = createContext<PageTurn | null>(null);
export const useDetailPageTurn = () => useContext(DetailPageTurnContext);

const detailKind = (path: string) => /^\/(card|theory)\/[^/]+\/?$/.exec(path)?.[1];
const driver = Platform.OS !== 'web';

export function useDetailPageTurnMotion(path: string, reduced: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(false);
  const [direction, setDirection] = useState<Direction>(1);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = useRef<Turn | null>(null);
  const lastPath = useRef(path);
  const arrivalPath = useRef<string | null>(null);
  const options = useRef({ path, reduced });
  options.current = { path, reduced };

  const clearWatchdog = useCallback(() => {
    if (watchdog.current !== null) clearTimeout(watchdog.current);
    watchdog.current = null;
  }, []);

  const reset = useCallback(() => {
    turn.current = null;
    clearWatchdog();
    animation.current?.stop();
    progress.setValue(0);
    setActive(false);
  }, [clearWatchdog, progress]);

  const animateTo = useCallback((value: number, duration: number, complete: () => void) => {
    animation.current?.stop();
    animation.current = Animated.timing(progress, {
      toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: driver,
    });
    animation.current.start(({ finished }) => { if (finished) complete(); });
  }, [progress]);

  useLayoutEffect(() => {
    const from = lastPath.current;
    lastPath.current = path;
    if (path === from) return;
    const current = turn.current;
    arrivalPath.current = null;
    if (current?.stage === 'awaiting' && current.from === from && detailKind(path) === detailKind(from)) {
      clearWatchdog();
      arrivalPath.current = path;
      current.stage = 'entering';
      setDirection(current.direction === 1 ? -1 : 1);
      progress.setValue(0.72);
      animateTo(0, 225, reset);
    } else {
      reset();
    }
  }, [path, animateTo, clearWatchdog, progress, reset]);

  useEffect(() => {
    if (!reduced) return;
    const interrupted = turn.current;
    reset();
    if (interrupted?.stage === 'leaving') interrupted.navigate();
  }, [reduced, reset]);

  useEffect(() => () => {
    turn.current = null;
    clearWatchdog();
    animation.current?.stop();
  }, [clearWatchdog]);

  const actions = useMemo(() => ({
    busy: () => turn.current !== null,
    preview: (distance: number, width: number) => {
      if (options.current.reduced || turn.current) return;
      animation.current?.stop();
      setDirection(distance <= 0 ? 1 : -1);
      setActive(true);
      progress.setValue(Math.min(0.65, Math.abs(distance) / Math.max(width, 1)));
    },
    finish: (nextDirection: Direction, navigate: () => void) => {
      if (turn.current) return;
      if (options.current.reduced) { navigate(); return; }
      const current: Turn = { from: options.current.path, direction: nextDirection, navigate, stage: 'leaving' };
      turn.current = current;
      setDirection(nextDirection);
      setActive(true);
      animateTo(1, 170, () => {
        if (turn.current !== current) return;
        current.stage = 'awaiting';
        watchdog.current = setTimeout(reset, 1_000);
        navigate();
      });
    },
    cancel: () => {
      if (!options.current.reduced && !turn.current) animateTo(0, 150, reset);
    },
  }), [animateTo, progress, reset]);

  const controls = useMemo(() => ({ ...actions, active }), [actions, active]);
  const sheetStyle = active ? {
    transformOrigin: direction === 1 ? 'left center' : 'right center',
    transform: [{ perspective: 1000 }, { rotateY: progress.interpolate({
      inputRange: [0, 1], outputRange: ['0deg', direction === 1 ? '-78deg' : '78deg'],
    }) }],
  } : undefined;
  const shade = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });
  return { controls, sheetStyle, shade, arrivalPath };
}
