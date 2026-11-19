import { PanResponder, Platform, View, useWindowDimensions, type ViewProps, type ViewStyle } from 'react-native';
import { useRef } from 'react';
import { useDetailPageTurn } from '@/hooks/use-detail-page-turn';

const verticalTouch = Platform.OS === 'web' ? { touchAction: 'pan-y pinch-zoom' } as ViewStyle : undefined;
const horizontal = (dx: number, dy: number) => Math.abs(dx) > Math.abs(dy) * 1.35;

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
  const { width } = useWindowDimensions();
  const latest = useRef({ turn, width, onPrevious, onNext });
  latest.current = { turn, width, onPrevious, onNext };
  const touchX = useRef(0);
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: event => {
      touchX.current = event.nativeEvent.pageX;
      return false;
    },
    onMoveShouldSetPanResponder: (_, { dx, dy }) => (
      !latest.current.turn?.busy() && touchX.current > 22 && touchX.current < latest.current.width - 22
      && Math.abs(dx) > 14 && horizontal(dx, dy)
    ),
    onPanResponderMove: (_, { dx }) => latest.current.turn?.preview(dx, latest.current.width),
    onPanResponderRelease: (_, { dx, dy }) => {
      const state = latest.current;
      const navigate = dx < 0 ? state.onNext : state.onPrevious;
      if (!navigate || Math.abs(dx) < 64 || !horizontal(dx, dy)) { state.turn?.cancel(); return; }
      if (state.turn) state.turn.finish(dx < 0 ? 1 : -1, navigate);
      else navigate();
    },
    onPanResponderTerminate: () => latest.current.turn?.cancel(),
  })).current;

  return <View {...props} style={[style, verticalTouch]} {...panResponder.panHandlers}>{children}</View>;
}
