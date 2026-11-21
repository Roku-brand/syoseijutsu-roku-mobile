import { useEffect, type RefObject } from 'react';
import { Platform, type ScrollView, type View } from 'react-native';

const REFRESH_THRESHOLD = 102;
const REFRESH_OFFSET = 51;
const FLING_RELEASE_WINDOW = 95;
const FLING_EDGE_WINDOW = 950;
const NATIVE_FLING_WAIT = 42;
const FLING_DECAY = 250;

type TouchDrag = {
  id: number;
  x: number;
  y: number;
  origin: number;
  edge: number;
  startTop: number;
  lastY: number;
  lastMove: number;
  velocity: number;
};

type Fling = {
  speed: number;
  edge: number;
  origin: number;
  launchedAt: number;
  mode: 'waiting' | 'native' | 'coasting';
};

function springBack(from: number, impulse: number) {
  const steps = 24;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const elapsed = 8 * step / steps;
    const offset = step === steps ? 0
      : (from * (1 + elapsed) + impulse * elapsed * Math.E) * Math.exp(-elapsed);
    return { translate: `0 ${offset}px` };
  });
}

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
    let touch: TouchDrag | null = null;
    let touchTarget: Node | null = null;
    let fling: Fling | undefined;
    let flingFrame: number | undefined;
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
    const stopSpring = () => {
      fling = undefined;
      if (flingFrame !== undefined) cancelAnimationFrame(flingFrame);
      flingFrame = undefined;
      spring?.cancel();
      spring = undefined;
    };
    const settle = (impulse = 0) => {
      const previous = offset;
      stopSpring();
      if (!reduced && (previous || impulse) && typeof content.animate === 'function') {
        spring = content.animate(springBack(previous, impulse), {
          duration: 420 + Math.min(130, Math.abs(previous) + Math.abs(impulse) * 1.6),
          easing: 'linear',
        });
      }
      movePage(0);
    };
    const observer = new MutationObserver(() => {
      // A replaced touch target can no longer bubble the end event to the window.
      if (!touchTarget || scroll.contains(touchTarget)) return;
      clearTouch();
      settle();
    });
    const clearTouch = () => {
      touch = null;
      touchTarget = null;
      observer.disconnect();
    };
    const advanceFling = (now: number) => {
      flingFrame = undefined;
      const motion = fling;
      if (!motion) return;
      const elapsed = now - motion.launchedAt;
      const max = scroll.scrollHeight - scroll.clientHeight;
      if (elapsed > FLING_EDGE_WINDOW || max <= 1) {
        fling = undefined;
        return;
      }
      const travelTime = Math.max(0, elapsed - NATIVE_FLING_WAIT);
      if (motion.mode === 'waiting') {
        if ((motion.origin - scroll.scrollTop) * motion.edge > 2) motion.mode = 'native';
        else if (travelTime > 0) motion.mode = 'coasting';
      }
      // Safari and other browsers may already be moving the scroll view after touchend.
      if (motion.mode === 'coasting') {
        const distance = motion.speed * FLING_DECAY * (1 - Math.exp(-travelTime / FLING_DECAY));
        scroll.scrollTop = motion.origin - motion.edge * distance;
      }
      const reachedEdge = motion.edge > 0 ? scroll.scrollTop <= 1 : scroll.scrollTop >= max - 1;
      if (reachedEdge) {
        const impulse = Math.min(72, motion.speed * 38 * Math.exp(-travelTime / 380));
        fling = undefined;
        scroll.scrollTop = motion.edge > 0 ? 0 : max;
        if (impulse >= 10) settle(motion.edge * impulse);
        return;
      }
      flingFrame = requestAnimationFrame(advanceFling);
    };
    const start = (event: TouchEvent) => {
      stopSpring();
      clearTouch();
      const first = event.touches[0];
      const target = event.target;
      if (event.touches.length !== 1 || refreshing || (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]'))) {
        if (!refreshing) settle();
        return;
      }
      for (let node = target instanceof HTMLElement ? target : null; node && node !== scroll; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) return;
      }
      touch = {
        id: first.identifier,
        x: first.clientX,
        y: first.clientY,
        origin: first.clientY,
        edge: 0,
        startTop: scroll.scrollTop,
        lastY: first.clientY,
        lastMove: event.timeStamp,
        velocity: 0,
      };
      if (target instanceof Node && target !== scroll) {
        touchTarget = target;
        observer.observe(scroll, { childList: true, subtree: true });
      }
      distance = 0;
    };
    const move = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (!touch || event.touches.length !== 1 || touch.id !== finger.identifier) return;
      const dy = finger.clientY - touch.y;
      const dx = finger.clientX - touch.x;
      if (!touch.edge) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { clearTouch(); return; }
        if (Math.abs(dy) < 4 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      }
      const elapsed = event.timeStamp - touch.lastMove;
      const velocity = (finger.clientY - touch.lastY) / Math.max(8, Math.min(60, elapsed));
      touch.velocity = elapsed < 60 ? touch.velocity * 0.4 + velocity * 0.6 : velocity;
      touch.lastMove = event.timeStamp;
      touch.lastY = finger.clientY;
      if (!touch.edge) {
        const max = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
        const pull = finger.clientY - touch.origin;
        if (pull > 0 && scroll.scrollTop <= 1) touch.edge = 1;
        else if (pull < 0 && scroll.scrollTop >= max - 1) touch.edge = -1;
        else { touch.origin = finger.clientY; return; }
      }
      const pull = (finger.clientY - touch.origin) * touch.edge;
      if (pull <= 0) {
        touch.origin = finger.clientY;
        touch.edge = 0;
        distance = 0;
        movePage(0);
        return;
      }
      // Native scrolling may already own the touch by the time it reaches the
      // end. The viewport clamps there while the content follows the finger.
      if (event.cancelable) event.preventDefault();
      distance = pull;
      const limit = Math.min(210, Math.max(150, scroll.clientHeight * 0.37));
      const drag = pull * 1.22;
      movePage(touch.edge * limit * drag / (limit + drag));
    };
    const end = (event: TouchEvent) => {
      const finished = touch;
      if (!finished || Array.from(event.touches).some(finger => finger.identifier === finished.id)) return;
      const shouldRefresh = event.type === 'touchend' && finished.edge === 1 && distance >= REFRESH_THRESHOLD && refresh;
      clearTouch();
      if (refreshing) return;
      if (!shouldRefresh) {
        const velocity = event.type === 'touchend' && event.timeStamp - finished.lastMove < FLING_RELEASE_WINDOW
          ? finished.velocity : 0;
        const outward = velocity * finished.edge;
        const impulse = outward > 0.3 ? finished.edge * Math.min(45, (outward - 0.3) * 24) : 0;
        settle(impulse);
        const edge = Math.sign(velocity);
        const travelled = (finished.startTop - scroll.scrollTop) * edge;
        if (!reduced && !finished.edge && Math.abs(velocity) >= 0.35 && travelled > 5) {
          fling = {
            speed: Math.min(3.4, Math.abs(velocity)),
            edge,
            origin: scroll.scrollTop,
            launchedAt: performance.now(),
            mode: 'waiting',
          };
          flingFrame = requestAnimationFrame(advanceFling);
        }
        return;
      }
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
    scroll.addEventListener('wheel', stopSpring, { passive: true });
    window.addEventListener('pointerdown', stopSpring, true);
    window.addEventListener('keydown', stopSpring, true);
    // Native panning and nested controls can end a gesture before it bubbles to the scroll view.
    window.addEventListener('touchend', end, true);
    window.addEventListener('touchcancel', end, true);
    return () => {
      active = false;
      clearTouch();
      stopSpring();
      movePage(0);
      scroll.removeEventListener('touchstart', start);
      scroll.removeEventListener('touchmove', move);
      scroll.removeEventListener('wheel', stopSpring);
      window.removeEventListener('pointerdown', stopSpring, true);
      window.removeEventListener('keydown', stopSpring, true);
      window.removeEventListener('touchend', end, true);
      window.removeEventListener('touchcancel', end, true);
    };
  }, [ref, indicatorRef, reduced, refresh]);
}
