import { useAppState } from '@/state/app-state';
import { useAppToast } from './app-toast';
import { SaveDiamondButton } from './book-ui';

export function KnowledgeFavoriteButton({ kind, id, title }: {
  kind: 'technique' | 'theory';
  id: string;
  title: string;
}) {
  const { savedIds, savedTheoryIds, toggleSaved, toggleSavedTheory } = useAppState();
  const showToast = useAppToast();
  const saved = (kind === 'technique' ? savedIds : savedTheoryIds).includes(id);

  return <SaveDiamondButton label="" saved={saved}
    accessibilityLabel={saved ? `${title}のお気に入りを解除` : `${title}をお気に入りに保存`}
    onPress={() => {
      if (kind === 'technique') toggleSaved(id);
      else toggleSavedTheory(id);
      showToast(saved ? 'お気に入りから外しました' : 'お気に入りに保存しました');
    }} />;
}
