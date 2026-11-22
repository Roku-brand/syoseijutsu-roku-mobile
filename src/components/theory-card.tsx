import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { getTheoryCardSupplement, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import { KnowledgeFavoriteButton } from './knowledge-favorite-button';
import { CatalogIndexCard } from './catalog-index-card';

export function TheoryListCard({ theory, readable, showClassification = false, onOpen, testID = 'theory-index-row-card' }: {
  theory: TheoryRecord; readable: boolean; showClassification?: boolean; onOpen?: () => void; testID?: string;
}) {
  const title = normalizeDisplayText(theory.title);
  const definition = readable && !isLockedTheoryShell(theory) ? getTheoryCardSupplement(theory) : '';
  return <CatalogIndexCard kind="theory" code={getTheoryDisplayId(theory)} title={title} definition={definition} readable={readable}
    classification={showClassification ? theory.subcategoryTitle || theory.categoryTitle : undefined}
    href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }}
    label={`${title}を開く`} onOpen={onOpen} testID={testID}
    action={<KnowledgeFavoriteButton kind="theory" id={theory.tagId} title={title} />} />;
}
