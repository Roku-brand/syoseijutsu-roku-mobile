export const HOME_DECK_SIZE = 7;
export const HOME_DECK_LAST = HOME_DECK_SIZE - 1;

export const deckLayerX = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (7 + depth * 2);
export const deckLayerAngle = (depth: number) => depth === 0 ? 0 : (depth % 2 ? -1 : 1) * (1 + depth * 0.35);
export const deckReturnEdge = (width: number) => width + 28;
const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;

/** Fixed order: forward extracts the front then tucks it into the bottom;
 * reverse extracts the bottom from behind, then returns it over the front. */
export function deckPose(depth: number, x: number, width: number, reverse = false, lift = 0): { x: number; y: number; angle: number; scale: number; opacity: number } {
  if (reverse) {
    const pull = Math.max(0, Math.min(1, x / deckReturnEdge(width)));
    // Same physical card, same left-hand path, with forward time reversed.
    // A rightward gesture controls the rewind, rather than mirroring its path.
    return deckPose(depth === HOME_DECK_LAST ? 0 : depth + 1, -deckReturnEdge(width) * (1 - lift), width, false, 1 - pull);
  }
  const pull = Math.max(0, Math.min(1, -x / deckReturnEdge(width)));
  if (!depth) return {
    x: lerp(x, deckLayerX(HOME_DECK_LAST), lift), y: HOME_DECK_LAST * 9 * lift,
    angle: lerp(Math.max(-7, Math.min(7, x / width * 7)), deckLayerAngle(HOME_DECK_LAST), lift),
    scale: 1 - lift * HOME_DECK_LAST * .025, opacity: 1 - lift * HOME_DECK_LAST * .1,
  };
  const progress = pull * .55 + lift * .45;
  return { x: lerp(deckLayerX(depth), deckLayerX(depth - 1), progress), y: (depth - progress) * 9,
    angle: lerp(deckLayerAngle(depth), deckLayerAngle(depth - 1), progress),
    scale: 1 - (depth - progress) * .025, opacity: 1 - (depth - progress) * .1 };
}

/** Old cards leave the viewport to the left; a new hand arrives from the right.
 * Exchange only while every slot is outside the viewport and invisible. */
export function deckShuffleFrames(depth: number, width: number, viewportWidth = width) {
  const rest = deckPose(depth, 0, width);
  const distance = viewportWidth + width + 80;
  const stops = [0, .2 + depth * .05, 1.4 + depth * .07, 2.04 + depth * .008, 2.16 + (HOME_DECK_LAST - depth) * .008, 3.2 + (HOME_DECK_LAST - depth) * .07, 4];
  return { stops,
    x: [rest.x, rest.x + 8, -distance * .7, -distance, distance, rest.x - 5, rest.x],
    y: [rest.y, rest.y - 2, rest.y - 14, rest.y - 20, rest.y + 16, rest.y, rest.y],
    angle: [rest.angle, rest.angle + 1, -8, -12, 10, rest.angle - 1, rest.angle],
    scale: [rest.scale, rest.scale, rest.scale - .03, rest.scale - .04, rest.scale - .04, rest.scale, rest.scale],
    opacity: [rest.opacity, rest.opacity, rest.opacity, 0, 0, rest.opacity, rest.opacity],
  };
}
