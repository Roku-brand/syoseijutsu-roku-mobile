import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useTabVisible() {
  const [isVisible, setIsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setIsVisible(true);
      return () => setIsVisible(false);
    }, []),
  );

  return isVisible;
}
