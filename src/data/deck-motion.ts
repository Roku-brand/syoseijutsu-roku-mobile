export const deckLayerX = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (7 + depth * 2);
export const deckLayerAngle = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (1.3 + depth * 0.45);
export const deckReturnEdge = (width: number) => width + 28;
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

/** Fixed stack order: previous is always at depth four. Reverse first extracts
 * that card while it is behind the stack, then places it over the current face. */
export function deckPose(depth: number, x: number, width: number, reverse = false, lift = 0) {
  if (reverse) {
    const pull = Math.max(0, Math.min(1, x / deckReturnEdge(width)));
    if (depth === 4) return {
      x: lerp(deckLayerX(4), deckReturnEdge(width), pull) * (1 - lift),
      y: lerp(36, 24, pull) * (1 - lift),
      angle: lerp(deckLayerAngle(4), 6, pull) * (1 - lift),
      scale: .9 + pull * .04 + lift * .06,
      opacity: lerp(.6, 1, Math.min(1, pull * 3)),
    };
    const progress = pull * .45 + lift * .55;
    return { x: lerp(deckLayerX(depth), deckLayerX(depth + 1), progress), y: (depth + progress) * 9,
      angle: lerp(deckLayerAngle(depth), deckLayerAngle(depth + 1), progress), scale: 1 - (depth + progress) * .025, opacity: 1 - depth * .1 };
  }
  if (!depth) return { x, y: 0, angle: Math.max(-7, Math.min(7, x / width * 7)), scale: 1, opacity: 1 };
  const amount = Math.min(1, Math.abs(x) / width);
  return { x: lerp(deckLayerX(depth), deckLayerX(depth - 1), amount), y: lerp(depth * 9, (depth - 1) * 9, amount),
    angle: lerp(deckLayerAngle(depth), deckLayerAngle(depth - 1), amount), scale: lerp(1 - depth * .025, 1 - (depth - 1) * .025, amount), opacity: 1 - depth * .1 };
}
