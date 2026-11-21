import { useEffect, type RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

const INSET = 6;
const MIN_THUMB_HEIGHT = 26;
const HIDE_DELAY = 850;

const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

export function useWebScrollIndicator(
  scrollRef: RefObject<ScrollView | null>,
  thumbRef: RefObject<View | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const scroll: HTMLElement | null = scrollRef.current?.getScrollableNode();
    const thumb = thumbRef.current as unknown as HTMLElement | null;
    if (!scroll || !thumb) return;

    let timer: number | undefined;
    let frame: number | undefined;
    let previousTop = scroll.scrollTop;
    let drag: { pointer: number; grabOffset: number } | undefined;
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
      timer = drag ? undefined : window.setTimeout(hide, HIDE_DELAY);
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
    const grab = (event: PointerEvent) => {
      if (event.button !== 0 || drag || thumb.style.pointerEvents !== 'auto' || !position()?.travel) return;
      event.preventDefault();
      thumb.setPointerCapture(event.pointerId);
      drag = { pointer: event.pointerId, grabOffset: event.clientY - thumb.getBoundingClientRect().top };
      scroll.scrollTo({ top: scroll.scrollTop });
      thumb.style.cursor = 'grabbing';
      show();
    };
    const move = (event: PointerEvent) => {
      if (drag?.pointer !== event.pointerId) return;
      const metrics = position();
      if (!metrics?.travel) return;
      const top = event.clientY - scroll.getBoundingClientRect().top - INSET - drag.grabOffset;
      scroll.scrollTop = metrics.range * clampProgress(top / metrics.travel);
      position();
    };
    const release = (event: PointerEvent) => {
      if (drag?.pointer !== event.pointerId) return;
      drag = undefined;
      thumb.style.cursor = '';
      if (position()) show();
    };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      if (timer !== undefined || drag) position();
    }) : null;
    resize?.observe(scroll);
    const content: HTMLElement | null = scrollRef.current?.getInnerViewNode();
    if (content) resize?.observe(content);
    hide();
    scroll.addEventListener('scroll', onScroll, { passive: true });
    thumb.addEventListener('pointerdown', grab);
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', release);
    thumb.addEventListener('pointercancel', release);
    thumb.addEventListener('lostpointercapture', release);
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      hide();
      resize?.disconnect();
      scroll.removeEventListener('scroll', onScroll);
      thumb.removeEventListener('pointerdown', grab);
      thumb.removeEventListener('pointermove', move);
      thumb.removeEventListener('pointerup', release);
      thumb.removeEventListener('pointercancel', release);
      thumb.removeEventListener('lostpointercapture', release);
    };
  }, [enabled, scrollRef, thumbRef]);
}
