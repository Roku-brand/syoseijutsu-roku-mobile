import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

type ViewportSize = { width: number; height: number } | null;

export function useHydratedWindowDimensions() {
  const dimensions = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  const [visualViewport, setVisualViewport] = useState<ViewportSize>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const syncViewport = () => {
      const viewport = window.visualViewport;
      setVisualViewport({
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
      });
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  const liveDimensions = visualViewport ?? dimensions;

  return {
    width: hydrated ? liveDimensions.width : 0,
    height: hydrated ? liveDimensions.height : 0,
    hydrated,
  };
}
