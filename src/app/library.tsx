import { BookScreen } from '@/components/book-ui';
import { LibraryContent } from '@/components/library-content';
import { useLocalSearchParams } from 'expo-router';

export default function LibraryScreen() {
  const params = useLocalSearchParams<{ category?: string; kind?: string }>();
  const category = ['interpersonal', 'work', 'life'].includes(params.category ?? '') ? params.category : undefined;
  const kind = ['theory', 'feature'].includes(params.kind ?? '') ? params.kind : undefined;
  return <BookScreen><LibraryContent key={`${category ?? ''}:${kind ?? ''}`} category={category} kind={kind} /></BookScreen>;
}
