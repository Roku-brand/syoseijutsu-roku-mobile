import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { getServerViewport, getWebViewport, subscribeWebViewport } from '@/lib/web-viewport';

const subscribeNative = () => () => {};

export function useHydratedWindowDimensions() {
  const dimensions = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);
  const viewport = useSyncExternalStore(
    Platform.OS === 'web' ? subscribeWebViewport : subscribeNative,
    Platform.OS === 'web' ? getWebViewport : getServerViewport,
    getServerViewport,
  );
  useEffect(() => setHydrated(true), []);
  const liveDimensions = viewport ?? dimensions;
  return {
    width: hydrated ? liveDimensions.width : 0,
    height: hydrated ? liveDimensions.height : 0,
    hydrated,
  };
}
