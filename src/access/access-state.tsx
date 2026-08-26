import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { FREE_ACCESS, fetchVerifiedAccess, reconcileCompleteEditionPurchase, type AccessStatus, type VerifiedAccess } from '@/lib/purchase';
import { hydrateSecureContent, purgeSecureContent, restoreCachedSecureContent } from '@/lib/secure-content';
import { hydratePublishedContent } from '@/lib/published-content';

export type AccessState = 'checking' | 'guest' | 'free' | 'paid' | 'error';
export type PreviewMode = 'actual' | 'guest' | 'free' | 'paid' | 'checking' | 'error';

type AccessContextValue = {
  accessState: AccessState;
  actualAccessState: AccessState;
  accessStatus: AccessStatus;
  accessInfo: VerifiedAccess;
  isPaid: boolean;
  isOwner: boolean;
  previewMode: PreviewMode;
  catalogRevision: number;
  refreshPublishedContent: () => Promise<boolean>;
  setPreviewMode: (mode: PreviewMode) => Promise<void>;
  refreshAccess: () => Promise<AccessState>;
  continueAsGuest: () => void;
  restorePurchase: (sessionId?: string) => Promise<boolean>;
};

const PREVIEW_KEY = '@shoseijutsu-roku/owner-preview/v1';
const AccessContext = createContext<AccessContextValue | null>(null);

function storageReadWithin(key: string, timeoutMs = 2_000): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), timeoutMs);
    AsyncStorage.getItem(key).then((value) => {
      clearTimeout(timeout);
      resolve(value);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

export function AccessProvider({ children }: PropsWithChildren) {
  const { loading, user, role } = useAuth();
  // Keep entitlement verification explicit so a returning paid user never
  // flashes through the free edition while the server check is in flight.
  const [actualAccessState, setActualAccessState] = useState<AccessState>('checking');
  const [accessInfo, setAccessInfo] = useState<VerifiedAccess>(FREE_ACCESS);
  const [previewMode, setPreviewModeState] = useState<PreviewMode>('actual');
  const [catalogRevision, setCatalogRevision] = useState(0);
  const isOwner = role === 'owner';

  const refreshPublishedContent = useCallback(async (): Promise<boolean> => {
    const changed = await hydratePublishedContent(true);
    if (changed) setCatalogRevision((value) => value + 1);
    return changed;
  }, []);

  useEffect(() => { void refreshPublishedContent(); }, [refreshPublishedContent]);

  const refreshAccess = useCallback(async (): Promise<AccessState> => {
    if (loading) {
      // Wait for the locally persisted auth session before binding cached paid
      // content to a user. The guest catalogue is already visible meanwhile.
      setActualAccessState('checking');
      return 'checking';
    }
    if (!user) {
      // Keep the persisted cache intact in case a slow local auth session
      // resolves later, but never expose it without binding it to that user.
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      setActualAccessState('guest');
      setAccessInfo(FREE_ACCESS);
      return 'guest';
    }

    try {
      const verified: VerifiedAccess = role === 'owner'
        ? { ...FREE_ACCESS, status: 'active', accessType: 'legacy_lifetime' }
        : await fetchVerifiedAccess();
      setAccessInfo(verified);
      if (verified.status === 'active') {
        setActualAccessState('paid');
        // Paid content is downloaded after the entitlement is known.  The
        // edition unlock must not wait for a slow network response.
        void hydrateSecureContent().then(refreshPublishedContent).catch(async () => {
          if (await restoreCachedSecureContent(user.id)) {
            setCatalogRevision((value) => value + 1);
            await refreshPublishedContent();
          }
        });
        return 'paid';
      }
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      const nextState: AccessState = 'free';
      setActualAccessState(nextState);
      return nextState;
    } catch {
      // A time-limited entitlement cannot be safely extended from a local
      // cache or device clock. Keep the data stored, but lock it until the
      // server can verify the current entitlement again.
      purgeSecureContent();
      setCatalogRevision((value) => value + 1);
      setActualAccessState('error');
      return 'error';
    }
  }, [loading, role, user]);

  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  useEffect(() => {
    if (accessInfo.status !== 'active' || accessInfo.accessType !== 'thirty_day' || !accessInfo.accessExpiresAt) return;
    const trustedNow = accessInfo.serverNow ? new Date(accessInfo.serverNow).getTime() : Date.now();
    const remaining = new Date(accessInfo.accessExpiresAt).getTime() - trustedNow;
    const delay = Math.max(1_000, Math.min(remaining + 500, 86_400_000));
    const timeout = setTimeout(() => { void refreshAccess(); }, delay);
    return () => clearTimeout(timeout);
  }, [accessInfo, refreshAccess]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) void refreshAccess();
    });
    return () => subscription.remove();
  }, [refreshAccess, user]);

  useEffect(() => {
    void storageReadWithin(PREVIEW_KEY).then((stored) => {
      if (stored && ['actual', 'guest', 'free', 'paid', 'checking', 'error'].includes(stored)) {
        setPreviewModeState(stored as PreviewMode);
      }
    });
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
    setAccessInfo(FREE_ACCESS);
    setActualAccessState('guest');
  }, []);

  const restorePurchase = useCallback(async (sessionId?: string) => {
    setAccessInfo((current) => ({ ...current, status: 'processing' }));
    if (role !== 'owner') {
      let reconciled: VerifiedAccess | null;
      try {
        reconciled = await reconcileCompleteEditionPurchase(sessionId);
      } catch (error) {
        setAccessInfo(FREE_ACCESS);
        throw error;
      }
      if (!reconciled || reconciled.status !== 'active') {
        setAccessInfo(reconciled ?? FREE_ACCESS);
        return false;
      }
      setAccessInfo(reconciled);
    }
    const next = await refreshAccess();
    return next === 'paid' || role === 'owner';
  }, [refreshAccess, role]);

  const accessState = isOwner && previewMode !== 'actual' ? previewMode : actualAccessState;
  const value = useMemo(() => ({
    accessState,
    actualAccessState,
    accessStatus: isOwner && previewMode === 'paid' ? 'active' : accessInfo.status,
    accessInfo,
    isPaid: accessState === 'paid',
    isOwner,
    previewMode,
    catalogRevision,
    refreshPublishedContent,
    setPreviewMode,
    refreshAccess,
    continueAsGuest,
    restorePurchase,
  }), [accessInfo, accessState, actualAccessState, catalogRevision, continueAsGuest, isOwner, previewMode, refreshAccess, refreshPublishedContent, restorePurchase, setPreviewMode]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used inside AccessProvider');
  return value;
}
