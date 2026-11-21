import { usePathname, useRootNavigationState, useRouter, useUnstableGlobalHref, type Href } from 'expo-router';
import { createContext, useContext, useLayoutEffect, useRef, type PropsWithChildren, type RefObject } from 'react';
import { Platform, type ScrollView } from 'react-native';
import { APP_ROUTES, getMainSection, type MainSection } from './app-routes';

const sectionRoots = {
  main: APP_ROUTES.home, discover: APP_ROUTES.discover, learn: APP_ROUTES.learn, 'my-os': APP_ROUTES.myPage,
};
const sectionPaths = { ...sectionRoots, main: '/' };
const rootHref = (section: MainSection) => section === 'main' && Platform.OS === 'web' ? '/' : sectionRoots[section];
type SectionPage = {
  section: MainSection;
  href: Href;
  pathname: string;
  scrollY: number;
  parent?: SectionPage;
};
type SectionEntry = { page: SectionPage; resumed: boolean; scroll?: ScrollView };
const MainSectionContext = createContext<{
  section: MainSection;
  switchSection: (section: MainSection) => void;
  backWithinSection: () => boolean;
  currentPage: RefObject<SectionEntry>;
} | null>(null);
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
  const href = useUnstableGlobalHref() as Href;
  const router = useRouter();
  const state = useRootNavigationState();
  const activeRoute = state?.routes[state.index ?? 0];
  const routeKey = activeRoute?.key ?? '';
  const key = routeKey + String(href);
  const entries = useRef(new Map<string, SectionEntry>());
  const saved = useRef<Partial<Record<MainSection, SectionPage>>>({});
  const pending = useRef<{ entry: SectionEntry; fromKey: string; expiresAt: number } | null>(null);
  const previous = useRef<{ entry: SectionEntry; depth: number } | null>(null);
  const requested = pending.current;
  const destination = requested && requested.fromKey !== key && requested.entry.page.pathname === pathname && Date.now() < requested.expiresAt
    ? requested.entry : null;
  const known = entries.current.get(key);
  const prior = previous.current?.entry.page;
  const depth = state?.index ?? 0;
  const section = destination?.page.section ?? (isReadingDetail(pathname)
    ? known?.page.section ?? webEntry(pathname) ?? prior?.section ?? getMainSection(pathname)
    : getMainSection(pathname));
  const entry = destination ?? known ?? {
    page: {
      section, href, pathname, scrollY: 0,
      parent: pathname !== sectionPaths[section] && prior?.section === section
        ? depth > (previous.current?.depth ?? 0) ? prior : prior.parent
        : undefined,
    },
    resumed: false,
  };
  const currentPage = useRef(entry);
  const latest = useRef({ pathname, section });
  useLayoutEffect(() => retainWebEntry(latest), []);
  useLayoutEffect(() => {
    latest.current = { pathname, section };
    currentPage.current = entry;
    entries.current.set(key, entry);
    previous.current = { entry, depth };
    rememberWebEntry(pathname, section);
    if (destination) pending.current = null;
    if (entries.current.size > 200) entries.current.delete(entries.current.keys().next().value!);
  }, [depth, destination, entry, key, pathname, section]);

  const prepareRestore = (page?: SectionPage) => {
    pending.current = page ? { entry: { page, resumed: true }, fromKey: key, expiresAt: Date.now() + 3000 } : null;
  };
  const switchSection = (next: MainSection) => {
    if (next === section) {
      prepareRestore();
      router.dismissTo(rootHref(next));
      return;
    }
    const current = currentPage.current;
    if (Platform.OS === 'web') {
      const node: HTMLElement | null = current.scroll?.getScrollableNode();
      if (node) current.page.scrollY = Math.max(0, node.scrollTop);
    }
    saved.current[section] = current.page;
    const page = saved.current[next];
    prepareRestore(page);
    const atRoot = pathname === sectionPaths[section];

    if (!page || page.pathname === sectionPaths[next]) {
      const target = next === 'main' && (!page || page.href === '/') ? rootHref(next) : page?.href ?? sectionRoots[next];
      if (atRoot) router.push(target);
      else router.dismissTo(target);
    } else if (atRoot) {
      router.push(page.href);
    } else {
      router.replace(page.href);
    }
  };

  const backWithinSection = () => {
    if (!entry.resumed) return false;
    const parent = entry.page.parent;
    prepareRestore(parent);
    if (parent && parent.pathname !== sectionPaths[section]) router.replace(parent.href);
    else router.dismissTo(parent?.href === '/' ? rootHref(section) : parent?.href ?? rootHref(section));
    return true;
  };

  return <MainSectionContext.Provider value={{ section, switchSection, backWithinSection, currentPage }}>{children}</MainSectionContext.Provider>;
}

export function useMainSectionNavigation() {
  const context = useContext(MainSectionContext);
  if (!context) throw new Error('useMainSectionNavigation must be used inside MainSectionProvider');
  return context;
}

export function useMainSection() {
  return useMainSectionNavigation().section;
}
