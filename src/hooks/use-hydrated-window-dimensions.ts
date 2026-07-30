import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

export function useHydratedWindowDimensions() {
  const dimensions = useWindowDimensions();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return {
    width: hydrated ? dimensions.width : 0,
    height: hydrated ? dimensions.height : 0,
    hydrated,
  };
}
