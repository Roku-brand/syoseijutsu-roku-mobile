import type { ImageSourcePropType } from 'react-native';
import type { CategoryKey } from './types';

// Shared by the home page and rankings so each technique category has one photo.
export const techniqueCategoryImages: Record<CategoryKey, ImageSourcePropType> = {
  interpersonal: require('../../assets/home/interpersonal-v2.webp'),
  work: require('../../assets/home/work-office.webp'),
  life: require('../../assets/home/life-crossroads.webp'),
};
