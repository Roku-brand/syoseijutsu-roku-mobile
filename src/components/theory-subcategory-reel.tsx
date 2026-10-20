import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { AppText } from './ui';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };
const optionKey = (option?: Option) => option?.subcategoryId ?? 'all';
const wrap = (index: number, length: number) => ((index % length) + length) % length;

export function TheorySubcategoryReel({ options, selected, onSelect }: {
  options: Option[]; selected?: string; onSelect: (id?: string) => void;
}) {
  const viewport = useRef<View>(null);
  const offset = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const busy = useRef(false);
  const dragging = useRef(false);
  const dragOffset = useRef(0);
  const mounted = useRef(true);
  const queue = useRef<number[]>([]);
  const expected = useRef<string | null>(null);
  const nextFrame = useRef<number | null>(null);
  const moveRef = useRef<(direction: number) => void>(() => {});
  const lastWheel = useRef(-Infinity);
  const index = Math.max(0, options.findIndex(option => option.subcategoryId === selected));
  const latest = useRef({ options, index, onSelect });
  latest.current = { options, index, onSelect };
  const signature = options.map(optionKey).join('|');
  const key = selected ?? 'all';
  const distance = width + 8;

  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted.current) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted.current = false;
      subscription.remove();
      offset.stopAnimation();
      if (nextFrame.current !== null) cancelAnimationFrame(nextFrame.current);
      queue.current = [];
    };
  }, [offset]);

  const move = useCallback((direction: number) => {
    const current = latest.current;
    if (current.options.length < 2 || !width) return;
    if (busy.current || dragging.current) {
      queue.current.push(direction);
      return;
    }
    const target = current.options[wrap(current.index + direction, current.options.length)];
    expected.current = optionKey(target);
    busy.current = true;
    if (reduceMotion) {
      current.onSelect(target.subcategoryId);
      return;
    }
    Animated.timing(offset, {
      toValue: -direction * distance,
      duration: Math.max(80, Math.min(300, 300 * Math.abs(-direction * distance - dragOffset.current) / distance)),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && mounted.current) latest.current.onSelect(target.subcategoryId);
    });
  }, [width, distance, reduceMotion, offset]);
  moveRef.current = move;

  // Re-center before painting the newly selected card, including at either
  // end of the catalogue. External URL/category changes cancel queued moves.
  useLayoutEffect(() => {
    const ownSelection = expected.current === key;
    expected.current = null;
    offset.stopAnimation();
    offset.setValue(0);
    busy.current = false;
    dragging.current = false;
    dragOffset.current = 0;
    if (nextFrame.current !== null) cancelAnimationFrame(nextFrame.current);
    if (!ownSelection) queue.current = [];
    const next = queue.current.shift();
    if (next !== undefined) nextFrame.current = requestAnimationFrame(() => {
      nextFrame.current = null;
      moveRef.current(next);
    });
  }, [key, signature, width, reduceMotion, offset]);

  const settleBack = useCallback(() => {
    dragging.current = false;
    busy.current = true;
    const finish = () => {
      busy.current = false;
      dragOffset.current = 0;
      const next = queue.current.shift();
      if (next !== undefined) moveRef.current(next);
    };
    if (reduceMotion) {
      offset.setValue(0);
      finish();
    } else {
      Animated.timing(offset, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' })
        .start(({ finished }) => { if (finished && mounted.current) finish(); });
    }
  }, [reduceMotion, offset]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => !busy.current && width > 0 && gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => { dragging.current = true; },
    onPanResponderMove: (_, gesture) => {
      if (!reduceMotion) {
        dragOffset.current = Math.max(-distance, Math.min(gesture.dx, distance));
        offset.setValue(dragOffset.current);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      dragging.current = false;
      if (Math.abs(gesture.dx) >= 24) move(gesture.dx < 0 ? 1 : -1);
      else settleBack();
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: settleBack,
  }), [width, distance, reduceMotion, offset, move, settleBack]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewport.current as unknown as HTMLElement | null;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      const delta = event.shiftKey && !event.deltaX ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (event.ctrlKey || !delta) return;
      event.preventDefault();
      if (event.timeStamp - lastWheel.current > 180) move(Math.sign(delta));
      lastWheel.current = event.timeStamp;
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      if (event.repeat && (busy.current || dragging.current)) return;
      move(event.key === 'ArrowRight' ? 1 : -1);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('keydown', keydown);
    return () => {
      node.removeEventListener('wheel', wheel);
      node.removeEventListener('keydown', keydown);
    };
  }, [move]);

  const option = options[index];
  if (!option) return null;
  const multiple = options.length > 1;
  const copy = (item: Option) => <><AppText style={styles.label}>{item.title}</AppText><AppText style={styles.count}>{item.items.length}</AppText></>;
  return <View {...pan.panHandlers} testID="theory-subcategory-reel" style={styles.reel}>
    <Pressable disabled={!multiple} accessibilityRole="button" accessibilityLabel="前の内部分類を表示" accessibilityHint="最初の分類の前は最後の分類へ戻ります" onPress={() => move(-1)} style={({ pressed }) => [styles.arrow, !multiple && styles.disabled, pressed && styles.pressed]}><AppText style={styles.arrowText}>‹</AppText></Pressable>
    <View ref={viewport} testID="theory-subcategory-scroll" onLayout={event => { const nextWidth = event.nativeEvent.layout.width; setWidth(current => Math.abs(current - nextWidth) > 0.5 ? nextWidth : current); }} style={[styles.viewport, Platform.OS === 'web' && ({ touchAction: 'pan-y pinch-zoom' } as ViewStyle)]}>
      {multiple && width > 0 ? [-1, 1].map(direction => <Animated.View key={direction} testID="theory-subcategory-preview" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden={true} style={[styles.preview, { transform: [{ translateX: Animated.add(offset, direction * distance) }] }]}><View style={styles.tab}>{copy(options[wrap(index + direction, options.length)])}</View></Animated.View>) : null}
      <Animated.View testID="theory-subcategory-motion" style={{ transform: [{ translateX: offset }] }}>
        <Pressable testID="theory-subcategory-tab" accessibilityRole="button"
          accessibilityLabel={`${option.title}で内部分類を絞り込む`} accessibilityState={{ selected: true }} aria-selected={true}
          onPress={() => onSelect(option.subcategoryId)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>{copy(option)}</Pressable>
      </Animated.View>
    </View>
    <Pressable disabled={!multiple} accessibilityRole="button" accessibilityLabel="次の内部分類を表示" accessibilityHint="最後の分類の次は最初の分類へ進みます" onPress={() => move(1)} style={({ pressed }) => [styles.arrow, !multiple && styles.disabled, pressed && styles.pressed]}><AppText style={styles.arrowText}>›</AppText></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  reel: { flexDirection: 'row', alignItems: 'stretch', minWidth: 0, gap: 8 },
  viewport: { flex: 1, minWidth: 0, overflow: 'hidden', borderRadius: radius.sm },
  preview: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tab: { width: '100%', minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: colors.goldDeep, borderRadius: radius.sm, backgroundColor: colors.gold },
  label: { color: colors.surface, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  count: { color: colors.surface, fontSize: 11, lineHeight: 18, flexShrink: 0 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.35 },
  arrow: { width: 44, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  arrowText: { color: colors.goldDeep, fontSize: 26, lineHeight: 32 },
});
