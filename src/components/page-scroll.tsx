import * as Haptics from 'expo-haptics';
import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useWebPageElasticity } from '@/hooks/use-web-page-elasticity';
import { useWebScrollIndicator } from '@/hooks/use-web-scroll-indicator';

export function PageScroll({ ref, children, contentContainerStyle, style, onPullRefresh, showsVerticalScrollIndicator = true, ...props }: ScrollViewProps & {
  ref?: Ref<ScrollView>;
  onPullRefresh?: () => Promise<void>;
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
  const showWebIndicator = Platform.OS === 'web' && showsVerticalScrollIndicator && !props.horizontal;
  useWebScrollIndicator(scroll, thumb, showWebIndicator);
  const viewport = (
    <ScrollView
      bounces={!reduced || Boolean(onPullRefresh)}
      alwaysBounceVertical={!reduced || Boolean(onPullRefresh)}
      overScrollMode={reduced ? 'never' : 'always'}
      showsVerticalScrollIndicator={Platform.OS !== 'web' && showsVerticalScrollIndicator}
      {...props}
      ref={scroll}
      style={[styles.webScroll, !showWebIndicator && style]}
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
  if (!showWebIndicator) return viewport;
  return (
    <View style={[styles.viewport, style]}>
      {viewport}
      <View ref={thumb} pointerEvents="none" aria-hidden testID="vertical-scroll-indicator"
        style={[styles.thumb, !reduced && styles.thumbFade]} />
    </View>
  );
}

const styles = StyleSheet.create({
  webScroll: Platform.OS === 'web' ? { overscrollBehaviorY: 'none', overflowAnchor: 'none' } as ViewStyle : {},
  viewport: { flexGrow: 1, flexShrink: 1, minHeight: 0 },
  thumb: { position: 'absolute', top: 0, right: 3, width: 5, borderRadius: 3, backgroundColor: 'rgba(45, 45, 45, 0.44)', opacity: 0, zIndex: 1 },
  thumbFade: Platform.OS === 'web' ? { transitionProperty: 'opacity', transitionDuration: '180ms' } as ViewStyle : {},
  indicator: { position: 'absolute', left: '50%', marginLeft: -17, top: -41, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: 0 },
  refreshGlyph: { fontSize: 29, lineHeight: 34, color: colors.goldDeep },
});
