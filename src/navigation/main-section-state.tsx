import { usePathname, useRootNavigationState } from 'expo-router';
import { createContext, useContext, useLayoutEffect, useRef, type PropsWithChildren, type RefObject } from 'react';
import { Platform } from 'react-native';
import { getMainSection, type MainSection } from './app-routes';

const MainSectionContext = createContext<MainSection | null>(null);
const isReadingDetail = (path: string) => /^\/(card|theory)\/[^/]+$/.test(path) || /^\/features\/(?!editorial-policy$|guides(?:\/|$))[^/]+$/.test(path);
const HISTORY_FIELD = '__rokuMainSection';
const sections: MainSection[] = ['main', 'discover', 'learn', 'my-os'];
function webEntry(pathname: string): MainSection | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const entry = window.history.state?.[HISTORY_FIELD];
    return entry?.pathname === pathname && sections.includes(entry.section) ? entry.section : null;
  } catch { return null; }
}
function rememberWebEntry(pathname: string, section: MainSection) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    if (decodeURI(window.location.pathname) !== pathname) return;
    // Preserve the router's history fields; only annotate the current entry.
    window.history.replaceState({ ...window.history.state, [HISTORY_FIELD]: { pathname, section } }, '');
  } catch { /* Navigation still works when the browser disallows history writes. */ }
}
function retainWebEntry(latest: RefObject<{ pathname: string; section: MainSection }>) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const history = window.history;
  const push = history.pushState;
  const replace = history.replaceState;
  const wrap = (original: History['pushState']): History['pushState'] => function (data, unused, url) {
    const entry = latest.current;
    // The router writes its history entry after layout, replacing custom fields.
    // Annotate that same entry while keeping its id and URL unchanged.
    let state = data;
    try {
      const pathname = decodeURI(new URL(url ?? window.location.href, window.location.href).pathname);
      if (pathname === entry.pathname && (data === null || Object.getPrototypeOf(data) === Object.prototype)) {
        state = { ...data, [HISTORY_FIELD]: entry };
      }
    } catch { /* Leave other history consumers' data and URLs untouched. */ }
    return original.call(history, state, unused, url);
  };
  const wrappedPush = wrap(push);
  const wrappedReplace = wrap(replace);
  history.pushState = wrappedPush;
  history.replaceState = wrappedReplace;
  return () => {
    if (history.pushState === wrappedPush) history.pushState = push;
    if (history.replaceState === wrappedReplace) history.replaceState = replace;
  };
}

/** Reader entries retain their originating section, including on back/forward. */
export function MainSectionProvider({ children }: PropsWithChildren) {
  'use no memo';
  const pathname = usePathname();
  const state = useRootNavigationState();
  const key = state?.routes[state.index ?? 0]?.key ?? pathname;
  const entries = useRef(new Map<string, MainSection>());
  const previous = useRef<MainSection | null>(null);
  const section = isReadingDetail(pathname) ? webEntry(pathname) ?? entries.current.get(key) ?? previous.current ?? getMainSection(pathname) : getMainSection(pathname);
  const latest = useRef({ pathname, section });
  useLayoutEffect(() => retainWebEntry(latest), []);
  useLayoutEffect(() => {
    latest.current = { pathname, section };
    entries.current.set(key, section);
    previous.current = section;
    rememberWebEntry(pathname, section);
    if (entries.current.size > 200) entries.current.delete(entries.current.keys().next().value!);
  }, [key, pathname, section]);
  return <MainSectionContext.Provider value={section}>{children}</MainSectionContext.Provider>;
}

export function useMainSection() {
  const section = useContext(MainSectionContext);
  if (!section) throw new Error('useMainSection must be used inside MainSectionProvider');
  return section;
}
