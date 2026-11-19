import { PanResponder, Platform, View, useWindowDimensions, type ViewProps, type ViewStyle } from 'react-native';
import { useEffect, useRef } from 'react';
import { useDetailPageTurn, type DetailPageDestination } from '@/hooks/use-detail-page-turn';

const verticalTouch = Platform.OS === 'web' ? { touchAction: 'pan-y pinch-zoom' } as ViewStyle : undefined;
const horizontal = (dx: number, dy: number) => Math.abs(dx) > Math.abs(dy) * 1.35;
const startsInsidePage = (x: number, width: number) => x > 22 && x < width - 22;

export function DetailSwipe({
  previous,
  next,
  children,
  style,
  ...props
}: ViewProps & {
  previous?: DetailPageDestination;
  next?: DetailPageDestination;
}) {
  const turn = useDetailPageTurn();
  const region = useRef<View>(null);
  const { width } = useWindowDimensions();
  const latest = useRef({ turn, width, previous, next });
  latest.current = { turn, width, previous, next };
  const updates = useRef({
    preview(dx: number) {
      const { turn: current, previous: before, next: after } = latest.current;
      const destination = dx < 0 ? after : before;
      if (destination) current?.preview(dx < 0 ? 1 : -1, Math.abs(dx), destination);
    },
    release(dx: number, dy: number) {
      const { turn: current, previous: before, next: after } = latest.current;
      const destination = dx < 0 ? after : before;
      if (!destination || Math.abs(dx) < 64 || !horizontal(dx, dy)) { current?.cancel(); return; }
      if (current) current.finish(dx < 0 ? 1 : -1, destination);
      else destination.open();
    },
  }).current;
  const touchX = useRef(0);
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: event => {
      touchX.current = event.nativeEvent.pageX;
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => (
      !latest.current.turn?.busy() && startsInsidePage(touchX.current, latest.current.width)
      && Math.abs(dx) > 14 && horizontal(dx, dy)
    ),
    onPanResponderMove: (_, { dx }) => updates.preview(dx),
    onPanResponderRelease: (_, { dx, dy }) => updates.release(dx, dy),
    onPanResponderTerminate: () => latest.current.turn?.cancel(),
  })).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = region.current as unknown as HTMLElement | null;
    if (!node) return;
    let gesture: { id: number; x: number; y: number; turning: boolean } | null = null;
    let suppressClick = false;
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      suppressClick = false;
      if (startsInsidePage(event.clientX, latest.current.width)) {
        gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, turning: false };
      }
    };
    const move = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.turning) {
        if (Math.abs(dy) > 14 && !horizontal(dx, dy)) { gesture = null; return; }
        if (Math.abs(dx) <= 14 || !horizontal(dx, dy) || latest.current.turn?.busy()) return;
        gesture.turning = true;
        if (event.pointerType === 'mouse') node.ownerDocument.getSelection()?.removeAllRanges();
        node.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      updates.preview(dx);
    };
    const end = (event: PointerEvent) => {
      // Touch starts with implicit capture on the child. Transferring it to
      // this region must not end the swipe when the child's event bubbles.
      if (event.type === 'lostpointercapture' && event.target !== node) return;
      if (!gesture || event.pointerId !== gesture.id) return;
      const swipe = gesture;
      gesture = null;
      if (!swipe.turning) return;
      suppressClick = true;
      if (event.type === 'pointerup') updates.release(event.clientX - swipe.x, event.clientY - swipe.y);
      else latest.current.turn?.cancel();
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const dragStart = (event: DragEvent) => {
      if (gesture?.turning) event.preventDefault();
    };
    node.addEventListener('pointerdown', down, true);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
    node.addEventListener('lostpointercapture', end);
    node.addEventListener('click', click, true);
    node.addEventListener('dragstart', dragStart, true);
    return () => {
      node.removeEventListener('pointerdown', down, true);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', end);
      node.removeEventListener('lostpointercapture', end);
      node.removeEventListener('click', click, true);
      node.removeEventListener('dragstart', dragStart, true);
    };
  }, [updates]);

  return <View ref={region} {...props} style={[style, verticalTouch]} {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}>{children}</View>;
}
