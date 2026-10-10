import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { FREE_ACCESS, fetchVerifiedAccess, reconcileCompleteEditionPurchase, type AccessStatus, type VerifiedAccess } from '@/lib/purchase';
import { hasHydratedSecureContent, hydrateSecureContent, purgeSecureContent, refreshSecureContent, restoreCachedSecureContent } from '@/lib/secure-content';
import { hydratePublishedContent } from '@/lib/published-content';
import { readContentRevision } from '@/lib/content-revision';

export type AccessState = 'checking' | 'guest' | 'free' | 'paid' | 'error';
export type PreviewMode = 'actual' | 'guest' | 'free' | 'paid' | 'checking' | 'error';
export type SecureContentStatus = 'idle' | 'loading' | 'ready' | 'error';

type AccessContextValue = {
  accessState: AccessState;
  actualAccessState: AccessState;
  accessStatus: AccessStatus;
  accessInfo: VerifiedAccess;
  isPaid: boolean;
  isOwner: boolean;
  previewMode: PreviewMode;
  catalogRevision: number;
  secureContentStatus: SecureContentStatus;
  refreshPublishedContent: () => Promise<boolean>;
  setPreviewMode: (mode: PreviewMode) => Promise<void>;
  refreshAccess: () => Promise<AccessState>;
  continueAsGuest: () => void;
  restorePurchase: (sessionId?: string) => Promise<boolean>;
};

