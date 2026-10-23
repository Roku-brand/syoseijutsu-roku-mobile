import { BookScreen } from '@/components/book-ui';
import { PersonalMemosContent } from '@/components/personal-memos-content';
import { usePersonalMemoRoute } from '@/hooks/use-personal-memo-route';

export default function MyTechniquesScreen() {
  const request = usePersonalMemoRoute();
  return <BookScreen><PersonalMemosContent {...request} /></BookScreen>;
}
