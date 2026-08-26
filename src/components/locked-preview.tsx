import { useEffect } from 'react';
import { useRouter } from 'expo-router';

type Source = 'reel' | 'discover_technique' | 'discover_theory' | 'learning' | 'my_os';

/** Paid content no longer has an intermediate lock preview: it opens the purchase page immediately. */
export function LockedPreview({ source }: { source: Source; title?: string; description?: string; count?: number }) {
  const router = useRouter();
  useEffect(() => { router.replace({ pathname: '/upgrade', params: { source } }); }, [router, source]);
  return null;
}
