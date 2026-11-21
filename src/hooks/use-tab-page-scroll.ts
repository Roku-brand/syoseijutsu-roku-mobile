import { useFocusEffect, useUnstableGlobalHref } from 'expo-router';
import { useCallback, useRef, type RefObject } from 'react';
import { Platform, type ScrollView } from 'react-native';
import { useMainSectionNavigation } from '@/navigation/main-section-state';

export function useTabPageScroll(scroll: RefObject<ScrollView | null>, enabled: boolean) {
  const { currentPage } = useMainSectionNavigation();
  const href = useUnstableGlobalHref();
  const focused = useRef<typeof currentPage.current | null>(null);
  const requested = useRef<number | null>(null);
  const viewport = useRef(0);
  const content = useRef(0);
  const restore = useCallback(() => {
    const y = requested.current;
    if (y === null) return;
    if (Platform.OS === 'web') {
      const node: HTMLElement | null = scroll.current?.getScrollableNode();
      if (!node?.clientHeight || node.scrollHeight - node.clientHeight < y - 1) return;
      requested.current = null;
      node.scrollTop = y;
    } else if (viewport.current && content.current - viewport.current >= y - 1) {
      requested.current = null;
      scroll.current?.scrollTo({ y, animated: false });
    }
  }, [scroll]);

  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    let registered: ScrollView | undefined;
    const frame = requestAnimationFrame(() => {
      const entry = currentPage.current;
      focused.current = entry;
      registered = scroll.current ?? undefined;
      entry.scroll = registered;
      if (entry.resumed && entry.page.scrollY > 0) {
        requested.current = entry.page.scrollY;
        restore();
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (focused.current && focused.current.scroll === registered) focused.current.scroll = undefined;
      focused.current = null;
      requested.current = null;
    };
  }, [currentPage, enabled, href, restore, scroll]));

  return {
    onLayout: (height: number) => { viewport.current = height; restore(); },
    onContentSizeChange: (height: number) => { content.current = height; restore(); },
    onScroll: (y: number) => {
      if (focused.current && requested.current === null) focused.current.page.scrollY = Math.max(0, y);
    },
    cancelRestore: () => { requested.current = null; },
  };
}
