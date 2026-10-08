import type { LatLon, Walk } from "@shaperoute/shared-types";

import { cumulative } from "../navigation/progress";
import { doneMetres, PROGRESS_STEP_M, splitRoute } from "./routeSplit";

// Points 0.001° of latitude apart: about 111 m each, along one meridian.
const STEP_DEG = 0.001;
function line(count: number): LatLon[] {
  return Array.from({ length: count }, (_, i) => [46 + i * STEP_DEG, 11] as LatLon);
}

const ROUTE = line(5);
const ALONG = cumulative(ROUTE);
const LEG_M = ALONG[1];

test("before the first metre, the whole route is ahead", () => {
  expect(splitRoute(ROUTE, ALONG, 0)).toEqual({ done: [], ahead: [ROUTE] });
});

test("run to its end, the whole route is done", () => {
  expect(splitRoute(ROUTE, ALONG, Infinity)).toEqual({ done: [ROUTE], ahead: [] });
  expect(splitRoute(ROUTE, ALONG, ALONG[4])).toEqual({ done: [ROUTE], ahead: [] });
});

test("cuts inside a segment, and both parts share the point of the cut", () => {
  const { done, ahead } = splitRoute(ROUTE, ALONG, LEG_M * 1.5);
  expect(done).toHaveLength(1);
  expect(ahead).toHaveLength(1);
  const cut = done[0].at(-1)!;
  expect(done[0].slice(0, -1)).toEqual(ROUTE.slice(0, 2));
  expect(ahead[0]).toEqual([cut, ...ROUTE.slice(2)]);
  // Half way between the second and the third point.
  expect(cut[0]).toBeCloseTo(46 + 1.5 * STEP_DEG, 9);
  expect(cut[1]).toBe(11);
});

test("cuts on a point: the parts meet there", () => {
  const { done, ahead } = splitRoute(ROUTE, ALONG, ALONG[2]);
  expect(done).toEqual([[...ROUTE.slice(0, 3), ROUTE[2]]]);
  expect(ahead).toEqual([[ROUTE[2], ...ROUTE.slice(3)]]);
});

test("too short a route has nothing to cut", () => {
  expect(splitRoute([], [], 10)).toEqual({ done: [], ahead: [] });
  expect(splitRoute([ROUTE[0]], [0], 10)).toEqual({ done: [], ahead: [] });
});

describe("a word with the pen up (TASK-198): only the letters are cut", () => {
  // Letters 0–2 and 4–7, a walk 2–4 between them.
  const word = line(8);
  const along = cumulative(word);
  const walks: Walk[] = [[2, 4]];

  test("at the start, both letters are ahead and the walk is in neither", () => {
    expect(splitRoute(word, along, 0, walks)).toEqual({
      done: [],
      ahead: [word.slice(0, 3), word.slice(4)],
    });
  });

  test("inside the walk, the first letter is done and the second ahead", () => {
    expect(splitRoute(word, along, along[3], walks)).toEqual({
      done: [word.slice(0, 3)],
      ahead: [word.slice(4)],
    });
  });

  test("inside the second letter, it is cut there", () => {
    const { done, ahead } = splitRoute(word, along, along[5], walks);
    expect(done).toEqual([word.slice(0, 3), [...word.slice(4, 6), word[5]]]);
    expect(ahead).toEqual([[word[5], ...word.slice(6)]]);
  });

  test("walks that do not fit the points leave the route one line", () => {
    const wrong: Walk[] = [[4, 2]];
    expect(splitRoute(word, along, 0, wrong)).toEqual({ done: [], ahead: [word] });
  });
});

test("the map is told of the progress in steps", () => {
  expect(PROGRESS_STEP_M).toBe(5);
  expect(doneMetres({ alongM: 0, arrived: false })).toBe(0);
  expect(doneMetres({ alongM: 4.9, arrived: false })).toBe(0);
  expect(doneMetres({ alongM: 5, arrived: false })).toBe(5);
  expect(doneMetres({ alongM: 1234.5, arrived: false })).toBe(1230);
});

test("arrived, nothing is left ahead even short of the last point", () => {
  const doneM = doneMetres({ alongM: ALONG[4] - 20, arrived: true });
  expect(doneM).toBe(Infinity);
  expect(splitRoute(ROUTE, ALONG, doneM).ahead).toEqual([]);
});
