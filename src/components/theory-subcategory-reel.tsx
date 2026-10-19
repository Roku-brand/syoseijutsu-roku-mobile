import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { AppText } from './ui';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };

export function TheorySubcategoryReel({ options, selected, onSelect }: {
  options: Option[]; selected?: string; onSelect: (id?: string) => void;
}) {
  const viewport = useRef<View>(null);
  const lastWheel = useRef(-Infinity);
  const index = Math.max(0, options.findIndex(option => option.subcategoryId === selected));
  const option = options[index];
  const move = useCallback((direction: number) => {
    const next = index + direction;
    if (next >= 0 && next < options.length) onSelect(options[next].subcategoryId);
  }, [index, options, onSelect]);
  // Select only the adjacent category after a completed horizontal gesture.
  // Vertical gestures remain available to the page; cancellation does nothing.
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.numberActiveTouches === 1 && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) >= 24) move(gesture.dx < 0 ? 1 : -1);
    },
    onPanResponderTerminationRequest: () => true,
  }), [move]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = viewport.current as unknown as HTMLElement | null;
    if (!node) return;
    const wheel = (event: WheelEvent) => {
      const delta = event.shiftKey && !event.deltaX ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0;
      if (event.ctrlKey || !delta) return;
      event.preventDefault();
      // Treat trackpad momentum as part of the same gesture.
      if (event.timeStamp - lastWheel.current > 180) move(Math.sign(delta));
      lastWheel.current = event.timeStamp;
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    node.addEventListener('keydown', keydown);
    return () => {
      node.removeEventListener('wheel', wheel);
      node.removeEventListener('keydown', keydown);
    };
  }, [move]);

  if (!option) return null;
  return <View {...pan.panHandlers} testID="theory-subcategory-reel" style={styles.reel}>
    <Pressable disabled={index === 0} accessibilityRole="button" accessibilityLabel="前の内部分類を表示" onPress={() => move(-1)} style={({ pressed }) => [styles.arrow, index === 0 && styles.disabled, pressed && styles.pressed]}><AppText style={styles.arrowText}>‹</AppText></Pressable>
    <View ref={viewport} testID="theory-subcategory-scroll" style={[styles.viewport, Platform.OS === 'web' && ({ touchAction: 'pan-y pinch-zoom' } as ViewStyle)]}>
      <Pressable testID="theory-subcategory-tab" accessibilityRole="button"
        accessibilityLabel={`${option.title}で内部分類を絞り込む`} accessibilityState={{ selected: true }} aria-selected={true}
        onPress={() => onSelect(option.subcategoryId)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <AppText style={styles.label}>{option.title}</AppText>
        <AppText style={styles.count}>{option.items.length}</AppText>
      </Pressable>
    </View>
    <Pressable disabled={index === options.length - 1} accessibilityRole="button" accessibilityLabel="次の内部分類を表示" onPress={() => move(1)} style={({ pressed }) => [styles.arrow, index === options.length - 1 && styles.disabled, pressed && styles.pressed]}><AppText style={styles.arrowText}>›</AppText></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  reel: { flexDirection: 'row', alignItems: 'stretch', minWidth: 0, gap: 8 },
  viewport: { flex: 1, minWidth: 0 },
  tab: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 2, borderColor: colors.goldDeep, borderRadius: radius.sm, backgroundColor: colors.gold },
  label: { color: colors.surface, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '700', flexShrink: 1 },
  count: { color: colors.surface, fontSize: 11, lineHeight: 18, flexShrink: 0 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.35 },
  arrow: { width: 44, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  arrowText: { color: colors.goldDeep, fontSize: 26, lineHeight: 32 },
});
