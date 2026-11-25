import test from 'node:test';
import assert from 'node:assert/strict';
import { deckPose, deckReturnEdge, deckShuffleFrames, HOME_DECK_SIZE, HOME_DECK_LAST } from '../../src/data/deck-motion.ts';

const closePose = (actual, expected) => {
  for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]} != ${expected[key]}`);
  }
};

test('reverse extracts the bottom card while the current front stays in the stack', () => {
  const bottom = deckPose(HOME_DECK_LAST, 100, 320, true);
  const front = deckPose(0, 100, 320, true);
  assert.ok(bottom.x > 70);
  assert.ok(Math.abs(front.x) < 2);
  assert.ok(bottom.scale < 1);
});

test('reverse endpoints match the new stack with no change of content order', () => {
  for (const width of [305, 320, 356]) {
    const edge = deckReturnEdge(width);
    const returned = deckPose(HOME_DECK_LAST, edge, width, true, 1);
    const newFront = deckPose(0, 0, width);
    for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(returned[key] - newFront[key]) < 1e-9);
    for (let depth = 0; depth < HOME_DECK_LAST; depth++) {
      const movedBack = deckPose(depth, edge, width, true, 1);
      const newSlot = deckPose(depth + 1, 0, width);
      for (const key of ['x', 'y', 'angle', 'scale']) assert.ok(Math.abs(movedBack[key] - newSlot[key]) < 1e-9);
    }
  }
});

test('cancelled reverse returns every card to its original position', () => {
  for (let depth = 0; depth < HOME_DECK_SIZE; depth++) closePose(deckPose(depth, 0, 320, true), deckPose(depth, 0, 320));
});

test('reverse follows the finger to the right while retaining the stack geometry', () => {
  for (const width of [305, 320, 356]) {
    const edge = deckReturnEdge(width);
    for (let depth = 0; depth < HOME_DECK_SIZE; depth++) {
      const forwardDepth = depth === HOME_DECK_LAST ? 0 : depth + 1;
      for (const progress of [0, .2, .5, .8, 1]) {
        const pulled = deckPose(forwardDepth, -edge, width, false, 1 - progress);
        const settling = deckPose(forwardDepth, -edge * (1 - progress), width);
        if (depth === HOME_DECK_LAST) { pulled.x += 2 * edge * progress; settling.x += 2 * edge * (1 - progress); }
        closePose(deckPose(depth, edge * progress, width, true), pulled);
        closePose(deckPose(depth, edge, width, true, progress), settling);
      }
    }
    const extracted = deckPose(HOME_DECK_LAST, edge, width, true);
    assert.ok(extracted.x > width);
    assert.equal(extracted.opacity, 1);
  }
});

test('shuffle exchanges only after all seven cards leave the viewport, then enters from the right', () => {
  for (const viewport of [320, 390, 768, 1440]) {
    const width = Math.min(380, viewport - 60);
    for (let depth = 0; depth < HOME_DECK_SIZE; depth++) {
      const frames = deckShuffleFrames(depth, width, viewport);
      const rest = deckPose(depth, 0, width);
      assert.ok(frames.stops.every((stop, index) => index === 0 || stop > frames.stops[index - 1]));
      assert.ok(frames.stops[3] < 2.1 && frames.stops[4] > 2.1);
      assert.ok(frames.x[3] + width < -viewport);
      assert.ok(frames.x[4] - width > viewport);
      assert.equal(frames.opacity[3], 0);
      assert.equal(frames.opacity[4], 0);
      for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) {
        assert.equal(frames[key][0], rest[key]);
        assert.equal(frames[key].at(-1), rest[key]);
      }
    }
  }
});

test('forward tucks the same front card into depth six and promotes the remaining six', () => {
  for (const width of [305, 320, 356]) {
    const edge = -deckReturnEdge(width);
    const extracted = deckPose(0, edge, width);
    assert.ok(extracted.x < -width);
    assert.equal(extracted.opacity, 1);
    const tucked = deckPose(0, edge, width, false, 1);
    const bottom = deckPose(HOME_DECK_LAST, 0, width);
    for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(tucked[key] - bottom[key]) < 1e-9);
    for (let depth = 1; depth < HOME_DECK_SIZE; depth++) {
      const promoted = deckPose(depth, edge, width, false, 1);
      const next = deckPose(depth - 1, 0, width);
      for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) assert.ok(Math.abs(promoted[key] - next[key]) < 1e-9);
    }
    for (let depth = 0; depth < HOME_DECK_SIZE; depth++) assert.deepEqual(deckPose(depth, 0, width, false, 0), deckPose(depth, 0, width));
  }
});
