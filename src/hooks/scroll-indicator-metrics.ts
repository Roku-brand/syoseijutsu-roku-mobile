export const SCROLL_THUMB_INSET = 6;
export const SCROLL_THUMB_HIDE_DELAY = 1600;
export const SCROLL_THUMB_HOLD_DELAY = 350;
export const SCROLL_THUMB_HOLD_SLOP = 10;

export const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

export function scrollThumbMetrics(viewport: number, content: number, offset: number) {
  const range = content - viewport;
  const track = viewport - SCROLL_THUMB_INSET * 2;
  if (range <= 1 || track <= 0) return null;
  const height = Math.min(track, Math.max(26, track * viewport / content));
  const travel = track - height;
  return { height, travel, range, top: SCROLL_THUMB_INSET + travel * clampProgress(offset / range) };
}
