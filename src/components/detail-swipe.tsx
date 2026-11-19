import { PanResponder, Platform, View, useWindowDimensions, type ViewProps, type ViewStyle } from 'react-native';
import { useEffect, useRef } from 'react';
import { useDetailPageTurn } from '@/hooks/use-detail-page-turn';

const verticalTouch = Platform.OS === 'web' ? { touchAction: 'pan-y pinch-zoom' } as ViewStyle : undefined;
const horizontal = (dx: number, dy: number) => Math.abs(dx) > Math.abs(dy) * 1.35;
const startsInsidePage = (x: number, width: number) => x > 22 && x < width - 22;

export function DetailSwipe({
  onPrevious,
  onNext,
  children,
  style,
  ...props
}: ViewProps & {
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const turn = useDetailPageTurn();
  const region = useRef<View>(null);
  const { width } = useWindowDimensions();
  const latest = useRef({ turn, width, onPrevious, onNext });
  latest.current = { turn, width, onPrevious, onNext };
  const onRelease = (dx: number, dy: number) => {
    const state = latest.current;
    const navigate = dx < 0 ? state.onNext : state.onPrevious;
    if (!navigate || Math.abs(dx) < 64 || !horizontal(dx, dy)) { state.turn?.cancel(); return; }
    if (state.turn) state.turn.finish(dx < 0 ? 1 : -1, navigate);
    else navigate();
  };
  const release = useRef(onRelease);
  release.current = onRelease;
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
    onPanResponderMove: (_, { dx }) => latest.current.turn?.preview(dx, latest.current.width),
    onPanResponderRelease: (_, { dx, dy }) => release.current(dx, dy),
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
        node.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      latest.current.turn?.preview(dx, latest.current.width);
    };
    const end = (event: PointerEvent) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const swipe = gesture;
      gesture = null;
      if (!swipe.turning) return;
      suppressClick = true;
      if (event.type === 'pointerup') release.current(event.clientX - swipe.x, event.clientY - swipe.y);
      else latest.current.turn?.cancel();
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    node.addEventListener('pointerdown', down, true);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
    node.addEventListener('lostpointercapture', end);
    node.addEventListener('click', click, true);
    return () => {
      node.removeEventListener('pointerdown', down, true);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', end);
      node.removeEventListener('pointercancel', end);
      node.removeEventListener('lostpointercapture', end);
      node.removeEventListener('click', click, true);
    };
  }, []);

  return <View ref={region} {...props} style={[style, verticalTouch]} {...(Platform.OS === 'web' ? {} : panResponder.panHandlers)}>{children}</View>;
}
