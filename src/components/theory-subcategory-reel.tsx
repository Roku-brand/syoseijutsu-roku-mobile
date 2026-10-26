import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppText } from './ui';
import { getCategoryLabelParts } from './category-filter-label';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };
const optionKey = (option?: Option) => option?.subcategoryId ?? 'all';
const optionIndex = (position: number, count: number) => count ? ((position % count) + count) % count : 0;
const middleIndex = (index: number, count: number) => count > 1 ? count + optionIndex(index, count) : 0;
const reelLength = (count: number) => count > 1 ? count * 3 : count;

export function TheorySubcategoryReel({ options, selected, onSelect }: {
  options: Option[]; selected?: string; onSelect: (id?: string) => void;
}) {
  'use no memo';
  const scroll = useRef<ScrollView>(null);
  const webScroll = useRef<View>(null);
  const viewport = useRef<View>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const textMeasurements = useRef(new Map<string, number>());
  const { fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const index = Math.max(0, options.findIndex(option => option.subcategoryId === selected));
  const slot = width > 0 ? Math.max(1, Math.min(Math.max(176, width * 0.7), width - 48)) : 240;
  const stageHeight = Math.max(Math.ceil((width >= 500 ? 60 : 56) * fontScale), textHeight + 4);
  const signature = options.map(optionKey).join('|');
  const key = selected ?? 'all';
  useLayoutEffect(() => { textMeasurements.current.clear(); setTextHeight(0); }, [slot, signature, fontScale]);
  const latest = useRef({ options, index, onSelect, slot, width, reducedMotion });
  latest.current = { options, index, onSelect, slot, width, reducedMotion };
  const position = useRef(0);
  const pendingPosition = useRef<number | null>(null);
  const targetIndex = useRef(middleIndex(index, options.length));
  const dragging = useRef(false);
  const momentum = useRef(false);
  const animating = useRef(false);
  const frame = useRef<number | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitted = useRef(new Set<string>());
  const mounted = useRef(true);
  const navigateRef = useRef<(index: number, animate?: boolean) => void>(() => {});

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (idle.current !== null) clearTimeout(idle.current);
    frame.current = null;
    idle.current = null;
    animating.current = false;
  }, []);
  const write = useCallback((x: number) => {
    if (!mounted.current) return;
    const current = latest.current;
    const bounded = Math.max(0, Math.min(x, Math.max(0, reelLength(current.options.length) - 1) * current.slot));
    position.current = bounded;
    scrollX.setValue(bounded);
    if (Platform.OS === 'web') {
      const node = webScroll.current as unknown as HTMLElement | null;
      pendingPosition.current = bounded;
      node?.scrollTo({ left: bounded, behavior: 'instant' });
    } else scroll.current?.scrollTo({ x: bounded, y: 0, animated: false });
  }, [scrollX]);
  const commit = useCallback((requested: number) => {
    if (!mounted.current) return;
    const current = latest.current;
    const physicalIndex = Math.max(0, Math.min(reelLength(current.options.length) - 1, requested));
    const next = optionIndex(physicalIndex, current.options.length);
    const option = current.options[next];
    if (!option) return;
    const previousTarget = optionIndex(targetIndex.current, current.options.length);
    targetIndex.current = physicalIndex;
    if (next !== previousTarget || (optionKey(option) !== optionKey(current.options[current.index]) && !emitted.current.has(optionKey(option)))) {
      emitted.current.add(optionKey(option));
      current.onSelect(option.subcategoryId);
    }
  }, []);
  // The outer copies supply neighbours at both ends. Rebase only once scrolling
  // has settled, so a finger drag and its momentum are never interrupted.
  const recenter = useCallback(() => {
    const current = latest.current;
    if (!mounted.current || !current.options.length || dragging.current || momentum.current) return;
    const physicalIndex = Math.round(position.current / current.slot);
    const centered = middleIndex(physicalIndex, current.options.length);
    targetIndex.current = centered;
    if (physicalIndex !== centered) write(centered * current.slot);
  }, [write]);
  const settleNative = useCallback(() => {
    if (!mounted.current || dragging.current || momentum.current || animating.current) return;
    commit(Math.round(position.current / latest.current.slot));
    recenter();
  }, [commit, recenter]);
  const navigate = useCallback((requested: number, animate = true) => {
    const current = latest.current;
    if (!mounted.current || !current.width || !current.options.length) return;
    stop();
    dragging.current = false;
    momentum.current = false;
    const next = Math.max(0, Math.min(reelLength(current.options.length) - 1, requested));
    commit(next);
    const from = position.current, destination = next * current.slot;
    if (Platform.OS === 'web') {
      const node = webScroll.current as unknown as HTMLElement | null;
      const instant = !animate || current.reducedMotion || Math.abs(from - destination) < 0.5;
      animating.current = !instant;
      pendingPosition.current = destination;
      node?.scrollTo({ left: destination, behavior: instant ? 'instant' : 'smooth' });
      if (instant) { position.current = destination; scrollX.setValue(destination); recenter(); }
      return;
    }
    if (!animate || current.reducedMotion || Math.abs(from - destination) < 0.5) { write(destination); recenter(); return; }
    animating.current = true;
    const started = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / 200);
      write(from + (destination - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else { frame.current = null; animating.current = false; recenter(); }
    };
    frame.current = requestAnimationFrame(tick);
  }, [stop, commit, write, scrollX, recenter]);
  navigateRef.current = navigate;

  // URL changes, resizing and a changed set of categories restore a real scroll
  // position. Selections emitted by this reel keep their in-flight animation.
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, [stop]);
  useLayoutEffect(() => {
    stop(); emitted.current.clear(); dragging.current = false; momentum.current = false;
    targetIndex.current = middleIndex(latest.current.index, latest.current.options.length);
    write(targetIndex.current * latest.current.slot);
  }, [width, signature, fontScale, stop, write]);
  useLayoutEffect(() => {
    if (emitted.current.delete(key)) {
      if (optionKey(latest.current.options[optionIndex(targetIndex.current, latest.current.options.length)]) === key) emitted.current.clear();
      return;
    }
    stop(); targetIndex.current = middleIndex(latest.current.index, latest.current.options.length);
    write(targetIndex.current * latest.current.slot);
  }, [key, stop, write]);
  useEffect(() => { if (reducedMotion && animating.current) navigate(targetIndex.current, false); }, [reducedMotion, navigate]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewport.current as unknown as HTMLElement | null;
    const scroller = webScroll.current as unknown as HTMLElement | null;
    if (!node || !scroller) return;
    let mouse: { id: number; x: number; scrollLeft: number; moved: boolean } | null = null;
    let suppressClick = false;
    const hasScrollEnd = 'onscrollend' in scroller;
    const settle = () => {
      if (!mounted.current || dragging.current || !latest.current.width) return;
      if (idle.current !== null) clearTimeout(idle.current);
      idle.current = null;
      animating.current = false;
      position.current = scroller.scrollLeft;
      scrollX.setValue(position.current);
      // Initial CSS snapping can emit scrollend before the measured width is
      // applied. Restore the requested URL position instead of selecting item 0.
      if (pendingPosition.current !== null) {
        if (Math.abs(position.current - pendingPosition.current) > 1) {
          scroller.scrollTo({ left: pendingPosition.current, behavior: 'instant' });
          return;
        }
        pendingPosition.current = null;
      } else commit(Math.round(position.current / latest.current.slot));
      scroller.style.removeProperty('scroll-snap-type');
      recenter();
    };
    const scheduleSettle = () => {
      if (idle.current !== null) clearTimeout(idle.current);
      if (!hasScrollEnd && !dragging.current) idle.current = setTimeout(settle, 200);
    };
    const onScroll = () => {
      if (!mounted.current) return;
      position.current = scroller.scrollLeft; scrollX.setValue(position.current);
      scheduleSettle();
    };
    // Touch scrolling, inertia and snapping belong to the browser. Rewriting
    // scrollLeft on a timer while the finger is down interrupts that gesture.
    const touchStart = () => { stop(); pendingPosition.current = null; dragging.current = true; };
    const touchEnd = (event: TouchEvent) => {
      if (event.touches.length) return;
      dragging.current = false;
      scheduleSettle();
    };
    const touchCancel = () => {
      dragging.current = false;
      navigateRef.current(targetIndex.current);
    };
    // Keep mouse dragging, without capturing the browser's touch gestures.
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      stop(); pendingPosition.current = null; suppressClick = false;
      mouse = { id: event.pointerId, x: event.clientX, scrollLeft: scroller.scrollLeft, moved: false };
    };
    const pointerMove = (event: PointerEvent) => {
      if (!mouse || mouse.id !== event.pointerId) return;
      const distance = event.clientX - mouse.x;
      if (!mouse.moved && Math.abs(distance) < 6) return;
      if (!mouse.moved) {
        mouse.moved = true;
        dragging.current = true;
        scroller.style.scrollSnapType = 'none';
        scroller.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      write(mouse.scrollLeft - distance);
    };
    const pointerEnd = (event: PointerEvent) => {
      if (!mouse || mouse.id !== event.pointerId) return;
      const moved = mouse.moved;
      mouse = null;
      dragging.current = false;
      if (scroller.hasPointerCapture(event.pointerId)) scroller.releasePointerCapture(event.pointerId);
      if (moved) {
        suppressClick = true;
        navigateRef.current(Math.round(scroller.scrollLeft / latest.current.slot));
        if (!animating.current) settle();
      }
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault(); event.stopPropagation();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        stop(); pendingPosition.current = null;
        return;
      }
      // Horizontal trackpad input scrolls natively; Shift+wheel is an explicit
      // horizontal shortcut, so it must not also scroll the surrounding page.
      if (!event.shiftKey || event.deltaX || !event.deltaY) return;
      event.preventDefault(); stop();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? latest.current.width : 1);
      const steps = Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / latest.current.slot));
      navigateRef.current(Math.round(scroller.scrollLeft / latest.current.slot) + steps);
    };
    const keydown = (event: KeyboardEvent) => {
      let next: number;
      if (event.key === 'ArrowRight') next = targetIndex.current + 1;
      else if (event.key === 'ArrowLeft') next = targetIndex.current - 1;
      else if (event.key === 'Home') next = middleIndex(0, latest.current.options.length);
      else if (event.key === 'End') next = middleIndex(latest.current.options.length - 1, latest.current.options.length);
      else return;
      event.preventDefault(); navigateRef.current(next);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('keydown', keydown);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('scrollend', settle);
    scroller.addEventListener('touchstart', touchStart, { passive: true });
    scroller.addEventListener('touchend', touchEnd, { passive: true });
    scroller.addEventListener('touchcancel', touchCancel, { passive: true });
    scroller.addEventListener('pointerdown', pointerDown);
    scroller.addEventListener('pointermove', pointerMove);
    scroller.addEventListener('pointerup', pointerEnd);
    scroller.addEventListener('pointercancel', pointerEnd);
    scroller.addEventListener('lostpointercapture', pointerEnd);
    scroller.addEventListener('click', click, true);
    return () => {
      node.removeEventListener('wheel', wheel); node.removeEventListener('keydown', keydown);
      scroller.removeEventListener('scroll', onScroll); scroller.removeEventListener('scrollend', settle);
      scroller.removeEventListener('touchstart', touchStart); scroller.removeEventListener('touchend', touchEnd); scroller.removeEventListener('touchcancel', touchCancel);
      scroller.removeEventListener('pointerdown', pointerDown); scroller.removeEventListener('pointermove', pointerMove);
      scroller.removeEventListener('pointerup', pointerEnd); scroller.removeEventListener('pointercancel', pointerEnd); scroller.removeEventListener('lostpointercapture', pointerEnd);
      scroller.removeEventListener('click', click, true);
      scroller.style.removeProperty('scroll-snap-type');
      stop();
    };
  }, [stop, write, scrollX, commit, recenter]);

  const renderOption = (option: Option, physicalIndex: number) => {
    const itemIndex = optionIndex(physicalIndex, options.length);
    const canonical = options.length <= 1 || (physicalIndex >= options.length && physicalIndex < options.length * 2);
    const active = itemIndex === index;
    const center = physicalIndex * slot;
    const parts = getCategoryLabelParts(option.title);
    const label = parts.length > 1 && option.title.length * (width >= 500 ? 22 : 20) * fontScale > slot - 16 ? parts.join('\n') : option.title;
    return <Pressable key={`${physicalIndex}:${optionKey(option)}`} testID={canonical && active ? 'theory-subcategory-tab' : 'theory-subcategory-preview'} accessibilityRole="button"
      accessible={canonical} accessibilityElementsHidden={!canonical} importantForAccessibility={canonical ? 'auto' : 'no-hide-descendants'} aria-hidden={!canonical || undefined}
      accessibilityLabel={option.subcategoryId ? `${option.title}で理論を絞り込む` : 'この分類のすべての理論を表示'} accessibilityHint={`${option.items.length}件。左右にスワイプして選択できます`}
      accessibilityState={{ selected: active }} aria-selected={active} tabIndex={canonical && active ? 0 : -1}
      onPress={() => navigate(physicalIndex)} style={[styles.item, { width: slot, minHeight: stageHeight }]}>
      <Animated.View style={[styles.copy, { opacity: scrollX.interpolate({ inputRange: [center - slot * 1.5, center - slot, center, center + slot, center + slot * 1.5], outputRange: [0, 0.65, 1, 0.65, 0], extrapolate: 'clamp' }), transform: [
        { translateX: scrollX.interpolate({ inputRange: [center - slot, center, center + slot], outputRange: [-slot * 0.27, 0, slot * 0.27], extrapolate: 'clamp' }) },
        { scale: scrollX.interpolate({ inputRange: [center - slot, center, center + slot], outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' }) },
      ] }]}>
        <AppText accessibilityRole={canonical && active ? 'header' : undefined} aria-level={canonical && active ? 3 : undefined} accessibilityLabel={canonical && active ? option.title : undefined}
          onLayout={event => { textMeasurements.current.set(optionKey(option), event.nativeEvent.layout.height); setTextHeight(Math.max(...textMeasurements.current.values())); }}
          style={[styles.title, width >= 500 && styles.titleWide, active && styles.titleActive]}>{label}</AppText>
      </Animated.View>
    </Pressable>;
  };

  if (!options[index]) return null;
  const repeatedOptions = options.length > 1 ? [...options, ...options, ...options] : options;
  return <View testID="theory-subcategory-reel" style={styles.reel}>
    <View style={styles.heading}>
      <AppText testID="theory-subcategory-position" accessibilityLiveRegion="polite" style={styles.position}>{index + 1} / {options.length}</AppText>
    </View>
    <View ref={viewport} style={styles.viewport}>
      {Platform.OS === 'web' ? <View ref={webScroll} testID="theory-subcategory-scroll"
        onLayout={event => { const next = event.nativeEvent.layout.width; setWidth(current => Math.abs(next - current) > 0.5 ? next : current); }}
        style={[styles.webScroll, { height: stageHeight }]}>
        <View style={{ flexDirection: 'row', width: repeatedOptions.length * slot + Math.max(0, width - slot), paddingHorizontal: Math.max(0, (width - slot) / 2) }}>{repeatedOptions.map(renderOption)}</View>
      </View> : <ScrollView ref={scroll} horizontal testID="theory-subcategory-scroll" showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16} bounces={false} overScrollMode="never" decelerationRate="fast" disableIntervalMomentum
        snapToInterval={slot} snapToAlignment="start" directionalLockEnabled
        style={{ height: stageHeight }}
        contentContainerStyle={{ paddingHorizontal: Math.max(0, (width - slot) / 2) }}
        onLayout={event => { const next = event.nativeEvent.layout.width; setWidth(current => Math.abs(next - current) > 0.5 ? next : current); }}
        onContentSizeChange={() => { if (!dragging.current && !momentum.current && !animating.current) write(targetIndex.current * latest.current.slot); }}
        onScroll={event => {
          if (!mounted.current) return;
          position.current = event.nativeEvent.contentOffset.x; scrollX.setValue(position.current);
          if (idle.current !== null) clearTimeout(idle.current);
          if (!dragging.current && !momentum.current && !animating.current) idle.current = setTimeout(settleNative, 200);
        }}
        onScrollBeginDrag={() => { stop(); momentum.current = false; dragging.current = true; }}
        onScrollEndDrag={event => {
          dragging.current = false;
          position.current = event.nativeEvent.contentOffset.x;
          // A slow drag may not start momentum. The momentum-begin event
          // cancels this fallback before it can commit an intermediate item.
          idle.current = setTimeout(() => {
            settleNative();
          }, 200);
        }}
        onMomentumScrollBegin={() => {
          momentum.current = true;
          if (idle.current !== null) clearTimeout(idle.current);
        }}
        onMomentumScrollEnd={event => {
          dragging.current = false; momentum.current = false;
          position.current = event.nativeEvent.contentOffset.x;
          scrollX.setValue(position.current);
          settleNative();
        }}>
        {repeatedOptions.map(renderOption)}
      </ScrollView>}
    </View>
    <View testID="theory-subcategory-indicators" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.dots}>
      {options.map((option, itemIndex) => <View key={optionKey(option)} testID={itemIndex === index ? 'theory-subcategory-indicator-active' : undefined} style={[styles.dot, itemIndex === index && styles.dotActive]} />)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  reel: { minWidth: 0, width: '100%' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 },
  position: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  viewport: { minWidth: 0, width: '100%', overflow: 'hidden' },
  webScroll: { minWidth: 0, width: '100%', ...Platform.select({ web: { overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', touchAction: 'pan-x pan-y pinch-zoom', overscrollBehaviorX: 'contain', scrollSnapType: 'x mandatory' } }) } as ViewStyle,
  item: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'transparent', ...Platform.select({ web: { scrollSnapAlign: 'center', userSelect: 'none' } }) } as ViewStyle,
  copy: { width: '100%', paddingHorizontal: 8 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, fontWeight: '400', textAlign: 'center', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  titleWide: { fontSize: 22, lineHeight: 28 }, titleActive: { color: colors.ink, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 4, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DDD7CC' },
  dotActive: { width: 12, backgroundColor: catalogTheme.theory.ink },
});
