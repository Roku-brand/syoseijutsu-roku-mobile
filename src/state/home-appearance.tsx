import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { defaultHomeTheme, findHomeTheme, HOME_THEME_STORAGE_KEY, type HomeThemeId } from '@/constants/home-themes';

type Appearance = { theme: ReturnType<typeof findHomeTheme>; selectTheme: (id: HomeThemeId) => void; storageError: boolean };
const Context = createContext<Appearance | null>(null);

/** Device appearance stays separate from account, recommendations and purchase data. */
export function HomeAppearanceProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Appearance['theme']>(defaultHomeTheme);
  const [storageError, setStorageError] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(HOME_THEME_STORAGE_KEY).then(id => {
      if (active && !changed.current) setTheme(findHomeTheme(id));
    }).catch(() => { /* A missing/unavailable preference keeps the default usable. */ });
    return () => { active = false; };
  }, []);
  const selectTheme = useCallback((id: HomeThemeId) => {
    changed.current = true;
    setTheme(findHomeTheme(id));
    setStorageError(false);
    // Serialize rapid choices so an older write cannot overwrite the last tap.
    writes.current = writes.current.then(() => AsyncStorage.setItem(HOME_THEME_STORAGE_KEY, id)).then(() => setStorageError(false)).catch(() => setStorageError(true));
  }, []);
  return <Context.Provider value={{ theme, selectTheme, storageError }}>{children}</Context.Provider>;
}

export function useHomeAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error('useHomeAppearance must be used inside HomeAppearanceProvider');
  return value;
}
