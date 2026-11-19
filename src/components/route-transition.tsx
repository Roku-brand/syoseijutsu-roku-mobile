import { useNavigationContainerRef, usePathname } from 'expo-router';
import { type PropsWithChildren, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { DETAIL_SWIPE_EDGE_INSET, DetailPageTurnContext, useDetailPageTurnMotion } from '@/hooks/use-detail-page-turn';

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
  const [width, setWidth] = useState(0);
  const { controls, page, progress, arrivalPath } = useDetailPageTurnMotion(routeKey, reduced, width);
  const detail = /^\/(card|theory)\/[^/]+\/?$/.test(pathname);
  const viewport = useRef<View>(null);
  const previous = useRef<{ key: string; path: string; depth: number } | null>(null);

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !detail) return;
    // On iOS WebKit, history can claim a swipe at the screen edge before
    // pointermove. Cancel the initiating touch there, including in the header.
    const preventEdgeBack = (event: TouchEvent) => {
      if (event.cancelable && event.touches.length === 1 && event.touches[0]!.clientX <= DETAIL_SWIPE_EDGE_INSET) {
        event.preventDefault();
      }
    };
    document.addEventListener('touchstart', preventEdgeBack, { capture: true, passive: false });
    return () => document.removeEventListener('touchstart', preventEdgeBack, true);
  }, [detail]);

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
      <View style={styles.clip} testID={detail ? 'detail-reader' : undefined}>
        <View ref={viewport} testID="route-transition-content" style={styles.content} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          <PaperTurn progress={progress} direction={page?.direction} width={width} preview={page?.destination.preview}>
            {children}
          </PaperTurn>
        </View>
      </View>
    </DetailPageTurnContext.Provider>
  );
}

function PaperTurn({ progress, width, direction, preview, children }: PropsWithChildren<{
  progress: Animated.Value;
  width: number;
  direction?: -1 | 1;
  preview?: PropsWithChildren['children'];
}>) {
  const distance = (direction ?? 1) * width;
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] });
  const counterOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [0, distance] });
  const edge = progress.interpolate({ inputRange: [0, 0.22, 0.68, 0.92, 1], outputRange: [0.22, 0.83, 1, 0.66, 0.2] });
  const tiltPoints = [0, -6, -11, -3, 5, 0];
  const tiltRange = [0, 0.2, 0.42, 0.64, 0.85, 1];
  const tilt = progress.interpolate({ inputRange: tiltRange, outputRange: tiltPoints.map(angle => `${angle * (direction ?? 1)}deg`) });
  const counterTilt = progress.interpolate({ inputRange: tiltRange, outputRange: tiltPoints.map(angle => `${-angle * (direction ?? 1)}deg`) });
  const light = progress.interpolate({ inputRange: [0, 0.06, 0.87, 1], outputRange: [0, 1, 1, 0] });

  return <>
    {direction ? (
      <View testID="detail-page-underlay" pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.layer}>
        {preview}
      </View>
    ) : null}
    {/* The transforms cancel for the text and move only its clipping edge. */}
    <Animated.View testID="detail-page-sheet" style={[styles.layer, styles.clip, direction && { transform: [{ translateX: offset }, { skewX: tilt }] }]}>
      <Animated.View style={[styles.layer, direction && { transform: [{ skewX: counterTilt }, { translateX: counterOffset }] }]}>
        {children}
      </Animated.View>
    </Animated.View>
    {direction ? (
      <Animated.View testID="detail-page-curl" pointerEvents="none" aria-hidden style={[
        styles.edgeTrack,
        direction === 1 ? { right: -52 } : { left: -52 },
        { opacity: light, transform: [{ translateX: offset }, { skewX: tilt }, { scaleX: direction }, { scaleX: edge }] },
      ]}>
        <View style={styles.castShadow} />
        <View style={styles.fold} />
      </Animated.View>
    ) : null}
  </>;
}

function gradient(value: string): ViewStyle {
  return Platform.OS === 'web'
    ? { backgroundImage: value } as ViewStyle
    : { experimental_backgroundImage: value };
}

const styles = StyleSheet.create({
  clip: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.paper },
  content: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  edgeTrack: { position: 'absolute', top: -22, bottom: -22, width: 118 },
  castShadow: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    ...gradient('linear-gradient(90deg, transparent 22%, rgba(68, 48, 21, 0.23) 56%, transparent 100%)'),
  },
  fold: {
    position: 'absolute', top: 0, bottom: 0, left: 6, width: 70,
    borderTopRightRadius: 26, borderBottomRightRadius: 32,
    ...gradient('linear-gradient(90deg, rgba(247, 243, 232, 0) 0%, rgba(231, 220, 197, 0.55) 28%, #fffdf4 72%, #e6dbc2 97%, #bcae8f 100%)'),
  },
});
