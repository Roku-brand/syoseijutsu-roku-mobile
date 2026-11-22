import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import type { TechniqueCard } from '@/data/types';
import { ShoseijutsuListCard } from './shoseijutsu-card';

export function TechniqueRow({ card }: { card: TechniqueCard }) {
  const { isPaid } = useAccess();
  const readable = canReadTechnique(isPaid ? 'paid' : 'free', card.id);
  return <ShoseijutsuListCard card={card} readable={readable} previewTitle testID="technique-search-row" />;
}
