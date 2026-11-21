import * as Haptics from 'expo-haptics';
import { useCallback, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useWebPageElasticity } from '@/hooks/use-web-page-elasticity';

export function PageScroll({ ref, children, contentContainerStyle, style, onPullRefresh, ...props }: ScrollViewProps & {
  ref?: Ref<ScrollView>;
  onPullRefresh?: () => Promise<void>;
}) {
  const scroll = useRef<ScrollView>(null);
  const indicator = useRef<View>(null);
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);
  const latestRefresh = useRef(onPullRefresh);
  latestRefresh.current = onPullRefresh;
  const { width, height } = useHydratedWindowDimensions();
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
  const inset = Math.round(Math.min(172, Math.max(72, height * (width < 700 ? 0.2 : 0.12))));
  const padding = StyleSheet.flatten(contentContainerStyle);
  const bottom = padding?.paddingBottom ?? padding?.paddingVertical ?? padding?.padding ?? 0;

  return (
    <ScrollView
      bounces={!reduced || Boolean(onPullRefresh)}
      alwaysBounceVertical={!reduced || Boolean(onPullRefresh)}
      overScrollMode={reduced ? 'never' : 'always'}
      showsVerticalScrollIndicator={false}
      {...props}
      ref={scroll}
      style={[styles.webScroll, style]}
      contentContainerStyle={[contentContainerStyle, { paddingBottom: inset + (typeof bottom === 'number' ? bottom : 0) }]}
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
