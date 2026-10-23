import { useCallback } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';

/** Consume creation requests on the screen that owns the route, including tabs. */
export function usePersonalMemoRoute() {
  const { folder, compose } = useLocalSearchParams<{ folder?: string; compose?: string }>();
  const navigation = useNavigation();
  const onComposeHandled = useCallback(() => {
    navigation.dispatch({ type: 'SET_PARAMS', payload: { params: { compose: undefined } } });
  }, [navigation]);

  return { initialFolder: folder ?? null, composeRequested: compose === '1', onComposeHandled };
}
