import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Animated, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { REFRESH_OFFSET, useWebPageElasticity, type RequestScrollRefresh, type ScrollRefreshTask } from '@/hooks/use-web-page-elasticity';
import { useTabPageScroll } from '@/hooks/use-tab-page-scroll';

export function PageScroll({ ref, children, contentContainerStyle, style, onPullRefresh, refreshRef, onReselectAtTop, rememberOnTabSwitch = false, onScroll, onScrollBeginDrag, onLayout, onContentSizeChange, ...props }: ScrollViewProps & {
  ref?: Ref<ScrollView>;
  onPullRefresh?: ScrollRefreshTask;
  refreshRef?: Ref<RequestScrollRefresh>;
  onReselectAtTop?: () => void;
  rememberOnTabSwitch?: boolean;
}) {
  const scroll = useRef<ScrollView>(null);
  const indicator = useRef<View>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const scrollY = useRef(0);
  const androidOffset = useRef(new Animated.Value(0)).current;
  const latestRefresh = useRef(onPullRefresh);
  latestRefresh.current = onPullRefresh;
  const reduced = useReducedMotion();
  useImperativeHandle(ref, () => scroll.current!, []);

  const refresh = useCallback((task = latestRefresh.current) => {
    if (!task || busy.current) return;
    busy.current = true;
    let pending: ReturnType<ScrollRefreshTask>;
    try {
      pending = task();
    } catch {
      busy.current = false;
      return;
    }
    if (!pending) {
      busy.current = false;
      return;
    }
    setRefreshing(true);
    if (Platform.OS === 'android' && !reduced) {
      Animated.timing(androidOffset, { toValue: REFRESH_OFFSET, duration: 160, useNativeDriver: true }).start();
    }
    return pending.catch(() => undefined).finally(() => {
      busy.current = false;
      setRefreshing(false);
      if (Platform.OS === 'android') {
        Animated.timing(androidOffset, { toValue: 0, duration: reduced ? 0 : 230, useNativeDriver: true }).start();
      }
    });
  }, [androidOffset, reduced]);
  const webRefresh = useWebPageElasticity(scroll, indicator, reduced, onPullRefresh ? refresh : undefined);
  useImperativeHandle(refreshRef, () => task => {
    if (Platform.OS === 'web') {
      webRefresh.current?.(task);
    } else if (!busy.current) {
      if (scrollY.current > 1) scroll.current?.scrollTo({ y: 0, animated: false });
      void refresh(task);
    }
  }, [refresh, webRefresh]);
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
        scrollY.current = event.nativeEvent.contentOffset.y;
        routeScroll.onScroll(scrollY.current);
        onScroll?.(event);
      }}
      onScrollBeginDrag={event => { routeScroll.cancelRestore(); onScrollBeginDrag?.(event); }}
      onLayout={event => { routeScroll.onLayout(event.nativeEvent.layout.height); onLayout?.(event); }}
      onContentSizeChange={(width, height) => { routeScroll.onContentSizeChange(height); onContentSizeChange?.(width, height); }}
      style={[styles.webScroll, style]}
      contentContainerStyle={contentContainerStyle}
      refreshControl={onPullRefresh && Platform.OS !== 'web'
        ? <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.goldDeep} colors={[colors.goldDeep]} />
        : props.refreshControl}
    >
      {onPullRefresh && Platform.OS === 'web' ? (
        <View ref={indicator} pointerEvents="none" aria-hidden style={styles.indicator} testID="home-pull-indicator">
          {refreshing ? <ActivityIndicator color={colors.goldDeep} animating={!reduced} /> : <Text style={styles.refreshGlyph}>↻</Text>}
        </View>
      ) : null}
      {onPullRefresh && Platform.OS === 'android'
        ? <Animated.View style={{ width: '100%', transform: [{ translateY: androidOffset }] }}>{children}</Animated.View>
        : children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  webScroll: Platform.OS === 'web' ? { overscrollBehaviorY: 'none', overflowAnchor: 'none' } as ViewStyle : {},
  indicator: { position: 'absolute', left: '50%', marginLeft: -17, top: -41, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: 0 },
  refreshGlyph: { fontSize: 29, lineHeight: 34, color: colors.goldDeep },
});
