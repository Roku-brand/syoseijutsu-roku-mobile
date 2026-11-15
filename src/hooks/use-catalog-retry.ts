import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { catalogSyncStore } from '@/lib/published-content';

const RETRY_DELAYS = [10_000, 30_000, 60_000, 120_000, 300_000];

/** Retain readable content while a failed public sync quietly recovers. */
export function useCatalogRetry(retry: () => void, disabled: boolean) {
  const attempts = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      const { status } = catalogSyncStore.getSnapshot();
      if (status === 'ready') attempts.current = 0;
      if (disabled || status !== 'offline' || AppState.currentState !== 'active'
        || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
      timer = setTimeout(() => {
        attempts.current = Math.min(attempts.current + 1, RETRY_DELAYS.length - 1);
        retry();
        // Also reschedule if another request already owns the refresh lock.
        schedule();
      }, RETRY_DELAYS[attempts.current]);
    };
    const unsubscribe = catalogSyncStore.subscribe(schedule);
    const subscription = AppState.addEventListener('change', schedule);
    if (typeof window !== 'undefined') window.addEventListener('online', schedule);
    schedule();
    return () => {
      clearTimeout(timer);
      unsubscribe();
      subscription.remove();
      if (typeof window !== 'undefined') window.removeEventListener('online', schedule);
    };
  }, [disabled, retry]);
}
