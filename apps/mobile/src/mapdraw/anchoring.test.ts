import type { LatLon, StrokeMatchResult } from "@shaperoute/shared-types";

import { anchoredLines, anchoringOf, NOT_ANCHORED, NOT_ANCHORING } from "./anchoring";
import type { Stroke } from "./matching";

const ROUTE: LatLon[] = [0, 1, 2, 3].map((i) => [46.07, 11.12 + 0.001 * i]);

function stroke(state: Stroke["state"], away_m: number[] = [1, 2, 3, 4]): Stroke {
  const match: StrokeMatchResult = {
    points: ROUTE,
    away_m,
    off_roads: state === "off_roads",
  };
  return {
    line: 0,
    points: away_m.map((_, i) => ROUTE[i]),
    state,
    match: state === "matched" || state === "off_roads" ? match : null,
    retry: state === "failed",
  };
}

test("no strokes, nothing anchored: the figure as before", () => {
  expect(anchoredLines([])).toBe(NOT_ANCHORED);
  expect(anchoringOf([], false)).toBe(NOT_ANCHORING);
});

test("with strokes the figure is a ghost, under the route of those matched", () => {
  const lines = anchoredLines([stroke("matched"), stroke("pending"), stroke("failed")]);
  expect(lines.ghost).toBe(true);
  expect(lines.snapped).toEqual([ROUTE]);
  expect(lines.far).toEqual([]);
});

test("a stroke in the fields stays a ghost: no route, and a notice", () => {
  const strokes = [stroke("off_roads", [200, 300, 250, 220])];
  expect(anchoredLines(strokes)).toEqual({ ghost: true, snapped: [], far: [] });
  expect(anchoringOf(strokes, false)).toEqual({
    snapping: false,
    score: 0,
    offRoads: true,
  });
});

test("the stretches far from the finger are drawn apart", () => {
  const lines = anchoredLines([stroke("matched", [1, 90, 2, 3])]);
  expect(lines.far).toEqual([ROUTE.slice(0, 3)]);
});

test("the panel: snapping, and the score of the strokes anchored", () => {
  expect(anchoringOf([stroke("matched"), stroke("pending")], true)).toEqual({
    snapping: true,
    score: 100,
    offRoads: false,
  });
  expect(anchoringOf([stroke("pending")], true)).toEqual({
    snapping: true,
    score: null,
    offRoads: false,
  });
});
