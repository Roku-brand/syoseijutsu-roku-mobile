import { getTechniqueDisplayId } from '@/data/catalog';
import type { TechniqueCard } from '@/data/types';
import { techniqueRoute } from '@/navigation/app-routes';
import { KnowledgeFavoriteButton } from './knowledge-favorite-button';
import { CatalogIndexCard } from './catalog-index-card';

export function ShoseijutsuListCard({ card, readable, previewTitle = false, onOpen, openLabel, testID = 'technique-index-row' }: {
  card: TechniqueCard; readable: boolean; previewTitle?: boolean; onOpen?: () => void; openLabel?: string; testID?: string;
}) {
  const title = readable || previewTitle ? card.title : '完全版の処世術';
  const code = getTechniqueDisplayId(card);
  return <CatalogIndexCard kind="technique" category={card.categoryKey} readable={readable}
    metadata={`${card.categoryName}・${card.subcategory || '独立した処世術'}`} code={code} title={title}
    href={techniqueRoute(card.id)} label={openLabel ?? `${previewTitle ? title : `${code} ${title}`}を開く`} onOpen={onOpen} testID={testID}
    action={<KnowledgeFavoriteButton kind="technique" id={card.id} title={readable || previewTitle || onOpen ? card.title : `${code} ${title}`} />} />;
}
