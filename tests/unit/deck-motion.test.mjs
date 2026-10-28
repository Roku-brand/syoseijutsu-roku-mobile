import test from 'node:test';
import assert from 'node:assert/strict';
import { deckLayerX, deckPose, deckReturnEdge } from '../../src/data/deck-motion.ts';

test('reverse extracts the bottom card while the current front stays in the stack', () => {
  const bottom = deckPose(4, 100, 320, true);
  const front = deckPose(0, 100, 320, true);
  assert.ok(bottom.x > deckLayerX(4) + 70);
  assert.ok(Math.abs(front.x) < 2);
  assert.ok(bottom.scale < 1);
});

test('reverse endpoints match the new stack with no change of content order', () => {
  for (const width of [305, 320, 356]) {
    const edge = deckReturnEdge(width);
    const returned = deckPose(4, edge, width, true, 1);
    const newFront = deckPose(0, 0, width);
    for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(returned[key] - newFront[key]) < 1e-9);
    for (let depth = 0; depth < 4; depth++) {
      const movedBack = deckPose(depth, edge, width, true, 1);
      const newSlot = deckPose(depth + 1, 0, width);
      for (const key of ['x', 'y', 'angle', 'scale']) assert.ok(Math.abs(movedBack[key] - newSlot[key]) < 1e-9);
    }
  }
});

test('cancelled reverse returns every card to its original position', () => {
  for (let depth = 0; depth < 5; depth++) assert.deepEqual(deckPose(depth, 0, 320, true), deckPose(depth, 0, 320));
});

test('forward tucks the same front card into depth four and promotes the remaining four', () => {
  for (const width of [305, 320, 356]) {
    const edge = -deckReturnEdge(width);
    const extracted = deckPose(0, edge, width);
    assert.ok(extracted.x < -width);
    assert.equal(extracted.opacity, 1);
    const tucked = deckPose(0, edge, width, false, 1);
    const bottom = deckPose(4, 0, width);
    for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(tucked[key] - bottom[key]) < 1e-9);
    for (let depth = 1; depth < 5; depth++) {
      const promoted = deckPose(depth, edge, width, false, 1);
      const next = deckPose(depth - 1, 0, width);
      for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(promoted[key] - next[key]) < 1e-9);
    }
    for (let depth = 0; depth < 5; depth++) assert.deepEqual(deckPose(depth, 0, width, false, 0), deckPose(depth, 0, width));
  }
});
