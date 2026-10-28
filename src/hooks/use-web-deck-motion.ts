import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

export const deckLayerX = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (7 + depth * 2);
export const deckLayerAngle = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (1.3 + depth * 0.45);
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

/** Only transforms change during a drag. Browser animations run on the compositor
 * after release, rather than feeding Animated's JS interpolation graph each frame. */
export function useWebDeckMotion(width: number) {
  const slots = useRef<(HTMLElement | null)[]>([]);
  const currentWidth = useRef(width);
  currentWidth.current = width;
  const position = useRef(0);
  const frame = useRef<number | null>(null);
  const animations = useRef<Animation[]>([]);
  const motion = useMemo(() => {
    const transform = (depth: number, x: number) => {
      if (!depth) return `translate3d(${x}px,0,0) rotate(${Math.max(-7, Math.min(7, x / currentWidth.current * 7))}deg) scale(1)`;
      const amount = Math.min(1, Math.abs(x) / currentWidth.current);
      return `translate3d(${lerp(deckLayerX(depth), deckLayerX(depth - 1), amount)}px,${lerp(depth * 9, (depth - 1) * 9, amount)}px,0) rotate(${lerp(deckLayerAngle(depth), deckLayerAngle(depth - 1), amount)}deg) scale(${lerp(1 - depth * .025, 1 - (depth - 1) * .025, amount)})`;
    };
    const paint = () => {
      frame.current = null;
      slots.current.forEach((node, depth) => { if (node) node.style.transform = transform(depth, position.current); });
    };
    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      animations.current.forEach(animation => { animation.onfinish = null; animation.cancel(); });
      animations.current = [];
    };
    return {
      slot: (depth: number, node: unknown) => { slots.current[depth] = node as HTMLElement | null; },
      drag: (x: number) => {
        position.current = x;
        if (frame.current === null) frame.current = requestAnimationFrame(paint);
      },
      reset: () => { stop(); position.current = 0; paint(); },
      stop,
      animate: (target: number, duration: number, complete: () => void, spring = false) => {
        stop();
        const from = position.current;
        paint();
        slots.current.forEach((node, depth) => {
          if (!node) return;
          // Sample a critically damped spring once; no JS runs on its frames.
          const values = spring ? Array.from({ length: 25 }, (_, index) => {
            const t = index / 24;
            const remaining = index === 24 ? 0 : (1 + t * 9) * Math.exp(-t * 9);
            return { transform: transform(depth, target + (from - target) * remaining), offset: t };
          }) : [{ transform: transform(depth, from) }, { transform: transform(depth, target) }];
          const animation = node.animate(values, { duration, easing: spring ? 'linear' : 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' });
          animations.current.push(animation);
        });
        const front = animations.current[0];
        if (!front) { position.current = target; paint(); complete(); return; }
        front.onfinish = () => {
          position.current = target;
          paint();
          stop();
          complete();
        };
      },
    };
  }, []);
  useEffect(() => () => { if (Platform.OS === 'web') motion.stop(); }, [motion]);
  return Platform.OS === 'web' ? motion : null;
}
