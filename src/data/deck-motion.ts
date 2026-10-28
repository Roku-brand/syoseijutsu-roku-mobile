export const deckLayerX = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (7 + depth * 2);
export const deckLayerAngle = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (1.3 + depth * 0.45);
export const deckReturnEdge = (width: number) => width + 28;
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

/** Fixed order: forward extracts the front then tucks it into depth four;
 * reverse extracts depth four from behind, then returns it over the front. */
export function deckPose(depth: number, x: number, width: number, reverse = false, lift = 0): { x: number; y: number; angle: number; scale: number; opacity: number } {
  if (reverse) {
    const pull = Math.max(0, Math.min(1, x / deckReturnEdge(width)));
    // Same physical card, same left-hand path, with forward time reversed.
    // A rightward gesture controls the rewind, rather than mirroring its path.
    return deckPose(depth === 4 ? 0 : depth + 1, -deckReturnEdge(width) * (1 - lift), width, false, 1 - pull);
  }
  const pull = Math.max(0, Math.min(1, -x / deckReturnEdge(width)));
  if (!depth) return {
    x: lerp(x, deckLayerX(4), lift), y: 36 * lift,
    angle: lerp(Math.max(-7, Math.min(7, x / width * 7)), deckLayerAngle(4), lift),
    scale: 1 - lift * .1, opacity: 1 - lift * .4,
  };
  const progress = pull * .55 + lift * .45;
  return { x: lerp(deckLayerX(depth), deckLayerX(depth - 1), progress), y: (depth - progress) * 9,
    angle: lerp(deckLayerAngle(depth), deckLayerAngle(depth - 1), progress),
    scale: 1 - (depth - progress) * .025, opacity: 1 - (depth - progress) * .1 };
}

/** Five cards leave alternating sides; the new hand is dealt back-to-front. */
export function deckShuffleFrames(depth: number, width: number) {
  const rest = deckPose(depth, 0, width);
  const side = depth % 2 ? 1 : -1;
  const outX = side * (width * .9 + depth * 12);
  const stops = [0, .4, 1.5 + depth * .08, 1.9 + depth * .04, 2.12 + (4 - depth) * .04, 3.3 + (4 - depth) * .08, 4];
  return { stops,
    x: [rest.x, 0, outX * .9, outX, -outX, -outX * .12, rest.x],
    y: [rest.y, depth * 3, (depth - 2) * 14, (depth - 2) * 18, (depth - 2) * -18, rest.y - 4, rest.y],
    angle: [rest.angle, 0, side * 7, side * 7, -side * 7, -side, rest.angle],
    scale: [rest.scale, .96, .94, .94, .94, rest.scale + .01, rest.scale],
    opacity: [rest.opacity, rest.opacity, rest.opacity, 0, 0, rest.opacity, rest.opacity],
  };
}
