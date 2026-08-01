import { PanResponder, View, type ViewProps } from 'react-native';
import { useMemo } from 'react';

export function DetailSwipe({
  onPrevious,
  onNext,
  children,
  ...props
}: ViewProps & {
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < 64 || Math.abs(gesture.dx) < Math.abs(gesture.dy) * 1.35) return;
          if (gesture.dx < 0) onNext?.();
          else onPrevious?.();
        },
      }),
    [onNext, onPrevious],
  );

  return <View {...props} {...panResponder.panHandlers}>{children}</View>;
}
