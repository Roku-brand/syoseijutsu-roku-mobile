import { relatedFeatureLinks, useFeatureLinks } from '@/data/feature-links';
import { featureRoute } from '@/navigation/app-routes';
import { RelatedContentSection } from './related-content-list';

export function RelatedFeatures({ kind, id }: { kind: 'technique' | 'theory'; id: string }) {
  const articles = relatedFeatureLinks(useFeatureLinks(id), kind, id);
  return <RelatedContentSection variant={kind === 'technique' ? 'feature' : undefined} tone={kind === 'theory' ? 'theory' : undefined} title="関連する特集" testID="related-features"
    items={articles.map(article => ({ key: article.id, title: article.title, href: featureRoute(article.slug) }))} />;
}

