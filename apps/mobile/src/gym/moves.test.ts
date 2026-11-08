/**
 * How the exercises move and how to do them (TASK-411 part E, ADR-0341):
 * every exercise of the catalog has a move and a guide in the five
 * languages; the poses of a move have the same joints, stay in the box and
 * keep their bones about the same length, so the figure never comes apart.
 */
import { LANGUAGES } from "../i18n/languages";
import { GYM_EXERCISES } from "./catalog";
import { GUIDES, guideOf } from "./guides";
import {
  bend,
  FRAMES,
  framesOf,
  type Joint,
  type Move,
  MOVE_BOX,
  MOVE_OF,
  MOVES,
  moveOf,
  type Point,
  type Pose,
} from "./moves";

const ALL_MOVES: [string, Move][] = [
  ...Object.entries(MOVES),
  ["adduction", moveOf("hip_adduction") as Move],
];

const BONES: readonly (readonly [Joint, Joint])[] = [
  ["neck", "hip"],
  ["neck", "elbow"],
  ["elbow", "hand"],
  ["hip", "knee"],
  ["knee", "foot"],
  ["neck", "elbow2"],
  ["elbow2", "hand2"],
  ["hip", "knee2"],
  ["knee2", "foot2"],
];

function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

test("every exercise of the catalog has a move, and every move is used", () => {
  for (const exercise of GYM_EXERCISES) {
    expect([exercise.key, moveOf(exercise)]).not.toEqual([exercise.key, null]);
  }
  expect(Object.keys(MOVE_OF).sort()).toEqual(GYM_EXERCISES.map((e) => e.key).sort());
  const used = new Set(Object.values(MOVE_OF));
  for (const name of Object.keys(MOVES)) {
    expect([name, used.has(name as keyof typeof MOVES)]).toEqual([name, true]);
  }
  expect(moveOf("tyre_flip")).toBeNull();
});

test("every exercise has three steps and a warning in each language", () => {
  for (const { id } of LANGUAGES) {
    expect(Object.keys(GUIDES[id]).sort()).toEqual(
      GYM_EXERCISES.map((e) => e.key).sort(),
    );
    for (const exercise of GYM_EXERCISES) {
      const guide = guideOf(exercise.key, id);
      expect(guide).toHaveLength(4);
      for (const line of guide ?? []) {
        expect(line.trim()).not.toBe("");
        // Short enough for a phone: one or two lines each.
        expect([exercise.key, id, line.length <= 110]).toEqual([
          exercise.key,
          id,
          true,
        ]);
      }
    }
  }
  expect(guideOf("tyre_flip", "it")).toBeNull();
});

test("the poses of a move have the same joints and stay in the box", () => {
  for (const [name, move] of ALL_MOVES) {
    expect(move.poses.length).toBeGreaterThanOrEqual(2);
    const joints = Object.keys(move.poses[0]).sort();
    for (const pose of move.poses) {
      expect([name, Object.keys(pose).sort()]).toEqual([name, joints]);
      for (const point of Object.values(pose) as Point[]) {
        for (const value of point) {
          expect([name, value >= -2 && value <= MOVE_BOX + 2]).toEqual([name, true]);
        }
      }
    }
  }
});

test("the bones keep about their length through every frame", () => {
  const folded: string[] = [];
  for (const [name, move] of ALL_MOVES) {
    const frames = framesOf(move);
    for (const [a, b] of BONES) {
      if (frames[0][a] === undefined || frames[0][b] === undefined) {
        continue;
      }
      const lengths = frames.map((pose) =>
        distance(pose[a] as Point, pose[b] as Point),
      );
      const longest = Math.max(...lengths);
      const shortest = Math.min(...lengths);
      // Seen from the side an arm going out of the picture looks shorter:
      // never less than a third of itself.
      if (shortest < longest / 3) {
        folded.push(`${name} ${a}-${b}`);
      }
    }
  }
  expect(folded).toEqual([]);
});

function expectPose(actual: Pose, expected: Pose) {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const joint of Object.keys(expected) as Joint[]) {
    const [x, y] = actual[joint] as Point;
    expect(x).toBeCloseTo((expected[joint] as Point)[0], 6);
    expect(y).toBeCloseTo((expected[joint] as Point)[1], 6);
  }
}

test("a pass goes through the poses and back to the first", () => {
  const frames = framesOf(MOVES.curl);
  expect(frames).toHaveLength(FRAMES + 1);
  expectPose(frames[0], MOVES.curl.poses[0]);
  expectPose(frames[FRAMES / 2], MOVES.curl.poses[1]);
  expectPose(frames[FRAMES], MOVES.curl.poses[0]);
  // The pedals go round evenly: a quarter of the pass is a quarter turn.
  const bike = framesOf(MOVES.bike);
  expectPose(bike[FRAMES / 4], MOVES.bike.poses[1]);
});

test("an arm swinging past the shoulder turns round it, keeping its length", () => {
  const frames = framesOf(MOVES.front_raise);
  for (const pose of frames) {
    expect(distance(pose.neck, pose.elbow)).toBeCloseTo(
      distance(MOVES.front_raise.poses[0].neck, MOVES.front_raise.poses[0].elbow),
      0,
    );
  }
});

test("a joint between two points keeps both bones' lengths", () => {
  const knee = bend([0, 0], [0, 20], 15, 15, 1);
  expect(distance([0, 0], knee)).toBeCloseTo(15);
  expect(distance(knee, [0, 20])).toBeCloseTo(15);
  // Bent to the right of a leg going down: the knee forward.
  expect(knee[0]).toBeGreaterThan(0);
  expect(bend([0, 0], [0, 40], 15, 15, 1)).toEqual([0, 20]);
});
