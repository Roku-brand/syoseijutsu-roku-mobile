type ViewportSize = { width: number; height: number } | null;

let snapshot: ViewportSize = null;
const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
export const getWebViewport = () => snapshot;
export const getServerViewport = (): ViewportSize => null;

// Keep the shell and responsive screens in agreement. Safari emits changing
// visual heights during drags; resizing the scroll container interrupts them.
export function subscribeWebViewport(listener: () => void) {
  if (typeof window === 'undefined') return () => {};
  listeners.add(listener);
  if (!stop) {
    let touching = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const viewport = window.visualViewport;
    const sync = () => {
      if (touching || (viewport && Math.abs(viewport.scale - 1) > 0.01)) return;
      const width = window.innerWidth;
      const height = Math.round(Math.min(viewport?.height || window.innerHeight, window.innerHeight));
      if (snapshot && Math.abs(snapshot.width - width) < 1 && Math.abs(snapshot.height - height) < 2) return;
      snapshot = { width, height };
      document.documentElement.style.setProperty('--roku-app-height', height + 'px');
      listeners.forEach((notify) => notify());
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!touching) timer = setTimeout(sync, 120);
    };
    const touchStart = () => { touching = true; clearTimeout(timer); };
    const touchEnd = (event: TouchEvent) => {
      touching = event.touches.length > 0;
      schedule();
    };
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    document.addEventListener('touchstart', touchStart, { passive: true });
    document.addEventListener('touchend', touchEnd, { passive: true });
    document.addEventListener('touchcancel', touchEnd, { passive: true });
    stop = () => {
      clearTimeout(timer);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
      document.removeEventListener('touchstart', touchStart);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', touchEnd);
    };
    sync();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { stop?.(); stop = undefined; }
  };
}
