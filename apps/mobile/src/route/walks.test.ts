import penUpResult from "@shaperoute/shared-types/fixtures/route-result-pen-up.json";
import type { LatLon, RouteResult, Walk } from "@shaperoute/shared-types";

import { NO_WALKS, penSplit, piecesOf, walkedMetres, walksOf } from "./walks";

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

/** Points `metres` north of START, in order. */
function north(...metres: number[]): LatLon[] {
  return metres.map((m) => [START[0] + m * METRE, START[1]]);
}

// «IO» of the contract: the I from 0 to 2, a walk from 2 to 5, the O after.
const RESULT = penUpResult as unknown as RouteResult;

test("the walks of the contract fit its points", () => {
  expect(walksOf(RESULT.points, RESULT.walks)).toEqual([[2, 5]]);
});

test("a route without walks, or from an API older than TASK-197, has none", () => {
  const points = north(0, 100, 200);
  expect(walksOf(points, undefined)).toBe(NO_WALKS);
  expect(walksOf(points, null)).toBe(NO_WALKS);
  expect(walksOf(points, [])).toBe(NO_WALKS);
});

test.each<[string, unknown]>([
  ["past the last point", [[1, 3]]],
  ["backwards", [[2, 1]]],
  ["of no length", [[1, 1]]],
  [
    "out of order",
    [
      [3, 4],
      [1, 2],
    ],
  ],
  [
    "overlapping",
    [
      [1, 3],
      [2, 4],
    ],
  ],
  ["not whole", [[0.5, 2]]],
  ["not a pair", [[1, 2, 3]]],
  ["not numbers", [["1", "2"]]],
])("walks %s are not trusted: the route is one line", (_name, walks) => {
  expect(walksOf(north(0, 100, 200), walks as Walk[])).toBe(NO_WALKS);
});

test("one walk may begin where the one before ends", () => {
  expect(
    walksOf(north(0, 1, 2, 3, 4), [
      [1, 2],
      [2, 3],
    ]),
  ).toEqual([
    [1, 2],
    [2, 3],
  ]);
});

test("the route cut at the walks: letters and walks share their ends", () => {
  const points = north(0, 100, 200, 300, 400, 500, 600);
  const { letters, walks } = piecesOf(points, [[2, 4]]);
  expect(letters).toEqual([points.slice(0, 3), points.slice(4)]);
  expect(walks).toEqual([points.slice(2, 5)]);
});

test("the metres of letters and walks of a word with the pen up", () => {
  const points = north(0, 100, 200, 300, 400, 500, 600);
  expect(walkedMetres(points, [[2, 4]])).toBeCloseTo(200, 0);
  const split = penSplit({ points, distance_m: 600, walks: [[2, 4]] });
  expect(split?.walksM).toBeCloseTo(200, 0);
  expect(split?.lettersM).toBeCloseTo(400, 0);
  // Any other route has no split.
  expect(penSplit({ points, distance_m: 600, walks: [] })).toBeNull();
  expect(penSplit({ points, distance_m: 600 })).toBeNull();
});
