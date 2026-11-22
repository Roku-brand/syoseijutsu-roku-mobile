import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, StyleSheet, View, type ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppText } from './ui';

const tapSlop = 8;
const dismissDistance = 76;

type PopupScroll = Pick<ScrollViewProps, 'onScroll' | 'scrollEventThrottle' | 'bounces' | 'overScrollMode'> & {
  ref: RefObject<ScrollView | null>;
};

function isPullDown(dx: number, dy: number) {
  return dy > tapSlop && dy > Math.abs(dx) * 1.25;
}

/** Shared paper-and-gold popup for principles and deck selection. */
export function BookPopup({ visible, compact, title, closeLabel, mark, onClose, onShow, testID, children }: {
  visible: boolean; compact: boolean; title: string; closeLabel: string; mark?: ReactNode;
  onClose: () => void; onShow?: () => void; testID?: string; children: (scroll: PopupScroll) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const card = useRef<View>(null);
  const header = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const beganOnHeader = useRef(false);
  const beganAtTop = useRef(true);
  const latest = useRef({ onClose, reduced });
  latest.current = { onClose, reduced };
  const translateY = useRef(new Animated.Value(0)).current;
  const gesture = useMemo(() => ({
    move: (distance: number) => translateY.setValue(Math.max(0, distance)),
    finish(distance: number) {
      if (distance >= dismissDistance) {
        latest.current.onClose();
      } else if (latest.current.reduced) {
        translateY.setValue(0);
      } else {
        Animated.timing(translateY, { toValue: 0, duration: 140, useNativeDriver: Platform.OS !== 'web' }).start();
      }
    },
  }), [translateY]);

  useLayoutEffect(() => {
    if (visible) {
      scrollY.current = 0;
      translateY.setValue(0);
    }
  }, [translateY, visible]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => {
      beganOnHeader.current = false;
      beganAtTop.current = scrollY.current <= 1;
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_, { dx, dy, numberActiveTouches }) =>
      numberActiveTouches === 1 && (beganOnHeader.current || beganAtTop.current) && isPullDown(dx, dy),
    onPanResponderMove: (_, { dy }) => gesture.move(dy),
    onPanResponderRelease: (_, { dy }) => gesture.finish(dy),
    onPanResponderTerminate: () => gesture.finish(0),
  }), [gesture]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    const node = card.current as unknown as HTMLElement | null;
    const heading = header.current as unknown as HTMLElement | null;
    if (!node || !heading) return;
    const document = node.ownerDocument;
    let drag: { id: number; x: number; y: number; pulling: boolean } | null = null;
    let suppressClick = false;
    let wheelDistance = 0;
    let wheelTime = 0;
    const atTop = () => (scroll.current?.getScrollableNode()?.scrollTop ?? scrollY.current) <= 1;
    const overHeading = (target: EventTarget | null) => target instanceof Node && heading.contains(target);
    const start = (id: number, x: number, y: number, target: EventTarget | null) => {
      suppressClick = false;
      drag = atTop() || overHeading(target) ? { id, x, y, pulling: false } : null;
    };
    const move = (id: number, x: number, y: number, event: Event) => {
      if (!drag || drag.id !== id) return;
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (!drag.pulling) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) <= tapSlop) return;
        if (!isPullDown(dx, dy)) { drag = null; return; }
        drag.pulling = true;
        document.getSelection()?.removeAllRanges();
      }
      if (event.cancelable) event.preventDefault();
      gesture.move(dy);
    };
    const finish = (id: number, y: number, canceled: boolean) => {
      if (!drag || drag.id !== id) return;
      const completed = drag;
      drag = null;
      if (!completed.pulling) return;
      suppressClick = true;
      gesture.finish(canceled ? 0 : y - completed.y);
    };
    const touchStart = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (event.touches.length === 1) start(finger.identifier, finger.clientX, finger.clientY, event.target);
      else if (drag) finish(drag.id, drag.y, true);
    };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const finger = event.touches[0];
      move(finger.identifier, finger.clientX, finger.clientY, event);
    };
    const touchEnd = (event: TouchEvent) => {
      for (const finger of Array.from(event.changedTouches)) finish(finger.identifier, finger.clientY, event.type === 'touchcancel');
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.isPrimary && event.button === 0) start(event.pointerId, event.clientX, event.clientY, event.target);
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') move(event.pointerId, event.clientX, event.clientY, event);
    };
    const pointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') finish(event.pointerId, event.clientY, event.type === 'pointercancel');
    };
    const click = (event: MouseEvent) => {
      if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    };
    const wheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const pull = overHeading(event.target) ? Math.abs(event.deltaY) : atTop() ? -event.deltaY : 0;
      if (pull <= 0) { wheelDistance = 0; return; }
      event.preventDefault();
      if (event.timeStamp - wheelTime > 160) wheelDistance = 0;
      wheelTime = event.timeStamp;
      wheelDistance += pull * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? dismissDistance : 1);
      if (wheelDistance >= dismissDistance) { wheelDistance = 0; gesture.finish(dismissDistance); }
    };

    node.addEventListener('touchstart', touchStart, { passive: true });
    node.addEventListener('touchmove', touchMove, { passive: false });
    node.addEventListener('touchend', touchEnd);
    node.addEventListener('touchcancel', touchEnd);
    node.addEventListener('pointerdown', pointerDown);
    document.addEventListener('pointermove', pointerMove);
    document.addEventListener('pointerup', pointerEnd);
    document.addEventListener('pointercancel', pointerEnd);
    node.addEventListener('click', click, true);
    node.addEventListener('wheel', wheel, { passive: false });
    return () => {
      node.removeEventListener('touchstart', touchStart);
      node.removeEventListener('touchmove', touchMove);
      node.removeEventListener('touchend', touchEnd);
      node.removeEventListener('touchcancel', touchEnd);
      node.removeEventListener('pointerdown', pointerDown);
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerup', pointerEnd);
      document.removeEventListener('pointercancel', pointerEnd);
      node.removeEventListener('click', click, true);
      node.removeEventListener('wheel', wheel);
    };
  }, [gesture, visible]);

  return <Modal visible={visible} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose} onShow={onShow}>
    <View style={[styles.root, compact && styles.compactRoot]}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View ref={card} testID={testID} accessibilityViewIsModal
        style={[styles.card, compact && styles.compactCard, { paddingBottom: insets.bottom, transform: [{ translateY }] }]}
        {...(Platform.OS !== 'web' ? responder.panHandlers : undefined)}>
        <View ref={header} testID="book-popup-header" onTouchStart={() => { beganOnHeader.current = true; }} style={styles.header}>
          {compact ? <View accessibilityElementsHidden aria-hidden style={styles.grip} /> : null}
          <View style={styles.titleGroup}>{mark}<View style={styles.copy}><AppText style={styles.eyebrow}>処世術禄</AppText><AppText accessibilityRole="header" style={styles.title}>{title}</AppText></View></View>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.close, pressed && { opacity: .7 }]}><AppText style={styles.closeText}>×</AppText></Pressable>
        </View>
        {children({
          ref: scroll, scrollEventThrottle: 16, bounces: false, overScrollMode: 'never',
          onScroll: event => { scrollY.current = event.nativeEvent.contentOffset.y; },
        })}
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,17,16,0.72)' },
  compactRoot: { paddingHorizontal: 0, paddingTop: 72, paddingBottom: 0, justifyContent: 'flex-end' },
  card: { width: '100%', maxWidth: 680, maxHeight: '92%', borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.paper, overflow: 'hidden', ...shadow.card },
  compactCard: { maxHeight: '88%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  header: { minHeight: 82, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.charcoal, borderBottomWidth: 1, borderBottomColor: colors.gold },
  grip: { position: 'absolute', top: 6, left: '50%', marginLeft: -16, width: 32, height: 3, borderRadius: 2, backgroundColor: 'rgba(210,182,111,0.55)' },
  titleGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flexShrink: 1 },
  eyebrow: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 10, lineHeight: 14, letterSpacing: 2 },
  title: { color: colors.surface, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 2 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(210,182,111,0.45)' },
  closeText: { color: colors.goldLight, fontSize: 29, lineHeight: 32, fontWeight: '300' },
});
