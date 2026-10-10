import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useGlobalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useAppToast } from '@/components/app-toast';
import { GuideDialog, type GuideKind } from '@/components/guide-dialog';
import { APP_ROUTES, signInRoute, upgradeRoute } from '@/navigation/app-routes';
import { COMPLETE_GUIDE_KEY, WELCOME_GUIDE_KEY, readGuideMarker, writeGuideMarker } from './guide-storage';

type GuideContextValue = {
  openGuide: (kind: GuideKind) => void;
  requestPurchaseGuide: () => void;
};
const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ checkout?: string | string[] }>();
  const { user, loading } = useAuth();
  const { actualAccessState, accessInfo, isPaid } = useAccess();
  const toast = useAppToast();
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<GuideKind | null>(null);
  const [purchaseRequested, setPurchaseRequested] = useState(false);
  const welcomeDone = useRef(false);
  const seenPurchase = useRef<string | null>(null);
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;

  useEffect(() => {
    let active = true;
    void Promise.all([readGuideMarker(WELCOME_GUIDE_KEY), readGuideMarker(COMPLETE_GUIDE_KEY)]).then(([welcome, purchase]) => {
      if (!active) return;
      welcomeDone.current = welcome === 'done';
      seenPurchase.current = purchase;
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  const finishWelcome = useCallback(() => {
    welcomeDone.current = true;
    writeGuideMarker(WELCOME_GUIDE_KEY, 'done');
  }, []);

  useEffect(() => {
    if (!ready || loading || kind || welcomeDone.current || checkout) return;
    if (actualAccessState === 'checking' || actualAccessState === 'error') return;
    // Web deep links (especially legal, auth and checkout) stay uninterrupted.
    // A native install also receives its introduction when opened by a content link.
    const entry = pathname === '/' || pathname === '/app';
    const nativeContent = Platform.OS !== 'web' && !/^\/(auth|upgrade|legal|owner|settings)(\/|$)/.test(pathname);
    if (entry || nativeContent) setKind('welcome');
  }, [actualAccessState, checkout, kind, loading, pathname, ready]);

  useEffect(() => {
    // Only explicit successful purchase flows request this. Normal sign-in,
    // entitlement polling, owner previews and restoration do not replay it.
    if (!ready || !purchaseRequested || actualAccessState !== 'paid' || accessInfo.status !== 'active' || !user) return;
    const stamp = accessInfo.purchasedAt ?? accessInfo.accessStartedAt ?? accessInfo.accessExpiresAt ?? 'legacy';
    const purchaseKey = `${user.id}:${stamp}`;
    setPurchaseRequested(false);
    if (seenPurchase.current === purchaseKey) return;
    seenPurchase.current = purchaseKey;
    writeGuideMarker(COMPLETE_GUIDE_KEY, purchaseKey);
    finishWelcome();
    setKind('complete');
  }, [accessInfo, actualAccessState, finishWelcome, purchaseRequested, ready, user]);

  const openGuide = useCallback((next: GuideKind) => {
    if (next === 'complete' && !isPaid) return;
    setKind(next);
  }, [isPaid]);
  const requestPurchaseGuide = useCallback(() => setPurchaseRequested(true), []);
  const value = useMemo(() => ({ openGuide, requestPurchaseGuide }), [openGuide, requestPurchaseGuide]);

  const close = (destination?: Href, later = false) => {
    if (kind === 'welcome') finishWelcome();
    setKind(null);
    if (destination) router.push(destination);
    if (later) toast('この案内は設定からいつでも見られます');
  };

  return <GuideContext.Provider value={value}>
    {children}
    {kind ? <GuideDialog
      kind={kind}
      signedIn={Boolean(user)}
      isPaid={isPaid}
      accessInfo={accessInfo}
      onLater={() => close(undefined, true)}
      onStart={() => close(kind === 'complete' ? APP_ROUTES.personas : APP_ROUTES.home)}
      onPersonas={() => close(APP_ROUTES.personas)}
      onLogin={() => close(signInRoute())}
      onUpgrade={() => close(upgradeRoute('welcome_guide'))}
    /> : null}
  </GuideContext.Provider>;
}

export function useGuides() {
  const context = useContext(GuideContext);
  if (!context) throw new Error('useGuides must be used inside GuideProvider');
  return context;
}
