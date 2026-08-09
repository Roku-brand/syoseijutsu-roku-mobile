import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from '@/auth/auth-state';
import { fetchVerifiedAccess } from '@/lib/purchase';
import { hydrateSecureContent, purgeSecureContent } from '@/lib/secure-content';

export type AccessState = 'checking' | 'guest' | 'free' | 'paid' | 'error';
export type PreviewMode = 'actual' | 'guest' | 'free' | 'paid' | 'checking' | 'error';

type AccessContextValue = {
  accessState: AccessState;
  actualAccessState: AccessState;
  isPaid: boolean;
  isOwner: boolean;
  previewMode: PreviewMode;
  catalogRevision: number;
  setPreviewMode: (mode: PreviewMode) => Promise<void>;
  refreshAccess: () => Promise<AccessState>;
  continueAsGuest: () => void;
  restorePurchase: () => Promise<boolean>;
};

const PREVIEW_KEY = '@shoseijutsu-roku/owner-preview/v1';
const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: PropsWithChildren) {
  const { loading, user, role } = useAuth();
  // The free catalogue is always safe to show.  Do not make application
  // startup depend on auth, an entitlement request, or paid-content download.
  const [actualAccessState, setActualAccessState] = useState<AccessState>('guest');
  const [previewMode, setPreviewModeState] = useState<PreviewMode>('actual');
  const [catalogRevision, setCatalogRevision] = useState(0);
  const isOwner = role === 'owner';

  const refreshAccess = useCallback(async (): Promise<AccessState> => {
    if (loading) {
      return 'guest';
    }
    if (!user) {
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      setActualAccessState('guest');
      return 'guest';
    }

    // Keep the free edition usable while access is being verified.  In
    // particular, never put the whole app behind a launch-time spinner.
    purgeSecureContent();
    setCatalogRevision((value) => value + 1);
    setActualAccessState('guest');
    try {
      const verified = role === 'owner' ? 'paid' : await fetchVerifiedAccess();
      if (verified === 'paid') {
        setActualAccessState('paid');
        // Paid content is downloaded after the entitlement is known.  The
        // edition unlock must not wait for a slow network response.
        void hydrateSecureContent()
          .then(() => setCatalogRevision((value) => value + 1))
          .catch(() => undefined);
        return 'paid';
      }
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      setActualAccessState(verified);
      return verified;
    } catch {
      // A failed entitlement request falls back to the free edition.  A later
      // auth event or explicit purchase restore retries this verification.
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      setActualAccessState('guest');
      return 'guest';
    }
  }, [loading, role, user]);

  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  useEffect(() => {
    AsyncStorage.getItem(PREVIEW_KEY).then((stored) => {
      if (stored && ['actual', 'guest', 'free', 'paid', 'checking', 'error'].includes(stored)) {
        setPreviewModeState(stored as PreviewMode);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isOwner && previewMode !== 'actual') setPreviewModeState('actual');
  }, [isOwner, previewMode]);

  const setPreviewMode = useCallback(async (mode: PreviewMode) => {
    if (!isOwner && mode !== 'actual') return;
    setPreviewModeState(mode);
    await AsyncStorage.setItem(PREVIEW_KEY, mode);
  }, [isOwner]);

  const continueAsGuest = useCallback(() => {
    purgeSecureContent();
    setCatalogRevision((value) => value + 1);
    setActualAccessState('guest');
  }, []);

  const restorePurchase = useCallback(async () => {
    const next = await refreshAccess();
    return next === 'paid' || role === 'owner';
  }, [refreshAccess, role]);

  const accessState = isOwner && previewMode !== 'actual' ? previewMode : actualAccessState;
  const value = useMemo(() => ({
    accessState,
    actualAccessState,
    isPaid: accessState === 'paid',
    isOwner,
    previewMode,
    catalogRevision,
    setPreviewMode,
    refreshAccess,
    continueAsGuest,
    restorePurchase,
  }), [accessState, actualAccessState, catalogRevision, continueAsGuest, isOwner, previewMode, refreshAccess, restorePurchase, setPreviewMode]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used inside AccessProvider');
  return value;
}
