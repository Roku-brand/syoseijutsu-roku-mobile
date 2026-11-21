import { usePathname, useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import type { BrowseMode } from '@/data/search-catalog';
import { APP_ROUTES } from './app-routes';

export type DiscoverSearchEntry = { mode: BrowseMode; query?: string; techniqueCategory?: string };
type FocusSearch = (entry: DiscoverSearchEntry) => void;
const SearchEntryContext = createContext<{
  open: FocusSearch;
  register: (focus: FocusSearch) => () => void;
} | null>(null);

export function DiscoverSearchEntryProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const browserInput = useRef<HTMLInputElement>(null);
  const destination = useRef<FocusSearch | null>(null);
  const pending = useRef<{ entry: DiscoverSearchEntry; origin: string } | null>(null);
  const expiry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = useCallback(() => {
    pending.current = null;
    clearTimeout(expiry.current);
    const input = browserInput.current;
    if (input) { input.hidden = true; input.value = ''; }
  }, []);

  useEffect(() => {
    if (pending.current && pathname !== pending.current.origin && pathname !== '/discover') clear();
  }, [clear, pathname]);
  useEffect(() => clear, [clear]);

  const register = useCallback((focus: FocusSearch) => {
    destination.current = focus;
    if (pending.current) {
      const input = browserInput.current;
      const entry = pending.current.entry;
      // Transfer focus before hiding the temporary field that opened the keyboard.
      focus({ ...entry, query: input && !input.hidden ? input.value : entry.query });
      clear();
    }
    return () => { if (destination.current === focus) destination.current = null; };
  }, [clear]);

  const open = (entry: DiscoverSearchEntry) => {
    const here = pathname === '/discover';
    if (here && destination.current) { destination.current(entry); return; }
    clear();
    pending.current = { entry, origin: pathname };
    const input = browserInput.current;
    if (input) {
      // Safari can open the keyboard during the tap even when the new route
      // has not mounted its input yet.
      input.value = entry.query ?? '';
      input.hidden = false;
      input.focus({ preventScroll: true });
    }
    expiry.current = setTimeout(clear, 6000);
    if (!here) router.navigate(APP_ROUTES.discover);
  };

  return <SearchEntryContext.Provider value={{ open, register }}>
    {children}
    {Platform.OS === 'web' ? <input ref={browserInput} hidden tabIndex={-1} inputMode="search" enterKeyHint="search" autoComplete="off"
      aria-label="検索欄を準備しています" style={{ position: 'fixed', top: 56, left: 24, width: 'min(280px, calc(100% - 48px))', height: 44, padding: 0, border: 0, opacity: 0, pointerEvents: 'none', fontSize: 16 }} /> : null}
  </SearchEntryContext.Provider>;
}

export function useDiscoverSearchEntry() {
  const context = useContext(SearchEntryContext);
  if (!context) throw new Error('DiscoverSearchEntryProvider is required');
  return context;
}
