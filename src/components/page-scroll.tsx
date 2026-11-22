import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useWebPageElasticity } from '@/hooks/use-web-page-elasticity';
import { useTabPageScroll } from '@/hooks/use-tab-page-scroll';

export function PageScroll({ ref, children, contentContainerStyle, style, onPullRefresh, onReselectAtTop, rememberOnTabSwitch = false, onScroll, onScrollBeginDrag, onLayout, onContentSizeChange, ...props }: ScrollViewProps & {
  ref?: Ref<ScrollView>;
  onPullRefresh?: () => Promise<void>;
  onReselectAtTop?: () => void;
  rememberOnTabSwitch?: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  const indicator = useRef<View>(null);
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
      await latestRefresh.current();
    } catch {
      // A failed refresh must still release the indicator and allow another pull.
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);
  useWebPageElasticity(scroll, indicator, reduced, onPullRefresh ? refresh : undefined);
  const routeScroll = useTabPageScroll(scroll, rememberOnTabSwitch, onReselectAtTop);
  return (
    <ScrollView
      bounces={!reduced || Boolean(onPullRefresh)}
      alwaysBounceVertical={!reduced || Boolean(onPullRefresh)}
      overScrollMode={reduced ? 'never' : 'always'}
      {...props}
      ref={scroll}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      onScroll={event => {
        routeScroll.onScroll(event.nativeEvent.contentOffset.y);
        onScroll?.(event);
      }}
      onScrollBeginDrag={event => { routeScroll.cancelRestore(); onScrollBeginDrag?.(event); }}
      onLayout={event => { routeScroll.onLayout(event.nativeEvent.layout.height); onLayout?.(event); }}
      onContentSizeChange={(width, height) => { routeScroll.onContentSizeChange(height); onContentSizeChange?.(width, height); }}
      style={[styles.webScroll, style]}
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
}

const styles = StyleSheet.create({
  webScroll: Platform.OS === 'web' ? { overscrollBehaviorY: 'none', overflowAnchor: 'none' } as ViewStyle : {},
  indicator: { position: 'absolute', left: '50%', marginLeft: -17, top: -41, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: 0 },
  refreshGlyph: { fontSize: 29, lineHeight: 34, color: colors.goldDeep },
});
