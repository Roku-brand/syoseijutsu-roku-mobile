import { useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { deckPose, deckReturnEdge } from '@/data/deck-motion';


/** Only transforms change during a drag. Browser animations run on the compositor
 * after release, rather than feeding Animated's JS interpolation graph each frame. */
export function useWebDeckMotion(width: number) {
  const slots = useRef<(HTMLElement | null)[]>([]);
  const currentWidth = useRef(width);
  currentWidth.current = width;
  const position = useRef(0);
  const reverse = useRef(false);
  const lift = useRef(0);
  const raised = useRef(false);
  const frame = useRef<number | null>(null);
  const animations = useRef<Animation[]>([]);
  const motion = useMemo(() => {
    const pose = (depth: number, x: number, elevation = lift.current) => {
      const p = deckPose(depth, x, currentWidth.current, reverse.current, elevation);
      return { transform: `translate3d(${p.x}px,${p.y}px,0) rotate(${p.angle}deg) scale(${p.scale})`, opacity: p.opacity };
    };
    const paint = () => {
      frame.current = null;
      slots.current.forEach((node, depth) => {
        if (!node) return;
        const style = pose(depth, position.current);
        node.style.transform = style.transform;
        node.style.opacity = String(style.opacity);
        node.style.zIndex = String(reverse.current && raised.current && depth === 4 ? 6 : 5 - depth);
      });
    };
    const stop = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      animations.current.forEach(animation => { animation.onfinish = null; animation.cancel(); });
      animations.current = [];
    };
    return {
      slot: (depth: number, node: unknown) => { slots.current[depth] = node as HTMLElement | null; },
      drag: (x: number, returning = false) => {
        position.current = x;
        reverse.current = returning;
        lift.current = 0;
        raised.current = false;
        if (frame.current === null) frame.current = requestAnimationFrame(paint);
      },
      reset: () => { stop(); position.current = 0; reverse.current = false; lift.current = 0; raised.current = false; paint(); },
      stop,
      returnCard: (duration: number, complete: () => void) => {
        stop();
        reverse.current = true;
        lift.current = 0;
        raised.current = false;
        const from = Math.max(0, position.current);
        const edge = deckReturnEdge(currentWidth.current);
        const stage = (startX: number, endX: number, startLift: number, endLift: number, ms: number, done: () => void) => {
          paint();
          slots.current.forEach((node, depth) => {
            if (!node) return;
            const animation = node.animate([pose(depth, startX, startLift), pose(depth, endX, endLift)], { duration: ms, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'forwards' });
            animations.current.push(animation);
          });
          const lead = animations.current[0];
          if (!lead) { complete(); return; }
          lead.onfinish = () => {
            position.current = endX;
            lift.current = endLift;
            paint();
            stop();
            done();
          };
        };
        // Change the stacking level only after the card clears the right edge.
        stage(from, edge, 0, 0, Math.max(50, duration * .42 * (1 - Math.min(1, from / edge))), () => {
          raised.current = true;
          stage(edge, edge, 0, 1, duration * .58, complete);
        });
      },
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
            return { ...pose(depth, target + (from - target) * remaining), offset: t };
          }) : [pose(depth, from), pose(depth, target)];
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
