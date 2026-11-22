import type { LatLon, StrokeMatchResult } from "@shaperoute/shared-types";

import { drawingScore, engineScore, FAR_M, farStretches } from "./fidelity";
import type { Stroke } from "./matching";

/** A route due east along a street, a point every ~77 m. */
const ROUTE: LatLon[] = [0, 1, 2, 3, 4, 5].map((i) => [46.07, 11.12 + 0.001 * i]);

function stroke(away_m: number[], over: Partial<Stroke> = {}): Stroke {
  const match: StrokeMatchResult = { points: ROUTE, away_m, off_roads: false };
  return {
    line: 0,
    // The points drawn, along the route.
    points: away_m.map((_, i) => ROUTE[Math.min(i, ROUTE.length - 1)]),
    state: "matched",
    match,
    retry: false,
    ...over,
  };
}

test("no score before a stroke is anchored", () => {
  expect(drawingScore([])).toBeNull();
  expect(drawingScore([stroke([1, 2], { state: "pending", match: null })])).toBeNull();
  expect(drawingScore([stroke([1, 2], { state: "failed", match: null })])).toBeNull();
});

test("the score is the share of points drawn with a road within FAR_M", () => {
  expect(drawingScore([stroke([1, 2, FAR_M, FAR_M + 1])])).toBe(75);
  expect(drawingScore([stroke([1, 2]), stroke([100, 100])])).toBe(50);
});

test("a stroke in the fields counts, one left without an answer does not", () => {
  const fields = stroke([200, 200], { state: "off_roads" });
  expect(drawingScore([stroke([1, 1]), fields])).toBe(50);
  expect(
    drawingScore([stroke([1, 1]), stroke([200], { state: "failed", match: null })]),
  ).toBe(100);
});

test("the engine's similarity, as a whole number from 0 to 100", () => {
  expect(engineScore(0.913)).toBe(91);
  expect(engineScore(1.2)).toBe(100);
  expect(engineScore(-0.1)).toBe(0);
});

test("no far stretch when the roads follow the finger", () => {
  expect(farStretches(stroke([1, 2, 3, 4, 5, 6]))).toEqual([]);
});

test("a run of points drawn far gives the route around it, one point either side", () => {
  expect(farStretches(stroke([1, 2, 90, 95, 3, 4]))).toEqual([ROUTE.slice(1, 5)]);
});

test("a single point far still shows, and two runs give two stretches", () => {
  const stretches = farStretches(stroke([90, 1, 2, 3, 4, 95]));
  expect(stretches).toEqual([ROUTE.slice(0, 2), ROUTE.slice(4, 6)]);
});

test("a stroke not drawn by the roads has no far stretch", () => {
  expect(farStretches(stroke([90, 95], { state: "off_roads" }))).toEqual([]);
  expect(farStretches(stroke([90], { state: "failed", match: null }))).toEqual([]);
});
