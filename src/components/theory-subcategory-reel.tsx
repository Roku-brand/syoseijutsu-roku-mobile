import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, type LayoutRectangle, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { AppText } from './ui';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };

export function TheorySubcategoryReel({ options, selected, onSelect }: {
  options: Option[]; selected?: string; onSelect: (id?: string) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, LayoutRectangle>());
  const offset = useRef(0);
  const drag = useRef<{ origin: number; previous: number; next: number } | undefined>(undefined);
  const lastWheel = useRef(-Infinity);
  const [viewport, setViewport] = useState(0);
  const [outerWidth, setOuterWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const [focused, setFocused] = useState<string>();
  const key = selected ?? 'all';
  const signature = options.map(option => option.subcategoryId ?? 'all').join('|');
  const getStops = useCallback(() => {
    const max = Math.max(0, contentWidth - viewport);
    return [...new Set([0, ...signature.split('|').map(id => {
      const item = layouts.current.get(id);
      return Math.max(0, Math.min((item?.x ?? 2) - 2, max));
    }), max])].sort((a, b) => a - b);
  }, [signature, contentWidth, viewport]);
  const scrollTo = useCallback((x: number) => {
    offset.current = x;
    scroll.current?.scrollTo({ x, animated: false });
  }, []);
  const neighbor = useCallback((from: number, direction: number) => {
    const stops = getStops();
    return (direction > 0 ? stops.find(stop => stop > from + 2) : stops.reverse().find(stop => stop < from - 2)) ?? from;
  }, [getStops]);
  const move = useCallback((direction: number) => scrollTo(neighbor(offset.current, direction)), [neighbor, scrollTo]);
  // Capture only horizontal drags so a tap still selects a tab and vertical
  // gestures still belong to the page. Each gesture is bounded by its neighbors.
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      const origin = offset.current;
      drag.current = { origin, previous: neighbor(origin, -1), next: neighbor(origin, 1) };
    },
    onPanResponderMove: (_, gesture) => {
      if (drag.current) scrollTo(Math.max(drag.current.previous, Math.min(drag.current.origin - gesture.dx, drag.current.next)));
    },
    onPanResponderRelease: (_, gesture) => {
      const start = drag.current;
      drag.current = undefined;
      if (start) scrollTo(Math.abs(gesture.dx) < 24 ? start.origin : gesture.dx < 0 ? start.next : start.previous);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      if (drag.current) scrollTo(drag.current.origin);
      drag.current = undefined;
    },
  }), [neighbor, scrollTo]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = scroll.current?.getScrollableNode() as HTMLElement | undefined;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      const delta = event.shiftKey && !event.deltaX ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (event.ctrlKey || !delta) return;
      event.preventDefault();
      // Trackpads emit a burst including momentum. One burst is one step.
      if (event.timeStamp - lastWheel.current > 180) move(Math.sign(delta));
      lastWheel.current = event.timeStamp;
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [move]);
  const reveal = useCallback((id: string) => {
    const layout = layouts.current.get(id);
    if (!layout || !viewport) return;
    const inset = 8;
    const outside = layout.x < offset.current + inset || layout.x + layout.width > offset.current + viewport - inset;
    const x = outside ? layout.x - 2 : offset.current;
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - viewport)), animated: false });
  }, [viewport, contentWidth]);
  // Initial "all" already starts at zero. Do not move the track while a user
  // is pressing another tab as the first content/layout measurements arrive.
  useEffect(() => { if (selected !== undefined) reveal(key); }, [key, selected, signature, reveal]);
  const left = position > 2;
  const right = position + viewport < contentWidth - 2;
  const overflow = contentWidth > outerWidth + 2;
  const showButtons = Platform.OS === 'web' && outerWidth >= 600 && overflow;
  return <View {...pan.panHandlers} testID="theory-subcategory-reel" style={styles.reel} onLayout={event => setOuterWidth(event.nativeEvent.layout.width)}>
    {showButtons ? <Pressable disabled={!left} accessibilityRole="button" accessibilityLabel="前の内部分類を表示" onPress={() => move(-1)} style={[styles.arrow, !left && styles.disabled]}><AppText>‹</AppText></Pressable> : null}
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} disableScrollViewPanResponder scrollEnabled={Platform.OS === 'web'}
      testID="theory-subcategory-scroll" style={[styles.scroll, Platform.OS === 'web' && ({ touchAction: 'pan-y pinch-zoom' } as ViewStyle)]} contentContainerStyle={styles.track}
      onLayout={event => setViewport(event.nativeEvent.layout.width)}
      onContentSizeChange={width => setContentWidth(width)} scrollEventThrottle={16}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; setPosition(offset.current); }}>
      {options.map(option => {
        const id = option.subcategoryId ?? 'all';
        const active = id === key;
        return <Pressable key={id} testID="theory-subcategory-tab" accessibilityRole="button"
          accessibilityLabel={`${option.title}で内部分類を絞り込む`} accessibilityState={{ selected: active }} aria-selected={active}
          onLayout={event => { layouts.current.set(id, event.nativeEvent.layout); if (id === key && selected !== undefined) reveal(id); }}
          // Browser keyboard focus scrolls into view itself. Moving the track
          // on pointer focus can cancel Pressable before pointer-up arrives.
          onFocus={() => setFocused(id)} onBlur={() => setFocused(undefined)}
          onPress={() => { onSelect(option.subcategoryId); reveal(id); }}
          style={({ pressed }) => [styles.tab, active && styles.active, focused === id && styles.focused, pressed && styles.pressed]}>
          <AppText style={[styles.label, active && styles.activeText]}>{option.title}</AppText>
          <AppText style={[styles.count, active && styles.activeText]}>{option.items.length}</AppText>
        </Pressable>;
      })}
    </ScrollView>
    {right ? <View pointerEvents="none" style={[styles.continuation, { right: showButtons ? 32 : 0 }]}><AppText style={styles.continuationText}>›</AppText></View> : null}
    {showButtons ? <Pressable disabled={!right} accessibilityRole="button" accessibilityLabel="次の内部分類を表示" onPress={() => move(1)} style={[styles.arrow, !right && styles.disabled]}><AppText>›</AppText></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  reel: { flexDirection: 'row', alignItems: 'center', minWidth: 0, position: 'relative' },
  scroll: { flex: 1, minWidth: 0 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  tab: { flexShrink: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  active: { backgroundColor: colors.gold, borderColor: colors.goldDeep },
  focused: { borderColor: colors.ink },
  label: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '600', flexShrink: 0 },
  count: { color: colors.muted, fontSize: 11, lineHeight: 18, flexShrink: 0 },
  activeText: { color: colors.surface, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.35 },
  arrow: { width: 32, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  continuation: { position: 'absolute', right: Platform.OS === 'web' ? 32 : 0, top: 5, bottom: 5, width: 16, backgroundColor: 'rgba(243,239,231,0.92)', justifyContent: 'center', alignItems: 'center' },
  continuationText: { color: colors.goldDeep, fontSize: 20 },
});
