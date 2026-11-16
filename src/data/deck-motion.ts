export const deckLayerX = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (7 + depth * 2);
export const deckLayerAngle = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (1 + depth * 0.35);
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

/** Turn the hand face-down, exchange behind the backs, then reveal new faces. */
export function deckShuffleFrames(depth: number, width: number) {
  const rest = deckPose(depth, 0, width);
  const stops = [0, .4, 1.5 + depth * .08, 1.9 + depth * .04, 2.12 + (4 - depth) * .04, 3.3 + (4 - depth) * .08, 4];
  return { stops,
    x: [rest.x, rest.x - 2, rest.x - 10, rest.x - 12, rest.x - 12, rest.x + 2, rest.x],
    y: [rest.y, rest.y - 2, rest.y - 6, rest.y - 8, rest.y - 8, rest.y + 3, rest.y],
    angle: [rest.angle, rest.angle, rest.angle, rest.angle, rest.angle, rest.angle, rest.angle],
    scale: [rest.scale, rest.scale, rest.scale - .015, rest.scale - .02, rest.scale - .02, rest.scale, rest.scale],
    flip: [0, 18, 155, 180, 180, 342, 360],
    opacity: stops.map(() => rest.opacity),
  };
}
