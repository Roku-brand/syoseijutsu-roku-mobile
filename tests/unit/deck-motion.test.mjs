import test from 'node:test';
import assert from 'node:assert/strict';
import { deckPose, deckReturnEdge, deckShuffleFrames } from '../../src/data/deck-motion.ts';

const closePose = (actual, expected) => {
  for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]} != ${expected[key]}`);
  }
};

test('reverse extracts the bottom card while the current front stays in the stack', () => {
  const bottom = deckPose(4, 100, 320, true);
  const front = deckPose(0, 100, 320, true);
  assert.ok(bottom.x < -70);
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
  for (let depth = 0; depth < 5; depth++) closePose(deckPose(depth, 0, 320, true), deckPose(depth, 0, 320));
});

test('reverse retraces the same left-hand path for each physical card', () => {
  for (const width of [305, 320, 356]) {
    const edge = deckReturnEdge(width);
    for (let depth = 0; depth < 5; depth++) {
      const forwardDepth = depth === 4 ? 0 : depth + 1;
      for (const progress of [0, .2, .5, .8, 1]) {
        closePose(deckPose(depth, edge * progress, width, true), deckPose(forwardDepth, -edge, width, false, 1 - progress));
        closePose(deckPose(depth, edge, width, true, progress), deckPose(forwardDepth, -edge * (1 - progress), width));
      }
    }
    const extracted = deckPose(4, edge, width, true);
    assert.ok(extracted.x < -width);
    assert.equal(extracted.opacity, 1);
  }
});

test('replacement sends all five cards out and deals the new hand from the opposite side', () => {
  for (const width of [305, 320, 356]) {
    const sides = new Set();
    for (let depth = 0; depth < 5; depth++) {
      const frames = deckShuffleFrames(depth, width);
      const rest = deckPose(depth, 0, width);
      assert.ok(frames.stops.every((stop, index) => index === 0 || stop > frames.stops[index - 1]));
      assert.ok(Math.abs(frames.x[3]) >= width * .9);
      assert.equal(frames.x[4], -frames.x[3]);
      assert.equal(frames.opacity[3], 0);
      assert.equal(frames.opacity[4], 0);
      assert.ok(frames.stops[3] < 2.1 && frames.stops[4] > 2.1);
      assert.ok(frames.angle.every(angle => Math.abs(angle) <= 7));
      for (const key of ['x', 'y', 'angle', 'scale', 'opacity']) {
        assert.equal(frames[key][0], rest[key]);
        assert.equal(frames[key].at(-1), rest[key]);
      }
      sides.add(Math.sign(frames.x[3]));
    }
    assert.deepEqual([...sides].sort(), [-1, 1]);
  }
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
