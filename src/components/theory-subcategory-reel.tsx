import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppText } from './ui';
import { getCategoryLabelParts } from './category-filter-label';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };
const optionKey = (option?: Option) => option?.subcategoryId ?? 'all';

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
  const targetIndex = useRef(index);
  const dragging = useRef(false);
  const dragStart = useRef(0);
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
    const bounded = Math.max(0, Math.min(x, Math.max(0, current.options.length - 1) * current.slot));
    position.current = bounded;
    scrollX.setValue(bounded);
    if (Platform.OS === 'web') {
      const node = webScroll.current as unknown as HTMLElement | null;
      if (node) node.scrollLeft = bounded;
    } else scroll.current?.scrollTo({ x: bounded, y: 0, animated: false });
  }, [scrollX]);
  const commit = useCallback((requested: number) => {
    if (!mounted.current) return;
    const current = latest.current;
    const next = Math.max(0, Math.min(current.options.length - 1, requested));
    const option = current.options[next];
    if (!option) return;
    const previousTarget = targetIndex.current;
    targetIndex.current = next;
    if (next !== previousTarget || (optionKey(option) !== optionKey(current.options[current.index]) && !emitted.current.has(optionKey(option)))) {
      emitted.current.add(optionKey(option));
      current.onSelect(option.subcategoryId);
    }
  }, []);
  const navigate = useCallback((requested: number, animate = true) => {
    const current = latest.current;
    if (!mounted.current || !current.width || !current.options.length) return;
    stop();
    const next = Math.max(0, Math.min(current.options.length - 1, requested));
    commit(next);
    const from = position.current, destination = next * current.slot;
    if (!animate || current.reducedMotion || Math.abs(from - destination) < 0.5) { write(destination); return; }
    animating.current = true;
    const started = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / 200);
      write(from + (destination - from) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else { frame.current = null; animating.current = false; }
    };
    frame.current = requestAnimationFrame(tick);
  }, [stop, commit, write]);
  navigateRef.current = navigate;

  // URL changes, resizing and a changed set of categories restore a real scroll
  // position. Selections emitted by this reel keep their in-flight animation.
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stop(); };
  }, [stop]);
  useLayoutEffect(() => {
    stop(); emitted.current.clear(); dragging.current = false;
    targetIndex.current = latest.current.index;
    write(latest.current.index * latest.current.slot);
  }, [width, signature, fontScale, stop, write]);
  useLayoutEffect(() => {
    if (emitted.current.delete(key)) {
      if (optionKey(latest.current.options[targetIndex.current]) === key) emitted.current.clear();
      return;
    }
    stop(); targetIndex.current = latest.current.index;
    write(latest.current.index * latest.current.slot);
  }, [key, stop, write]);
  useEffect(() => { if (reducedMotion && animating.current) navigate(targetIndex.current, false); }, [reducedMotion, navigate]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => latest.current.width > 0 && gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { stop(); dragging.current = true; dragStart.current = position.current; },
    onPanResponderMove: (_, gesture) => write(dragStart.current - gesture.dx),
    onPanResponderRelease: () => { dragging.current = false; navigateRef.current(Math.round(position.current / latest.current.slot)); },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { dragging.current = false; navigateRef.current(targetIndex.current); },
  }), [stop, write]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewport.current as unknown as HTMLElement | null;
    const scroller = webScroll.current as unknown as HTMLElement | null;
    if (!node || !scroller) return;
    const onScroll = () => {
      if (!mounted.current) return;
      position.current = scroller.scrollLeft; scrollX.setValue(position.current);
      if (idle.current !== null) clearTimeout(idle.current);
      if (!dragging.current && !animating.current) idle.current = setTimeout(() => navigateRef.current(Math.round(position.current / latest.current.slot)), 100);
    };
    const wheel = (event: WheelEvent) => {
      const delta = event.shiftKey && !event.deltaX ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (event.ctrlKey || !delta) return;
      event.preventDefault(); stop();
      write(position.current + delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? latest.current.width : 1));
      idle.current = setTimeout(() => navigateRef.current(Math.round(position.current / latest.current.slot)), 100);
    };
    const keydown = (event: KeyboardEvent) => {
      let next: number;
      if (event.key === 'ArrowRight') next = targetIndex.current + 1;
      else if (event.key === 'ArrowLeft') next = targetIndex.current - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = latest.current.options.length - 1;
      else return;
      event.preventDefault(); navigateRef.current(next);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('keydown', keydown);
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => { node.removeEventListener('wheel', wheel); node.removeEventListener('keydown', keydown); scroller.removeEventListener('scroll', onScroll); };
  }, [stop, write, scrollX]);

  const renderOption = (option: Option, itemIndex: number) => {
    const active = itemIndex === index;
    const center = itemIndex * slot;
    const parts = getCategoryLabelParts(option.title);
    const label = parts.length > 1 && option.title.length * (width >= 500 ? 22 : 20) * fontScale > slot - 16 ? parts.join('\n') : option.title;
    return <Pressable key={optionKey(option)} testID={active ? 'theory-subcategory-tab' : 'theory-subcategory-preview'} accessibilityRole="button"
      accessibilityLabel={`${option.title}で内部分類を絞り込む`} accessibilityHint={`${option.items.length}件。左右にスワイプして選択できます`}
      accessibilityState={{ selected: active }} aria-selected={active} tabIndex={active ? 0 : -1}
      onPress={() => navigate(itemIndex)} style={[styles.item, { width: slot, minHeight: stageHeight }]}>
      <Animated.View style={[styles.copy, { opacity: scrollX.interpolate({ inputRange: [center - slot * 1.5, center - slot, center, center + slot, center + slot * 1.5], outputRange: [0, 0.65, 1, 0.65, 0], extrapolate: 'clamp' }), transform: [
        { translateX: scrollX.interpolate({ inputRange: [center - slot, center, center + slot], outputRange: [-slot * 0.27, 0, slot * 0.27], extrapolate: 'clamp' }) },
        { scale: scrollX.interpolate({ inputRange: [center - slot, center, center + slot], outputRange: [0.82, 1, 0.82], extrapolate: 'clamp' }) },
      ] }]}>
        <AppText accessibilityRole={active ? 'header' : undefined} aria-level={active ? 3 : undefined} accessibilityLabel={active ? option.title : undefined}
          onLayout={event => { textMeasurements.current.set(optionKey(option), event.nativeEvent.layout.height); setTextHeight(Math.max(...textMeasurements.current.values())); }}
          style={[styles.title, width >= 500 && styles.titleWide, active && styles.titleActive]}>{label}</AppText>
      </Animated.View>
    </Pressable>;
  };

  if (!options[index]) return null;
  return <View testID="theory-subcategory-reel" style={styles.reel}>
    <View style={styles.heading}>
      <AppText style={styles.label}>内部分類</AppText>
      <AppText testID="theory-subcategory-position" accessibilityLiveRegion="polite" style={styles.position}>{index + 1} / {options.length}</AppText>
    </View>
    <View ref={viewport} {...(Platform.OS === 'web' ? pan.panHandlers : {})} style={styles.viewport}>
      {Platform.OS === 'web' ? <View ref={webScroll} testID="theory-subcategory-scroll"
        onLayout={event => { const next = event.nativeEvent.layout.width; setWidth(current => Math.abs(next - current) > 0.5 ? next : current); }}
        style={[styles.webScroll, { height: stageHeight }]}>
        <View style={{ flexDirection: 'row', width: options.length * slot + Math.max(0, width - slot), paddingHorizontal: Math.max(0, (width - slot) / 2) }}>{options.map(renderOption)}</View>
      </View> : <ScrollView ref={scroll} horizontal testID="theory-subcategory-scroll" showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16} bounces={false} overScrollMode="never" decelerationRate="fast" disableIntervalMomentum
        snapToInterval={slot} snapToAlignment="start" directionalLockEnabled
        style={{ height: stageHeight }}
        contentContainerStyle={{ paddingHorizontal: Math.max(0, (width - slot) / 2) }}
        onLayout={event => { const next = event.nativeEvent.layout.width; setWidth(current => Math.abs(next - current) > 0.5 ? next : current); }}
        onContentSizeChange={() => { if (!dragging.current && !animating.current) write(targetIndex.current * latest.current.slot); }}
        onScroll={event => {
          if (!mounted.current) return;
          position.current = event.nativeEvent.contentOffset.x; scrollX.setValue(position.current);
          if (idle.current !== null) clearTimeout(idle.current);
          if (!dragging.current && !animating.current) idle.current = setTimeout(() => navigateRef.current(Math.round(position.current / latest.current.slot)), 100);
        }}
        onScrollBeginDrag={() => { stop(); dragging.current = true; }}
        onScrollEndDrag={event => {
          dragging.current = false;
          commit(Math.round((event.nativeEvent.targetContentOffset?.x ?? event.nativeEvent.contentOffset.x) / latest.current.slot));
        }}
        onMomentumScrollEnd={event => { dragging.current = false; navigateRef.current(Math.round(event.nativeEvent.contentOffset.x / latest.current.slot), false); }}>
        {options.map(renderOption)}
      </ScrollView>}
    </View>
    <View testID="theory-subcategory-underline" style={styles.underline} />
    <View testID="theory-subcategory-indicators" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.dots}>
      {options.map((option, itemIndex) => <View key={optionKey(option)} testID={itemIndex === index ? 'theory-subcategory-indicator-active' : undefined} style={[styles.dot, itemIndex === index && styles.dotActive]} />)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  reel: { minWidth: 0, width: '100%' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 },
  label: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  position: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  viewport: { minWidth: 0, width: '100%', overflow: 'hidden' },
  webScroll: { minWidth: 0, width: '100%', ...Platform.select({ web: { overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', touchAction: 'pan-y pinch-zoom', overscrollBehaviorX: 'contain' } }) } as ViewStyle,
  item: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'transparent' },
  copy: { width: '100%', paddingHorizontal: 8 },
  title: { color: '#9B968D', fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, fontWeight: '400', textAlign: 'center', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  titleWide: { fontSize: 22, lineHeight: 28 }, titleActive: { color: colors.ink, fontWeight: '600' },
  underline: { alignSelf: 'center', width: 52, height: 2, backgroundColor: colors.gold },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 4, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DDD7CC' },
  dotActive: { width: 12, backgroundColor: colors.gold },
});
