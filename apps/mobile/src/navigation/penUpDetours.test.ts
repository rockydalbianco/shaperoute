import type { LatLon, Walk } from "@shaperoute/shared-types";

import { penSplit, piecesOf, walksOf } from "../route/walks";
import { movePen, type Pen, startPen } from "./penUp";

/**
 * A shape in pieces whose detour is walked (TASK-242, ADR-0208): a smiling
 * face has three walks between its four pieces, and one more inside the
 * mouth, where the roads take it under a railway. The app reads the walks
 * as they come: one more than the pieces need changes nothing for it.
 */

const START: LatLon = [46.0664, 11.1258];
const METRE = 1 / 111_195;

// A point every 100 m: the face to 600 m, the eyes to 1000 m and 1400 m,
// the mouth in two parts, to 1700 m and from 1900 m to the end.
const POINTS: LatLon[] = Array.from({ length: 23 }, (_, i) => [
  START[0] + i * 100 * METRE,
  START[1],
]);
const ALONG = POINTS.map((_, i) => i * 100);
const WALKS: Walk[] = [
  [6, 8],
  [10, 12],
  [14, 16],
  [17, 19],
];

describe("a shape in pieces with a detour walked", () => {
  test("the walks are kept, in order, one more than between the pieces", () => {
    expect(walksOf(POINTS, WALKS)).toEqual(WALKS);
    const { letters, walks } = piecesOf(POINTS, WALKS);
    // The face, two eyes and the two parts of the mouth; four dashed lines.
    expect(letters.map((line) => line.length)).toEqual([7, 3, 3, 2, 4]);
    expect(walks.map((line) => line.length)).toEqual([3, 3, 3, 3]);
  });

  test("the drawing's metres leave out the detour too", () => {
    const split = penSplit({ points: POINTS, distance_m: 2200, walks: WALKS });
    expect(split?.walksM).toBeCloseTo(800, 0);
    expect(split?.lettersM).toBeCloseTo(1400, 0);
  });

  test("the pen goes up and down once for each walk, the detour's too", () => {
    let pen: Pen = startPen(ALONG, WALKS, null);
    const moves: string[] = [];
    const said: string[] = [];
    for (let m = 0; m <= 2200; m += 10) {
      const step = movePen(pen, m);
      pen = step.pen;
      if (step.move !== null) {
        moves.push(`${step.move} ${m}`);
      }
      said.push(...step.cues.map((cue) => cue.say));
    }
    // Up where each walk begins, down 20 m before the next part.
    expect(moves).toEqual([
      "up 600",
      "down 780",
      "up 1000",
      "down 1180",
      "up 1400",
      "down 1580",
      "up 1700",
      "down 1880",
    ]);
    expect(said).toHaveLength(8);
    expect(new Set(said)).toEqual(
      new Set([
        "Part done. Walk to the next part: the drawing is paused.",
        "Pen down: draw the next part.",
      ]),
    );
    expect(pen.next).toBe(4);
    expect(pen.up).toBe(false);
  });
});
