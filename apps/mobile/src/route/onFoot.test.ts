import type { LatLon, RouteResult } from "@shaperoute/shared-types";

import cycling from "@shaperoute/shared-types/fixtures/route-result-cycling.json";
import { NO_STRETCHES, onFootLines, onFootOf } from "./onFoot";

const ROUTE: LatLon[] = [
  [46.01, 11.3],
  [46.02, 11.3],
  [46.03, 11.3],
  [46.03, 11.31],
  [46.02, 11.31],
  [46.01, 11.31],
];

test("the stretches the API sends, when they fit the route (TASK-206)", () => {
  expect(onFootOf(ROUTE, [[1, 2]])).toEqual([[1, 2]]);
  expect(
    onFootOf(ROUTE, [
      [0, 1],
      [1, 3],
    ]),
  ).toEqual([
    [0, 1],
    [1, 3],
  ]);
  const result = cycling as unknown as RouteResult;
  expect(onFootOf(result.points, result.on_foot)).toEqual(result.on_foot);
});

test("none from an older API, a run, or stretches that do not fit", () => {
  expect(onFootOf(ROUTE, undefined)).toBe(NO_STRETCHES);
  expect(onFootOf(ROUTE, null)).toBe(NO_STRETCHES);
  expect(onFootOf(ROUTE, [])).toBe(NO_STRETCHES);
  // Past the last point, backwards, out of order, not whole.
  expect(onFootOf(ROUTE, [[4, 6]])).toBe(NO_STRETCHES);
  expect(onFootOf(ROUTE, [[3, 2]])).toBe(NO_STRETCHES);
  expect(
    onFootOf(ROUTE, [
      [3, 4],
      [1, 2],
    ]),
  ).toBe(NO_STRETCHES);
  expect(onFootOf(ROUTE, [[1.5, 3]])).toBe(NO_STRETCHES);
});

test("each stretch is a line of the route's own points", () => {
  expect(
    onFootLines(ROUTE, [
      [0, 1],
      [3, 5],
    ]),
  ).toEqual([
    [ROUTE[0], ROUTE[1]],
    [ROUTE[3], ROUTE[4], ROUTE[5]],
  ]);
  expect(onFootLines(ROUTE, undefined)).toEqual([]);
  expect(onFootLines(ROUTE, [[4, 9]])).toEqual([]);
});

test("not on the walks of a word with the pen up, which are not drawn", () => {
  // Walked between letters from 2 to 4: the stretch 1–5 is marked on the
  // letters only, before and after the walk.
  expect(onFootLines(ROUTE, [[1, 5]], [[2, 4]])).toEqual([
    [ROUTE[1], ROUTE[2]],
    [ROUTE[4], ROUTE[5]],
  ]);
  // A stretch all on a walk is not marked.
  expect(onFootLines(ROUTE, [[2, 3]], [[2, 4]])).toEqual([]);
  // Walks that do not fit are no walks: the stretch is marked whole.
  expect(onFootLines(ROUTE, [[1, 3]], [[2, 9]])).toEqual([
    [ROUTE[1], ROUTE[2], ROUTE[3]],
  ]);
});
