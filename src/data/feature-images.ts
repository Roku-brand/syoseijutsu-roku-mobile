import type { ImageSourcePropType } from 'react-native';
import { contentImageUrl } from '@/lib/content-media';
import { featureCover } from './feature-covers';
import type { FeatureArticle } from './features';

export const FEATURE_IMAGES: Record<string, ImageSourcePropType> = {
  'bundled:feature-coast': require('../../assets/features/coast.webp'),
  'bundled:feature-forest': require('../../assets/features/forest.webp'),
  'bundled:feature-mountain': require('../../assets/features/mountain.webp'),
};
export function featureImage(path: string | null) {
  return (path && FEATURE_IMAGES[path]) || { uri: path && /^(?:https?:|blob:|data:|file:)/.test(path) ? path : contentImageUrl(path) ?? '' };
}
export function featureImageSource(article: Pick<FeatureArticle, 'id' | 'title' | 'image_path'>) {
  return featureCover(article)?.source ?? featureImage(article.image_path);
}
