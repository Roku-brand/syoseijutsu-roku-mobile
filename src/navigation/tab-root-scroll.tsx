import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
import type { MainSection } from './app-routes';

type TabScrollState = {
  scrolls: Partial<Record<MainSection, RefObject<ScrollView | null>>>;
  resetOnFocus?: MainSection;
};

const TabRootScrollContext = createContext<TabScrollState | null>(null);

export function TabRootScrollProvider({ children }: { children: ReactNode }) {
  const state = useRef<TabScrollState>({ scrolls: {} });
  return <TabRootScrollContext.Provider value={state.current}>{children}</TabRootScrollContext.Provider>;
}

export function useTabRootScrollState() {
  return useContext(TabRootScrollContext);
}

export function useTabRootScroll(section: MainSection) {
  const state = useTabRootScrollState();
  const scroll = useRef<ScrollView>(null);

  useLayoutEffect(() => {
    if (!state) return;
    state.scrolls[section] = scroll;
    return () => {
      if (state.scrolls[section] === scroll) delete state.scrolls[section];
    };
  }, [section, state]);

  useFocusEffect(useCallback(() => {
    if (state?.resetOnFocus !== section) return;
    const frame = requestAnimationFrame(() => {
      if (state.resetOnFocus !== section) return;
      state.resetOnFocus = undefined;
      scroll.current?.scrollTo({ y: 0, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [section, state]));

  return scroll;
}
