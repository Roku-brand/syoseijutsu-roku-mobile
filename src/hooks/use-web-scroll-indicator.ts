import { useEffect, type RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

const INSET = 6;
const MIN_THUMB_HEIGHT = 26;
const HIDE_DELAY = 550;

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
    const hide = () => {
      window.clearTimeout(timer);
      timer = undefined;
      thumb.style.opacity = '0';
    };
    const position = () => {
      const { clientHeight, scrollHeight, scrollTop } = scroll;
      const range = scrollHeight - clientHeight;
      const track = clientHeight - INSET * 2;
      if (range <= 1 || track <= 0) {
        hide();
        return false;
      }
      const height = Math.min(track, Math.max(MIN_THUMB_HEIGHT, track * clientHeight / scrollHeight));
      const progress = Math.max(0, Math.min(1, scrollTop / range));
      thumb.style.height = `${height}px`;
      thumb.style.transform = `translateY(${INSET + (track - height) * progress}px)`;
      return true;
    };
    const onScroll = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        if (scroll.scrollTop === previousTop) return;
        previousTop = scroll.scrollTop;
        if (!position()) return;
        thumb.style.opacity = '1';
        window.clearTimeout(timer);
        timer = window.setTimeout(hide, HIDE_DELAY);
      });
    };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      if (timer !== undefined) position();
    }) : null;
    resize?.observe(scroll);
    const content: HTMLElement | null = scrollRef.current?.getInnerViewNode();
    if (content) resize?.observe(content);
    scroll.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      hide();
      resize?.disconnect();
      scroll.removeEventListener('scroll', onScroll);
    };
  }, [enabled, scrollRef, thumbRef]);
}
