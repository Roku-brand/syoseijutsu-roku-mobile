import { useEffect } from 'react';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { connectAppleStore, listenToApplePurchases } from '@/lib/apple-purchase.ios';
// Root observer handles Ask to Buy and interrupted purchases on relaunch.
export function ApplePurchaseObserver() {
  const { user } = useAuth();
  const { refreshAccess } = useAccess();
  useEffect(() => {
    if (!user) return;
    const remove = listenToApplePurchases(() => { void refreshAccess(); }, () => {});
    void connectAppleStore().catch(() => {});
    return remove;
  }, [user?.id, refreshAccess]);
  return null;
}
