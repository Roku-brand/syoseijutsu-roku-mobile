export function drawHomeDeck<T extends { id: string; order: string[] }>(groups: readonly T[], count: number, previousGroup?: string, random = Math.random) {
  const eligible = groups.filter(group => group.order.length >= count);
  const alternatives = eligible.filter(group => group.id !== previousGroup);
  const pool = alternatives.length ? alternatives : eligible;
  const group = pool[Math.floor(random() * pool.length)];
  if (!group) return null;

  // Partial Fisher–Yates. Each eligible card has an equal chance on each draw.
  const order = group.order.slice();
  for (let index = 0; index < count; index++) {
    const picked = index + Math.floor(random() * (order.length - index));
    [order[index], order[picked]] = [order[picked], order[index]];
  }
  return { groupId: group.id, order: order.slice(0, count) };
}
