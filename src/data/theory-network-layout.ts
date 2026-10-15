/** Six fixed slots keep side nodes away from the centre, including a four-node graph. */
export function theoryNetworkPoints(width: number, count: number) {
  const slots = count === 1 ? [0] : count === 2 ? [0, 3] : count === 3 ? [0, 2, 4]
    : count === 4 ? [1, 2, 4, 5] : count === 5 ? [0, 1, 2, 4, 5] : [0, 1, 2, 3, 4, 5];
  return slots.slice(0, count).map(slot => {
    const angle = -Math.PI / 2 + slot * Math.PI / 3;
    return { x: width / 2 + (width / 2 - 58) * Math.cos(angle), y: 250 + 180 * Math.sin(angle) };
  });
}
