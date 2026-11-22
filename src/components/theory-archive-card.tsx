import { useAccess } from '@/access/access-state';
import { canReadTheory } from '@/access/access-config';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { TheoryListCard } from './theory-card';

export function TheoryArchiveCard({ theory }: { theory: TheoryRecord }) {
  const { isPaid } = useAccess();
  const readable = canReadTheory(isPaid ? 'paid' : 'guest', theory.tagId);
  return <TheoryListCard theory={theory} readable={readable} showClassification testID="theory-search-row" />;
}