const PREVIEW_KEY = '@shoseijutsu-roku/owner-preview/v1';
const CONTENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
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
  const [secureContentStatus, setSecureContentStatus] = useState<SecureContentStatus>('idle');
  const isOwner = role === 'owner';
  const automaticRefresh = useRef<Promise<void> | null>(null);
  const publicRevision = useRef<string | null>(null);
  const secureRevision = useRef<string | null>(null);
  const lastForegroundCheck = useRef(0);
  const previousAccessState = useRef(actualAccessState);
  useEffect(() => { previousAccessState.current = actualAccessState; }, [actualAccessState]);

  const refreshPublishedContent = useCallback(async (): Promise<boolean> => {
    const revision = await readContentRevision(true);
    const changed = await hydratePublishedContent(true);
    if (changed) publicRevision.current = revision;
    const secureWasHydrated = hasHydratedSecureContent(user?.id);
    const secureChanged = secureWasHydrated
      ? await refreshSecureContent(() => setCatalogRevision((value) => value + 1))
      : true;
    if (secureWasHydrated && secureChanged) secureRevision.current = revision;
    // A publish RPC can already have applied its returned row locally. Always
    // notify catalogue consumers so that immediate reflection does not depend
    // on a follow-up public read succeeding in the same moment.
    setCatalogRevision((value) => value + 1);
    return changed && secureChanged;
  }, [user?.id]);

  const checkPublishedContent = useCallback(async (force = false, revision?: string | null) => {
    const revisionRequest = revision === undefined ? readContentRevision() : Promise.resolve(revision);
    const changed = await hydratePublishedContent(force);
    // A forced check can overlap another catalog sync. Refresh consumers even
    // if this call reports no change, so they read the latest catalog objects.
    if (changed || force) setCatalogRevision((value) => value + 1);
    const requestedRevision = await revisionRequest;
    if (changed) publicRevision.current = requestedRevision;
  }, []);

  const synchronizeSecureContent = useCallback(async (userId: string) => {
    // Capture the revision before fetching bodies so an edit made during the
    // request remains detectable on the next check.
    const revisionRequest = readContentRevision();
    if (hasHydratedSecureContent(userId)) {
      const revision = await revisionRequest;
      // An already unlocked catalogue still needs fresh bodies after a DB edit.
      // Keep the readable catalogue and its cache if the network is unavailable.
      if (revision !== null && revision !== publicRevision.current) await checkPublishedContent(true, revision);
      if (revision !== null && revision !== secureRevision.current) {
        const refreshed = await refreshSecureContent(() => setCatalogRevision((value) => value + 1));
        if (refreshed) secureRevision.current = revision;
      }
      setSecureContentStatus('ready');
      return;
    }
    setSecureContentStatus('loading');
    try {
      await hydrateSecureContent(() => setCatalogRevision((value) => value + 1));
      const revision = await revisionRequest;
      secureRevision.current = revision;
      setSecureContentStatus('ready');
      await checkPublishedContent(true, revision);
    } catch {
      if (await restoreCachedSecureContent(userId)) {
        setSecureContentStatus('ready');
        setCatalogRevision((value) => value + 1);
        await checkPublishedContent(true);
        return;
      }
      // Never expose the intentionally blank public-catalogue shell as a
      // usable theory title. Theory surfaces show a quiet retry state instead.
      setSecureContentStatus('error');
      setCatalogRevision((value) => value + 1);
      await checkPublishedContent(true);
    }
  }, [checkPublishedContent]);

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
      setSecureContentStatus('idle');
      setCatalogRevision((value) => value + 1);
      setActualAccessState('guest');
      setAccessInfo(FREE_ACCESS);
      await checkPublishedContent(true);
      return 'guest';
    }

    try {
      const verified: VerifiedAccess = role === 'owner'
        ? { ...FREE_ACCESS, status: 'active', accessType: 'legacy_lifetime' }
        : await fetchVerifiedAccess();
      setAccessInfo(verified);
      if (verified.status === 'active') {
        setActualAccessState('paid');
        // The edition unlock remains responsive, while theory surfaces wait
        // for verified title data instead of exposing a public shell.
        void synchronizeSecureContent(user.id);
        return 'paid';
      }
      if (previousAccessState.current !== 'free') {
        purgeSecureContent();
        setSecureContentStatus('idle');
        setCatalogRevision((value) => value + 1);
        await checkPublishedContent(true);
      } else {
        const revision = await readContentRevision();
        if (revision !== null && revision !== publicRevision.current) await checkPublishedContent(true, revision);
      }
      const nextState: AccessState = 'free';
      setActualAccessState(nextState);
      return nextState;
    } catch {
      // A time-limited entitlement cannot be safely extended from a local
      // cache or device clock. Keep the data stored, but lock it until the
      // server can verify the current entitlement again.
      purgeSecureContent();
      setSecureContentStatus('idle');
      setCatalogRevision((value) => value + 1);
      await checkPublishedContent(true);
      setActualAccessState('error');
      return 'error';
    }
  }, [checkPublishedContent, loading, role, synchronizeSecureContent, user]);

  useEffect(() => { void refreshAccess(); }, [refreshAccess]);

  useEffect(() => {
    if (accessInfo.status !== 'active' || accessInfo.accessType !== 'thirty_day' || !accessInfo.accessExpiresAt) return;
    const trustedNow = accessInfo.serverNow ? new Date(accessInfo.serverNow).getTime() : Date.now();
    const remaining = new Date(accessInfo.accessExpiresAt).getTime() - trustedNow;
    const delay = Math.max(1_000, Math.min(remaining + 500, 86_400_000));
    const timeout = setTimeout(() => { void refreshAccess(); }, delay);
    return () => clearTimeout(timeout);
  }, [accessInfo, refreshAccess]);

  const refreshCurrentContent = useCallback(() => {
    if (loading || automaticRefresh.current) return;
    const request = (async () => {
      const revision = await readContentRevision();
      if (revision === null) return;
      const publicChanged = revision !== publicRevision.current;
      const secureChanged = hasHydratedSecureContent(user?.id) && revision !== secureRevision.current;
      if (!publicChanged && !secureChanged) return;
      if (user) await refreshAccess();
      else await checkPublishedContent(true, revision);
    })();
    automaticRefresh.current = request;
    void request.finally(() => {
      if (automaticRefresh.current === request) automaticRefresh.current = null;
    });
  }, [checkPublishedContent, loading, refreshAccess, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (Date.now() - lastForegroundCheck.current < 60_000) return;
        lastForegroundCheck.current = Date.now();
        if (user) void refreshAccess();
        else refreshCurrentContent();
      }
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') refreshCurrentContent();
    }, CONTENT_REFRESH_INTERVAL_MS);
    // Web/PWA clients retry immediately when their connection returns.
    if (typeof window !== 'undefined') window.addEventListener('online', refreshCurrentContent);
    return () => {
      subscription.remove();
      clearInterval(interval);
      if (typeof window !== 'undefined') window.removeEventListener('online', refreshCurrentContent);
    };
  }, [refreshAccess, refreshCurrentContent, user]);

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
    setSecureContentStatus('idle');
    setCatalogRevision((value) => value + 1);
    setAccessInfo(FREE_ACCESS);
    setActualAccessState('guest');
    void checkPublishedContent(true);
  }, [checkPublishedContent]);

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
    secureContentStatus,
    refreshPublishedContent,
    setPreviewMode,
    refreshAccess,
    continueAsGuest,
    restorePurchase,
  }), [accessInfo, accessState, actualAccessState, catalogRevision, continueAsGuest, isOwner, previewMode, refreshAccess, refreshPublishedContent, restorePurchase, secureContentStatus, setPreviewMode]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used inside AccessProvider');
  return value;
}
