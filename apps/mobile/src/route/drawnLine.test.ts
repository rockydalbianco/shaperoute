import { MAX_DRAWN_POINTS, type OutlinePoint } from "@shaperoute/shared-types";

import { shareOf, thinLine } from "./drawnLine";

test("points too close to the one kept before are left out", () => {
  const line: OutlinePoint[] = [
    [0, 0],
    [0.004, 0],
    [0.008, 0],
    [0.012, 0],
    [0.5, 0.5],
    [0.501, 0.5],
  ];
  expect(thinLine(line, 0.01)).toEqual([
    [0, 0],
    [0.012, 0],
    [0.5, 0.5],
    [0.501, 0.5],
  ]);
});

test("the first and the last point always stay", () => {
  const dot: OutlinePoint[] = [
    [0.3, 0.3],
    [0.3, 0.3],
    [0.3, 0.3],
  ];
  expect(thinLine(dot, 0.01)).toEqual([
    [0.3, 0.3],
    [0.3, 0.3],
  ]);
  expect(thinLine([[0.1, 0.1]], 0.01)).toEqual([[0.1, 0.1]]);
});

test("a very long drawing is cut to the most points the API takes", () => {
  const long: OutlinePoint[] = Array.from({ length: 5000 }, (_, i) => [i / 5000, 0]);
  const thin = thinLine(long, 0);
  expect(thin).toHaveLength(MAX_DRAWN_POINTS);
  expect(thin[0]).toEqual(long[0]);
  expect(thin[thin.length - 1]).toEqual(long[long.length - 1]);
});

test("a touch becomes shares of the box, kept inside it", () => {
  expect(shareOf(100, 75, 400, 300)).toEqual([0.25, 0.25]);
  expect(shareOf(-5, 400, 400, 300)).toEqual([0, 1]);
});
