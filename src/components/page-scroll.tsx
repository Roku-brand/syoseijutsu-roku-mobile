import * as Haptics from 'expo-haptics';
import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useWebPageElasticity } from '@/hooks/use-web-page-elasticity';
import { useWebScrollIndicator } from '@/hooks/use-web-scroll-indicator';
import { useNativeScrollIndicator } from '@/hooks/use-native-scroll-indicator';
import { useTabPageScroll } from '@/hooks/use-tab-page-scroll';

export function PageScroll({ ref, children, contentContainerStyle, style, onPullRefresh, showsVerticalScrollIndicator = true, rememberOnTabSwitch = false, onScroll, onScrollBeginDrag, onLayout, onContentSizeChange, ...props }: ScrollViewProps & {
  ref?: Ref<ScrollView>;
  onPullRefresh?: () => Promise<void>;
  rememberOnTabSwitch?: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  const indicator = useRef<View>(null);
  const thumb = useRef<View>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const latestRefresh = useRef(onPullRefresh);
  latestRefresh.current = onPullRefresh;
  const reduced = useReducedMotion();
  useImperativeHandle(ref, () => scroll.current!, []);

  const refresh = useCallback(async () => {
    if (!latestRefresh.current || busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      if (Platform.OS === 'web') navigator.vibrate?.(22);
      else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      await latestRefresh.current();
    } catch {
      // A failed refresh must still release the indicator and allow another pull.
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);
  useWebPageElasticity(scroll, indicator, reduced, onPullRefresh ? refresh : undefined);
  const showIndicator = showsVerticalScrollIndicator && !props.horizontal;
  const web = Platform.OS === 'web';
  const nativeIndicator = useNativeScrollIndicator(scroll, showIndicator && !web);
  const routeScroll = useTabPageScroll(scroll, rememberOnTabSwitch);
  useWebScrollIndicator(scroll, thumb, showIndicator && web);
  const { backgroundColor, ...containerStyle } = showIndicator ? StyleSheet.flatten(style) ?? {} : {};
  const viewport = (
    <ScrollView
      bounces={!reduced || Boolean(onPullRefresh)}
      alwaysBounceVertical={!reduced || Boolean(onPullRefresh)}
      overScrollMode={reduced ? 'never' : 'always'}
      showsVerticalScrollIndicator={false}
      {...props}
      ref={scroll}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      onScroll={event => {
        routeScroll.onScroll(event.nativeEvent.contentOffset.y);
        nativeIndicator.onScroll(event.nativeEvent);
        onScroll?.(event);
      }}
      onScrollBeginDrag={event => { routeScroll.cancelRestore(); onScrollBeginDrag?.(event); }}
      onLayout={event => { routeScroll.onLayout(event.nativeEvent.layout.height); onLayout?.(event); }}
      onContentSizeChange={(width, height) => { routeScroll.onContentSizeChange(height); onContentSizeChange?.(width, height); }}
      style={[styles.webScroll, showIndicator ? { backgroundColor } : style]}
      contentContainerStyle={contentContainerStyle}
      refreshControl={onPullRefresh && Platform.OS !== 'web'
        ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.goldDeep} colors={[colors.goldDeep]} />
        : props.refreshControl}
    >
      {onPullRefresh && Platform.OS === 'web' ? (
        <View ref={indicator} pointerEvents="none" aria-hidden style={styles.indicator} testID="home-pull-indicator">
          {refreshing ? <ActivityIndicator color={colors.goldDeep} animating={!reduced} /> : <Text style={styles.refreshGlyph}>↻</Text>}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
  if (!showIndicator) return viewport;
  return (
    <View style={[styles.viewport, containerStyle]}>
      {viewport}
      {web ? <View ref={thumb} aria-hidden testID="vertical-scroll-indicator"
        style={[styles.thumbTarget, !reduced && styles.thumbFade]}>
        <View pointerEvents="none" style={[styles.thumb, !reduced && styles.thumbExpand]} />
      </View> : nativeIndicator.thumb ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={[styles.nativeThumbTarget, { top: nativeIndicator.thumb.top, height: nativeIndicator.thumb.height }]}
          {...nativeIndicator.handlers}>
          <View pointerEvents="none" style={[styles.thumb, nativeIndicator.held && styles.heldThumb]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webScroll: Platform.OS === 'web' ? { overscrollBehaviorY: 'none', overflowAnchor: 'none' } as ViewStyle : {},
  viewport: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  thumbTarget: { position: 'absolute', top: 0, right: 0, width: 26, opacity: 0, zIndex: 1, touchAction: 'none', cursor: 'grab', userSelect: 'none', WebkitTouchCallout: 'none' } as unknown as ViewStyle,
  nativeThumbTarget: { position: 'absolute', right: 0, width: 26, zIndex: 1 },
  heldThumb: { width: 7 },
  thumb: { position: 'absolute', top: 0, bottom: 0, right: 3, width: 3, borderRadius: 4, backgroundColor: 'rgba(45, 45, 45, 0.44)' },
  thumbExpand: { transitionProperty: 'width', transitionDuration: '140ms', transitionTimingFunction: 'ease-out' } as ViewStyle,
  thumbFade: Platform.OS === 'web' ? { transitionProperty: 'opacity', transitionDuration: '180ms' } as ViewStyle : {},
  indicator: { position: 'absolute', left: '50%', marginLeft: -17, top: -41, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: 0 },
  refreshGlyph: { fontSize: 29, lineHeight: 34, color: colors.goldDeep },
});
