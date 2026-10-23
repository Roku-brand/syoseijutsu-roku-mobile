import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { BookScreen } from '@/components/book-ui';
import { PersonalMemosContent } from '@/components/personal-memos-content';
export default function MyTechniquesScreen() {
  const { folder, compose } = useLocalSearchParams<{ folder?: string; compose?: string }>();
  const router = useRouter();
  const onComposeHandled = useCallback(() => router.setParams({ compose: undefined }), [router]);
  return <BookScreen><PersonalMemosContent initialFolder={folder ?? null} composeRequested={compose === '1'} onComposeHandled={onComposeHandled} /></BookScreen>;
}
