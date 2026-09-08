import { useNavigationContainerRef, usePathname, useSegments } from 'expo-router';
import { type PropsWithChildren, useLayoutEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const tabPaths = new Set(['/', '/discover', '/learn', '/my-os']);
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
  const segments = useSegments();
  const navigation = useNavigationContainerRef();
  const routeKey = `${pathname}:${segments.join('/')}`;
  const reduced = useReducedMotion();
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
      if (disabled || reduced || !before || before.key === routeKey) return;
      const element = viewport.current as unknown as HTMLElement | null;
      if (!element?.animate) return;

      const tabs = tabPaths.has(before.path) && tabPaths.has(pathname);
      const returning = depth < before.depth;
      const purchase = pathname === '/upgrade' || (before.path === '/upgrade' && returning);
      const transform = tabs
        ? `translateY(${motion.tabDistance}px)`
        : purchase
          ? `translateY(${returning ? -motion.purchaseDistance : motion.purchaseDistance}px)`
          : `translateX(${returning ? -motion.detailDistance : motion.detailDistance}px)`;
      animation = element.animate([
        { opacity: 0.35, transform },
        { opacity: 1, transform: 'translate(0, 0)' },
      ], { duration: tabs ? motion.tabDuration : motion.detailDuration, easing: motion.easing });
    });
    // Cancel on rapid navigation and when reduced motion is enabled mid-flight.
    return () => { cancelAnimationFrame(frame); animation?.cancel(); };
  }, [routeKey, pathname, navigation, reduced, disabled]);

  return <View style={styles.clip}><View ref={viewport} testID="route-transition-content" style={styles.content}>{children}</View></View>;
}

const styles = StyleSheet.create({
  clip: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.paper },
  content: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
});
