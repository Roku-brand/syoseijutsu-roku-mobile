import { useEffect, type RefObject } from 'react';
import { Platform, type ScrollView, type View } from 'react-native';

const REFRESH_THRESHOLD = 102;
const REFRESH_OFFSET = 51;

export function useWebPageElasticity(
  ref: RefObject<ScrollView | null>,
  indicatorRef: RefObject<View | null>,
  reduced: boolean,
  refresh?: () => Promise<void>,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const scroll: HTMLElement | null = ref.current?.getScrollableNode();
    const content: HTMLElement | null = ref.current?.getInnerViewNode();
    if (!scroll || !content) return;
    const indicator = indicatorRef.current as unknown as HTMLElement | null;
    let touch: { id: number; x: number; y: number; origin: number; edge: number } | null = null;
    let distance = 0;
    let offset = 0;
    let spring: Animation | undefined;
    let refreshing = false;
    let active = true;

    const movePage = (next: number) => {
      offset = next;
      content.style.translate = next ? `0 ${next}px` : '';
      if (indicator) indicator.style.opacity = String(Math.min(1, Math.max(0, (next - 22) / 27)));
    };
    const settle = () => {
      const previous = offset;
      spring?.cancel();
      if (!reduced && previous && typeof content.animate === 'function') {
        const rebound = -Math.sign(previous) * Math.min(4, Math.abs(previous) / 12);
        spring = content.animate([
          { translate: `0 ${previous}px` },
          { translate: `0 ${rebound}px`, offset: 0.76 },
          { translate: '0 0' },
        ], { duration: 310, easing: 'cubic-bezier(.16,.84,.34,1)' });
      }
      movePage(0);
    };
    const start = (event: TouchEvent) => {
      const first = event.touches[0];
      const target = event.target;
      if (event.touches.length !== 1 || refreshing || (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]'))) {
        touch = null;
        if (!refreshing) settle();
        return;
      }
      touch = { id: first.identifier, x: first.clientX, y: first.clientY, origin: first.clientY, edge: 0 };
      for (let node = target instanceof HTMLElement ? target : null; node && node !== scroll; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) {
          touch = null;
          return;
        }
      }
      distance = 0;
    };
    const move = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (!touch || event.touches.length !== 1 || touch.id !== finger.identifier) return;
      const dy = finger.clientY - touch.y;
      const dx = finger.clientX - touch.x;
      if (!touch.edge) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { touch = null; return; }
        if (Math.abs(dy) < 6 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
        const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
        const pull = finger.clientY - touch.origin;
        if (pull > 0 && scroll.scrollTop <= 1) touch.edge = 1;
        else if (pull < 0 && scroll.scrollTop >= max - 1) touch.edge = -1;
        else { touch.origin = finger.clientY; return; }
        if (!event.cancelable) { touch.edge = 0; return; }
        spring?.cancel();
      }
      const pull = (finger.clientY - touch.origin) * touch.edge;
      if (pull <= 0) {
        touch.origin = finger.clientY;
        touch.edge = 0;
        distance = 0;
        movePage(0);
        return;
      }
      event.preventDefault();
      distance = pull;
      movePage(touch.edge * 154 * pull / (128 + pull));
    };
    const end = (event: TouchEvent) => {
      if (touch && Array.from(event.touches).some(finger => finger.identifier === touch?.id)) return;
      const shouldRefresh = event.type === 'touchend' && touch?.edge === 1 && distance >= REFRESH_THRESHOLD && refresh;
      touch = null;
      if (refreshing) return;
      if (!shouldRefresh) { settle(); return; }
      refreshing = true;
      movePage(REFRESH_OFFSET);
      void shouldRefresh().finally(() => {
        if (!active) return;
        refreshing = false;
        settle();
      });
    };
    scroll.addEventListener('touchstart', start, { passive: true });
    scroll.addEventListener('touchmove', move, { passive: false });
    scroll.addEventListener('touchend', end);
    scroll.addEventListener('touchcancel', end);
    return () => {
      active = false;
      spring?.cancel();
      movePage(0);
      scroll.removeEventListener('touchstart', start);
      scroll.removeEventListener('touchmove', move);
      scroll.removeEventListener('touchend', end);
      scroll.removeEventListener('touchcancel', end);
    };
  }, [ref, indicatorRef, reduced, refresh]);
}
