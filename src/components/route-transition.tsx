import { useNavigationContainerRef, usePathname } from 'expo-router';
import { type PropsWithChildren, useLayoutEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { DetailPageTurnContext, useDetailPageTurnMotion } from '@/hooks/use-detail-page-turn';

const tabPaths = ['/', '/discover', '/learn', '/my-os'] as const;
type RouteState = { type?: string; index?: number; routes: readonly { state?: RouteState }[] };

function stackDepth(state: RouteState | undefined): number {
  if (!state) return 0;
  const index = state.index ?? 0;
  return (state.type === 'stack' ? index : 0) + stackDepth(state.routes[index]?.state);
}

// Animate the persistent content viewport without remounting screens or moving
// the header/navigation. Native stacks already provide directional transitions.
export function RouteTransition({ children, disabled = false }: PropsWithChildren<{ disabled?: boolean }>) {
  const pathname = usePathname();
  const navigation = useNavigationContainerRef();
  // Route groups may change while the public path stays the same.
  const routeKey = pathname;
  const reduced = useReducedMotion();
  const { controls, sheetStyle, shade, arrivalPath } = useDetailPageTurnMotion(routeKey, reduced);
  const viewport = useRef<View>(null);
  const previous = useRef<{ key: string; path: string; depth: number } | null>(null);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    let animation: Animation | undefined;
    // Read navigation depth after the router has committed its state, but before
    // the next paint. During a layout effect the container still reports the
    // previous stack, which otherwise makes browser Back look like a push.
    const frame = requestAnimationFrame(() => {
      const depth = stackDepth(navigation.getRootState());
      const before = previous.current;
      previous.current = { key: routeKey, path: pathname, depth };
      if (disabled || reduced || !before || before.key === routeKey || arrivalPath.current === routeKey) return;
      const element = viewport.current as unknown as HTMLElement | null;
      if (!element?.animate) return;

      const previousTab = tabPaths.indexOf(before.path as (typeof tabPaths)[number]);
      const nextTab = tabPaths.indexOf(pathname as (typeof tabPaths)[number]);
      const tabs = previousTab >= 0 && nextTab >= 0;
      const returning = depth < before.depth;
      const purchase = pathname === '/upgrade' || (before.path === '/upgrade' && returning);
      const transform = tabs
        ? `translateX(${nextTab > previousTab ? motion.tabDistance : -motion.tabDistance}px)`
        : purchase
          ? `translateY(${returning ? -motion.purchaseDistance : motion.purchaseDistance}px)`
          : `translateX(${returning ? -motion.detailDistance : motion.detailDistance}px)`;
      animation = element.animate(tabs ? [
        { opacity: 0.42, transform },
        { opacity: 0.88, transform: 'translateX(2px)', offset: 0.72 },
        { opacity: 1, transform: 'translateX(0)' },
      ] : [
        { opacity: 0.35, transform },
        { opacity: 1, transform: 'translate(0, 0)' },
      ], { duration: tabs ? motion.tabDuration : motion.detailDuration, easing: motion.easing });
    });
    // Cancel on rapid navigation and when reduced motion is enabled mid-flight.
    return () => { cancelAnimationFrame(frame); animation?.cancel(); };
  }, [routeKey, pathname, navigation, reduced, disabled, arrivalPath]);

  return (
    <DetailPageTurnContext.Provider value={controls}>
      <View style={styles.clip}>
        <View ref={viewport} testID="route-transition-content" style={styles.content}>
          <Animated.View testID="detail-page-sheet" style={[styles.content, sheetStyle]}>
            {children}
            {controls.active ? <Animated.View pointerEvents="none" style={[styles.shade, { opacity: shade }]} /> : null}
          </Animated.View>
        </View>
      </View>
    </DetailPageTurnContext.Provider>
  );
}

const styles = StyleSheet.create({
  clip: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.paper },
  content: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  shade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.ink },
});
