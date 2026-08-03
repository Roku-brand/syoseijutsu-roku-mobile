import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type AccessState = 'checking' | 'guest' | 'free' | 'paid' | 'error';

type AccessContextValue = {
  accessState: AccessState;
  isPaid: boolean;
  refreshAccess: () => Promise<void>;
  continueAsGuest: () => void;
  restorePurchase: () => Promise<boolean>;
};

const STORAGE_KEY = '@shoseijutsu-roku/access/v1';
const AccessContext = createContext<AccessContextValue | null>(null);

async function resolveAccess(): Promise<AccessState> {
  // GitHub Pages is static. Production must replace this with a server-side
  // session + entitlement check. Until then, only guest/free states are trusted.
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === 'free') return 'free';
  return 'guest';
}

export function AccessProvider({ children }: PropsWithChildren) {
  const [accessState, setAccessState] = useState<AccessState>('checking');

  const refreshAccess = useCallback(async () => {
    setAccessState('checking');
    try {
      setAccessState(await resolveAccess());
    } catch {
      setAccessState('error');
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
  }, [refreshAccess]);

  const continueAsGuest = useCallback(() => {
    setAccessState('guest');
  }, []);

  const restorePurchase = useCallback(async () => {
    // Deliberately does not grant paid access locally. A production entitlement
    // endpoint must validate the authenticated account before returning paid.
    await refreshAccess();
    return false;
  }, [refreshAccess]);

  const value = useMemo(
    () => ({
      accessState,
      isPaid: accessState === 'paid',
      refreshAccess,
      continueAsGuest,
      restorePurchase,
    }),
    [accessState, continueAsGuest, refreshAccess, restorePurchase],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used inside AccessProvider');
  return value;
}
