import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, type LayoutRectangle, type ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { AppText } from './ui';

type Option = { subcategoryId?: string; title: string; items: readonly unknown[] };

export function TheorySubcategoryReel({ options, selected, onSelect }: {
  options: Option[]; selected?: string; onSelect: (id?: string) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, LayoutRectangle>());
  const offset = useRef(0);
  const [viewport, setViewport] = useState(0);
  const [outerWidth, setOuterWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [position, setPosition] = useState(0);
  const [focused, setFocused] = useState<string>();
  const key = selected ?? 'all';
  const signature = options.map(option => option.subcategoryId ?? 'all').join('|');
  const reveal = useCallback((id: string) => {
    const layout = layouts.current.get(id);
    if (!layout || !viewport) return;
    const inset = 8;
    const outside = layout.x < offset.current + inset || layout.x + layout.width > offset.current + viewport - inset;
    const x = outside ? layout.x + layout.width / 2 - viewport / 2 : offset.current;
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(x, contentWidth - viewport)), animated: false });
  }, [viewport, contentWidth]);
  useEffect(() => { reveal(key); }, [key, signature, reveal]);
  const left = position > 2;
  const right = position + viewport < contentWidth - 2;
  const overflow = contentWidth > outerWidth + 2;
  const showButtons = Platform.OS === 'web' && outerWidth >= 600 && overflow;
  const move = (direction: number) => scroll.current?.scrollTo({ x: Math.max(0, Math.min(offset.current + viewport * 0.75 * direction, contentWidth - viewport)), animated: false });
  return <View testID="theory-subcategory-reel" style={styles.reel} onLayout={event => setOuterWidth(event.nativeEvent.layout.width)}>
    {showButtons ? <Pressable disabled={!left} accessibilityRole="button" accessibilityLabel="前の内部分類を表示" onPress={() => move(-1)} style={[styles.arrow, !left && styles.disabled]}><AppText>‹</AppText></Pressable> : null}
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} directionalLockEnabled
      testID="theory-subcategory-scroll" style={[styles.scroll, Platform.OS === 'web' && ({ scrollSnapType: 'x proximity' } as ViewStyle)]} contentContainerStyle={styles.track}
      onLayout={event => setViewport(event.nativeEvent.layout.width)}
      onContentSizeChange={width => setContentWidth(width)} scrollEventThrottle={16}
      onScroll={event => { offset.current = event.nativeEvent.contentOffset.x; setPosition(offset.current); }}
      {...(Platform.OS === 'web' ? {} : { snapToOffsets: options.map(option => { const item = layouts.current.get(option.subcategoryId ?? 'all'); return Math.max(0, item ? item.x + item.width / 2 - viewport / 2 : 0); }), snapToAlignment: 'start' as const })}>
      {options.map(option => {
        const id = option.subcategoryId ?? 'all';
        const active = id === key;
        return <Pressable key={id} testID="theory-subcategory-tab" accessibilityRole="button"
          accessibilityLabel={`${option.title}で内部分類を絞り込む`} accessibilityState={{ selected: active }} aria-selected={active}
          onLayout={event => { layouts.current.set(id, event.nativeEvent.layout); if (id === key) reveal(id); }}
          onFocus={() => { setFocused(id); reveal(id); }} onBlur={() => setFocused(undefined)}
          onPress={() => onSelect(option.subcategoryId)}
          style={({ pressed }) => [styles.tab, Platform.OS === 'web' && ({ scrollSnapAlign: 'center' } as ViewStyle), active && styles.active, focused === id && styles.focused, pressed && styles.pressed]}>
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
