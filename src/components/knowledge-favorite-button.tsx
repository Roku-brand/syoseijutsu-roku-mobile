import { useAppState } from '@/state/app-state';
import { useAppToast } from './app-toast';
import { SaveDiamondButton } from './book-ui';

export function KnowledgeFavoriteButton({ kind, id, title }: {
  kind: 'technique' | 'theory' | 'feature';
  id: string;
  title: string;
}) {
  const { savedIds, savedTheoryIds, savedFeatureIds, toggleSaved, toggleSavedTheory, toggleSavedFeature } = useAppState();
  const showToast = useAppToast();
  const saved = (kind === 'technique' ? savedIds : kind === 'theory' ? savedTheoryIds : savedFeatureIds).includes(id);

  return <SaveDiamondButton label="" saved={saved}
    accessibilityLabel={saved ? `${title}のお気に入りを解除` : `${title}をお気に入りに保存`}
    onPress={() => {
      if (kind === 'technique') toggleSaved(id);
      else if (kind === 'theory') toggleSavedTheory(id);
      else toggleSavedFeature(id);
      showToast(saved ? 'お気に入りから外しました' : 'お気に入りに保存しました');
    }} />;
}
