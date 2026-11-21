import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { COMPLETE_GUIDE_KEY, WELCOME_GUIDE_KEY, readGuideMarker, readPurchaseGuideKeys, writeGuideMarker } from './guide-storage';

export type GuideKind = 'welcome' | 'complete';
type GuideContextValue = {
  kind: GuideKind | null;
  openGuide: (kind: GuideKind) => void;
  finishGuide: () => void;
  requestPurchaseGuide: (checkoutSessionId?: string) => void;
};
const GuideContext = createContext<GuideContextValue | null>(null);
const guidePath = '/installation-guide';

export function GuideProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkout } = useGlobalSearchParams<{ checkout?: string }>();
  const { user, loading } = useAuth();
  const { actualAccessState, accessInfo } = useAccess();
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<GuideKind | null>(null);
  const [purchaseRequestedFor, setPurchaseRequestedFor] = useState<string | null>(null);
  const welcomeDone = useRef(false);
  const seenPurchases = useRef(new Set<string>());
  const entered = useRef(false);
  const canShowComplete = Boolean(user && actualAccessState === 'paid' && accessInfo.status === 'active');

  useEffect(() => {
    let active = true;
    void Promise.all([readGuideMarker(WELCOME_GUIDE_KEY), readGuideMarker(COMPLETE_GUIDE_KEY)]).then(([welcome, purchases]) => {
      if (!active) return;
      welcomeDone.current = welcome === 'done';
      seenPurchases.current = readPurchaseGuideKeys(purchases);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  const finishWelcome = useCallback(() => {
    welcomeDone.current = true;
    writeGuideMarker(WELCOME_GUIDE_KEY, 'done');
  }, []);

  const openGuide = useCallback((next: GuideKind) => {
    if (next === 'complete' && !canShowComplete) return;
    setKind(next);
    router.push(guidePath);
  }, [canShowComplete, router]);

  useEffect(() => {
    if (pathname === guidePath) {
      entered.current = true;
    } else if (entered.current) {
      entered.current = false;
      if (kind === 'welcome') finishWelcome();
      setKind(null);
    }
  }, [finishWelcome, kind, pathname]);

  useEffect(() => {
    if (!ready || loading || checkout || pathname !== '/' || !purchaseRequestedFor) return;
    setPurchaseRequestedFor(null);
    if (!canShowComplete || user?.id !== purchaseRequestedFor) return;
    const stamp = accessInfo.purchasedAt ?? accessInfo.accessStartedAt ?? accessInfo.accessExpiresAt;
    if (!stamp) return;
    const key = `${user.id}:${stamp}`;
    if (seenPurchases.current.has(key)) return;
    seenPurchases.current.add(key);
    writeGuideMarker(COMPLETE_GUIDE_KEY, JSON.stringify([...seenPurchases.current]));
    finishWelcome();
    openGuide('complete');
  }, [accessInfo, canShowComplete, checkout, finishWelcome, loading, openGuide, pathname, purchaseRequestedFor, ready, user?.id]);

  useEffect(() => {
    if (!ready || loading || kind || welcomeDone.current || checkout || purchaseRequestedFor) return;
    if (actualAccessState === 'checking' || actualAccessState === 'error') return;
    const entry = pathname === '/' || pathname === '/app';
    const nativeContent = Platform.OS !== 'web' && !/^\/(auth|upgrade|legal|owner|settings|welcome|onboarding|installation-guide)(\/|$)/.test(pathname);
    if (entry || nativeContent) openGuide('welcome');
  }, [actualAccessState, checkout, kind, loading, openGuide, pathname, purchaseRequestedFor, ready]);

  const requestPurchaseGuide = useCallback((checkoutSessionId?: string) => {
    if (checkoutSessionId && user?.id) setPurchaseRequestedFor(user.id);
  }, [user?.id]);

  const finishGuide = useCallback(() => {
    if (kind === 'welcome') finishWelcome();
    router.dismissTo('/');
  }, [finishWelcome, kind, router]);

  const value = useMemo(() => ({ kind: kind === 'complete' && !canShowComplete ? null : kind, openGuide, finishGuide, requestPurchaseGuide }), [canShowComplete, finishGuide, kind, openGuide, requestPurchaseGuide]);
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuides() {
  const context = useContext(GuideContext);
  if (!context) throw new Error('useGuides must be used inside GuideProvider');
  return context;
}
