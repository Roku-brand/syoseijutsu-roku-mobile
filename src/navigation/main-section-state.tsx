import { usePathname, useRootNavigationState } from 'expo-router';
import { createContext, useContext, useLayoutEffect, useRef, type PropsWithChildren } from 'react';
import { getMainSection, type MainSection } from './app-routes';

const MainSectionContext = createContext<MainSection | null>(null);
const isReadingDetail = (path: string) => /^\/(card|theory)\/[^/]+$/.test(path) || /^\/features\/(?!editorial-policy$|guides(?:\/|$))[^/]+$/.test(path);

/** Reader entries retain their originating section, including on back/forward. */
export function MainSectionProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const state = useRootNavigationState();
  const key = state?.routes[state.index ?? 0]?.key ?? pathname;
  const entries = useRef(new Map<string, MainSection>());
  const previous = useRef<MainSection | null>(null);
  const section = isReadingDetail(pathname) ? entries.current.get(key) ?? previous.current ?? getMainSection(pathname) : getMainSection(pathname);
  useLayoutEffect(() => {
    entries.current.set(key, section);
    previous.current = section;
    if (entries.current.size > 200) entries.current.delete(entries.current.keys().next().value!);
  }, [key, pathname, section]);
  return <MainSectionContext.Provider value={section}>{children}</MainSectionContext.Provider>;
}

export function useMainSection() {
  const section = useContext(MainSectionContext);
  if (!section) throw new Error('useMainSection must be used inside MainSectionProvider');
  return section;
}
