import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { BookScreen } from '@/components/book-ui';
import { PersonalMemosContent } from '@/components/personal-memos-content';
export default function MyTechniquesScreen() {
  const { folder, compose } = useLocalSearchParams<{ folder?: string; compose?: string }>();
  const router = useRouter();
  useEffect(() => { if (compose === '1') router.setParams({ compose: undefined }); }, [compose, router]);
  return <BookScreen><PersonalMemosContent initialFolder={folder ?? null} initialCompose={compose === '1'} /></BookScreen>;
}
