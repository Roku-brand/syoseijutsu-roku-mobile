import { useHydratedWindowDimensions } from './use-hydrated-window-dimensions';

/** Responsive density is based on the live usable viewport, never device name. */
export type ViewportDensity = 'normal' | 'compact' | 'veryCompact';

export function useResponsiveLayout() {
  const dimensions = useHydratedWindowDimensions();
  const { width, height, hydrated } = dimensions;
  const desktop = width >= 1000;
  const narrow = width > 0 && width < 360;

  let density: ViewportDensity = 'normal';
  if (!desktop && hydrated) {
    if (height < 650) density = 'veryCompact';
    else if (height < 760) density = 'compact';
  }

  return {
    ...dimensions,
    desktop,
    narrow,
    density,
    compact: density !== 'normal',
    verticalPadding: density === 'veryCompact' ? 4 : density === 'compact' ? 6 : 8,
    sectionGap: density === 'veryCompact' ? 4 : density === 'compact' ? 6 : 8,
    bottomNavHeight: density === 'veryCompact' ? 62 : density === 'compact' ? 66 : 70,
  };
}
