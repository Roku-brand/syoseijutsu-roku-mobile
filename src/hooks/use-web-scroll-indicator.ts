import { useEffect, type RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

const INSET = 6;
const MIN_THUMB_HEIGHT = 26;
const HIDE_DELAY = 1600;
const TOUCH_HOLD_DELAY = 350;
const TOUCH_HOLD_SLOP = 10;

const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

type ThumbPress = {
  input: 'touch' | 'pointer';
  id: number;
  startX: number;
  startY: number;
  y: number;
  active: boolean;
};

export function useWebScrollIndicator(
  scrollRef: RefObject<ScrollView | null>,
  thumbRef: RefObject<View | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const scroll: HTMLElement | null = scrollRef.current?.getScrollableNode();
    const thumb = thumbRef.current as unknown as HTMLElement | null;
    const paint = thumb?.firstElementChild;
    if (!scroll || !thumb || !(paint instanceof HTMLElement)) return;

    let timer: number | undefined;
    let holdTimer: number | undefined;
    let frame: number | undefined;
    let previousTop = scroll.scrollTop;
    let press: ThumbPress | undefined;
    const hide = () => {
      window.clearTimeout(timer);
      timer = undefined;
      thumb.style.opacity = '0';
      thumb.style.pointerEvents = 'none';
    };
    const show = () => {
      thumb.style.opacity = '1';
      thumb.style.pointerEvents = 'auto';
      window.clearTimeout(timer);
      timer = press ? undefined : window.setTimeout(hide, HIDE_DELAY);
    };
    const position = () => {
      const { clientHeight, scrollHeight, scrollTop } = scroll;
      const range = scrollHeight - clientHeight;
      const track = clientHeight - INSET * 2;
      if (range <= 1 || track <= 0) {
        hide();
        return;
      }
      const height = Math.min(track, Math.max(MIN_THUMB_HEIGHT, track * clientHeight / scrollHeight));
      const travel = track - height;
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translateY(${INSET + travel * clampProgress(scrollTop / range)}px)`;
      return { range, travel };
    };
    const onScroll = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        if (scroll.scrollTop === previousTop) return;
        previousTop = scroll.scrollTop;
        if (position()) show();
      });
    };
    const clearHold = () => {
      window.clearTimeout(holdTimer);
      holdTimer = undefined;
    };
    const activate = () => {
      clearHold();
      if (!press || !position()?.travel) return;
      press.active = true;
      thumb.style.cursor = 'grabbing';
      paint.style.width = '7px';
      if (press.input === 'touch') navigator.vibrate?.(15);
    };
    const begin = (input: ThumbPress['input'], id: number, x: number, y: number) => {
      if (press || thumb.style.pointerEvents !== 'auto' || !position()?.travel) return false;
      press = { input, id, startX: x, startY: y, y, active: false };
      show();
      if (input === 'touch') holdTimer = window.setTimeout(activate, TOUCH_HOLD_DELAY);
      else activate();
      return true;
    };
    const movePress = (x: number, y: number) => {
      if (!press) return;
      if (!press.active) {
        press.y = y;
        if (Math.hypot(x - press.startX, y - press.startY) > TOUCH_HOLD_SLOP) clearHold();
        return;
      }
      const delta = y - press.y;
      if (Math.abs(delta) < 1) return;
      press.y = y;
      const metrics = position();
      if (!metrics?.travel) return;
      // Relative movement keeps the page anchored under the finger when Safari moves its browser chrome.
      scroll.scrollTop = metrics.range * clampProgress(scroll.scrollTop / metrics.range + delta / metrics.travel);
      position();
    };
    const finish = () => {
      if (!press) return;
      clearHold();
      press = undefined;
      thumb.style.cursor = '';
      paint.style.width = '';
      if (position()) show();
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      if (!begin('pointer', event.pointerId, event.clientX, event.clientY)) return;
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (press?.input === 'pointer' && press.id === event.pointerId) movePress(event.clientX, event.clientY);
    };
    const pointerUp = (event: PointerEvent) => {
      if (press?.input === 'pointer' && press.id === event.pointerId) finish();
    };
    const touchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        if (press?.input === 'touch') finish();
        return;
      }
      const finger = event.changedTouches[0];
      if (finger && begin('touch', finger.identifier, finger.clientX, finger.clientY)) event.preventDefault();
    };
    const pressingFinger = (event: TouchEvent) => {
      if (press?.input !== 'touch') return;
      return Array.from(event.changedTouches).find(finger => finger.identifier === press?.id);
    };
    const touchMove = (event: TouchEvent) => {
      const finger = pressingFinger(event);
      if (!finger) return;
      if (event.cancelable) event.preventDefault();
      movePress(finger.clientX, finger.clientY);
    };
    const touchEnd = (event: TouchEvent) => {
      if (!pressingFinger(event)) return;
      if (event.cancelable) event.preventDefault();
      finish();
    };
    const suppressContextMenu = (event: Event) => event.preventDefault();
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      if (timer !== undefined || press) position();
    }) : null;
    resize?.observe(scroll);
    const content: HTMLElement | null = scrollRef.current?.getInnerViewNode();
    if (content) resize?.observe(content);
    hide();
    scroll.addEventListener('scroll', onScroll, { passive: true });
    thumb.addEventListener('pointerdown', pointerDown);
    thumb.addEventListener('pointermove', pointerMove);
    thumb.addEventListener('pointerup', pointerUp);
    thumb.addEventListener('pointercancel', pointerUp);
    thumb.addEventListener('lostpointercapture', pointerUp);
    thumb.addEventListener('touchstart', touchStart, { passive: false });
    thumb.addEventListener('touchmove', touchMove, { passive: false });
    window.addEventListener('touchend', touchEnd, { capture: true, passive: false });
    window.addEventListener('touchcancel', touchEnd, true);
    thumb.addEventListener('contextmenu', suppressContextMenu);
    window.addEventListener('blur', finish);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      clearHold();
      paint.style.width = '';
      thumb.style.cursor = '';
      hide();
      resize?.disconnect();
      scroll.removeEventListener('scroll', onScroll);
      thumb.removeEventListener('pointerdown', pointerDown);
      thumb.removeEventListener('pointermove', pointerMove);
      thumb.removeEventListener('pointerup', pointerUp);
      thumb.removeEventListener('pointercancel', pointerUp);
      thumb.removeEventListener('lostpointercapture', pointerUp);
      thumb.removeEventListener('touchstart', touchStart);
      thumb.removeEventListener('touchmove', touchMove);
      window.removeEventListener('touchend', touchEnd, true);
      window.removeEventListener('touchcancel', touchEnd, true);
      thumb.removeEventListener('contextmenu', suppressContextMenu);
      window.removeEventListener('blur', finish);
    };
  }, [enabled, scrollRef, thumbRef]);
}
