import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, type GestureResponderEvent, type NativeScrollEvent, type ScrollView } from 'react-native';
import {
  clampProgress, scrollThumbMetrics, SCROLL_THUMB_HIDE_DELAY, SCROLL_THUMB_HOLD_DELAY, SCROLL_THUMB_HOLD_SLOP,
} from './scroll-indicator-metrics';

type Press = { x: number; y: number; active: boolean };

export function useNativeScrollIndicator(scroll: RefObject<ScrollView | null>, enabled: boolean) {
  const offset = useRef(0);
  const metrics = useRef<ReturnType<typeof scrollThumbMetrics>>(null);
  const press = useRef<Press | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [thumb, setThumb] = useState<ReturnType<typeof scrollThumbMetrics>>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => () => {
    clearTimeout(holdTimer.current);
    clearTimeout(hideTimer.current);
  }, []);

  const show = () => {
    clearTimeout(hideTimer.current);
    setThumb(metrics.current);
    if (!press.current) hideTimer.current = setTimeout(() => setThumb(null), SCROLL_THUMB_HIDE_DELAY);
  };
  const finish = () => {
    clearTimeout(holdTimer.current);
    press.current = null;
    setHeld(false);
    show();
  };
  const onScroll = ({ contentOffset, layoutMeasurement, contentSize }: NativeScrollEvent) => {
    if (!enabled) return;
    offset.current = contentOffset.y;
    metrics.current = scrollThumbMetrics(layoutMeasurement.height, contentSize.height, offset.current);
    show();
  };

  const grant = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const touch = { x: pageX, y: pageY, active: false };
    press.current = touch;
    clearTimeout(hideTimer.current);
    holdTimer.current = setTimeout(() => {
      if (press.current !== touch || !metrics.current?.travel) return;
      touch.active = true;
      setHeld(true);
      void (Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => undefined);
    }, SCROLL_THUMB_HOLD_DELAY);
  };
  const move = (event: GestureResponderEvent) => {
    const touch = press.current;
    const bar = metrics.current;
    if (!touch || !bar?.travel) return;
    const { pageX, pageY } = event.nativeEvent;
    if (!touch.active) {
      if (Math.hypot(pageX - touch.x, pageY - touch.y) > SCROLL_THUMB_HOLD_SLOP) clearTimeout(holdTimer.current);
      return;
    }
    offset.current = bar.range * clampProgress(offset.current / bar.range + (pageY - touch.y) / bar.travel);
    touch.y = pageY;
    scroll.current?.scrollTo({ y: offset.current, animated: false });
  };

  return {
    thumb: enabled ? thumb : null,
    held,
    onScroll,
    handlers: {
      onStartShouldSetResponder: () => Boolean(metrics.current?.travel),
      onResponderGrant: grant,
      onResponderMove: move,
      onResponderRelease: finish,
      onResponderTerminate: finish,
    },
  };
}
