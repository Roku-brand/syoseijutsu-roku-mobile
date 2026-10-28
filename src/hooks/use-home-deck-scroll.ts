import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, ScrollView, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useReducedMotion } from './use-reduced-motion';

type Position = { deck: boolean; y: number };
// Home can be unmounted by the web stack. Keep its return position for this
// app session, separately from the persisted five-card recommendation state.
let returnPosition: Position | null = null;

export function useHomeDeckScroll(enabled: boolean) {
  const scrollRef = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [geometry, setGeometry] = useState({ viewport: 0, deck: 0, content: 0 });
  const live = useRef({ y: 0, downward: false, touching: false, focused: false, aligned: false, deckOpened: false });
  const pending = useRef<Position | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const layoutChangingUntil = useRef(0);
  // The deck is the final section. Deriving its top from the content's end
  // also handles a membership banner disappearing after access is hydrated.
  // RN Web's onLayout observes size changes, but not position-only changes.
  const top = Math.max(0, geometry.content - geometry.deck);
  const ready = enabled && geometry.viewport > 0 && geometry.deck > 0 && geometry.content >= geometry.deck;
  const latest = useRef({ ready, top, reduced, viewport: geometry.viewport });
  latest.current = { ready, top, reduced, viewport: geometry.viewport };

  const settle = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const state = live.current;
      const metrics = latest.current;
      const remaining = metrics.top - state.y;
      // Only assist a downward approach. Upward scrolling and the lower part
      // of a deck taller than the screen must remain freely scrollable.
      if (!metrics.ready || !state.focused || state.touching || !state.downward || remaining <= 2 || remaining > Math.min(180, metrics.viewport * .28)) return;
      state.downward = false;
      scrollRef.current?.scrollTo({ y: metrics.top, animated: !metrics.reduced });
    }, 180);
  }, []);

  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    pending.current = returnPosition;
    live.current.focused = true;
    setFocused(true);
    return () => {
      const state = live.current;
      const metrics = latest.current;
      if (metrics.ready) returnPosition = { deck: state.deckOpened || Math.abs(state.y - metrics.top) < 12, y: state.y };
      state.focused = false;
      state.deckOpened = false;
      clearTimeout(timer.current);
      setFocused(false);
    };
  }, [enabled]));

  useLayoutEffect(() => {
    if (!focused || !ready) return;
    const position = pending.current;
    // Re-align an already settled deck when Safari's toolbar or rotation
    // changes the available height; never resize the page during a touch.
    if (!position && !live.current.aligned) return;
    const frame = requestAnimationFrame(() => {
      const y = position ? position.deck ? top : Math.min(position.y, geometry.content - geometry.viewport) : top;
      pending.current = null;
      live.current.y = y;
      live.current.downward = false;
      live.current.aligned = Math.abs(y - top) < 3;
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [focused, ready, top, geometry.viewport, geometry.content]);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web') return;
    const userScroll = () => { layoutChangingUntil.current = 0; };
    const start = () => { userScroll(); live.current.touching = true; clearTimeout(timer.current); };
    const end = (event: TouchEvent) => { live.current.touching = event.touches.length > 0; if (!live.current.touching) settle(); };
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    document.addEventListener('wheel', userScroll, { passive: true });
    return () => {
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      document.removeEventListener('wheel', userScroll);
      clearTimeout(timer.current);
    };
  }, [enabled, settle]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!enabled || !live.current.focused) return;
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    // Safari can clamp scrollTop between its viewport resize and the deck's
    // following layout pass. That browser adjustment is not a user scrolling
    // away from the settled deck; keep the anchor through those two frames.
    const resizing = Date.now() < layoutChangingUntil.current || Math.abs(event.nativeEvent.layoutMeasurement.height - latest.current.viewport) > 2;
    if (Math.abs(y - live.current.y) > .5) live.current.downward = y > live.current.y;
    live.current.y = y;
    if (!resizing) live.current.aligned = Math.abs(y - latest.current.top) < 3;
    settle();
  };
  const measure = (key: 'viewport' | 'deck') => (event: LayoutChangeEvent) => {
    const value = event.nativeEvent.layout.height;
    if (geometry.viewport > 0 && Math.abs(geometry[key] - value) >= 1) layoutChangingUntil.current = Date.now() + 300;
    setGeometry(previous => Math.abs(previous[key] - value) < 1 ? previous : { ...previous, [key]: value });
  };
  return {
    scrollRef,
    viewportHeight: enabled ? geometry.viewport : 0,
    onDeckLayout: measure('deck'),
    onOpenCard: () => { live.current.deckOpened = true; },
    scrollProps: {
      // Attach layout listeners on the first (pre-hydration) render too:
      // RN Web does not start observing a listener added after mount.
      onLayout: measure('viewport'),
      onContentSizeChange: (_width: number, height: number) => setGeometry(previous => Math.abs(previous.content - height) < 1 ? previous : { ...previous, content: height }),
      ...(enabled ? { onScroll, scrollEventThrottle: 16,
      onScrollBeginDrag: () => { layoutChangingUntil.current = 0; live.current.touching = true; clearTimeout(timer.current); },
      onScrollEndDrag: () => { live.current.touching = false; settle(); },
      onMomentumScrollEnd: settle } : {}),
    },
  };
}
