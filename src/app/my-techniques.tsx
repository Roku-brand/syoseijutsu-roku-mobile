import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { BookScreen } from '@/components/book-ui';
import { PersonalMemosContent } from '@/components/personal-memos-content';
export default function MyTechniquesScreen() {
  const { folder, compose } = useLocalSearchParams<{ folder?: string; compose?: string }>();
  const navigation = useNavigation();
  const onComposeHandled = useCallback(() => navigation.dispatch({ type: 'SET_PARAMS', payload: { params: { compose: undefined } } }), [navigation]);
  return <BookScreen><PersonalMemosContent initialFolder={folder ?? null} composeRequested={compose === '1'} onComposeHandled={onComposeHandled} /></BookScreen>;
}
