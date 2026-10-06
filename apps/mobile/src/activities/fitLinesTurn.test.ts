/**
 * Lines fitted as a map turned shows them (TASK-232, ADR-0195): a run along
 * a turned route is drawn turned back, route and run together, so the
 * drawing reads upright. The rest of fitLines is in fitLines.test.ts.
 */
import type { LatLon } from "@shaperoute/shared-types";

import { fitLines } from "./fitLines";

const RAD = Math.PI / 180;
// The «up» of a shape turned 30° counterclockwise: a stroke from Trento
// that points 30° west of north, as long in metres as it looks.
const NORTH = 0.01 * Math.cos(30 * RAD);
const UP: LatLon[] = [
  [46.06, 11.12],
  [
    46.06 + NORTH,
    11.12 - (0.01 * Math.sin(30 * RAD)) / Math.cos((46.06 + NORTH / 2) * RAD),
  ],
];

/** A square about 111 m a side at the equator. */
const SQUARE: LatLon[] = [
  [0, 0],
  [0, 0.001],
  [0.001, 0.001],
  [0.001, 0],
  [0, 0],
];

test("a stroke turned 30° is drawn turned back at a bearing of -30: it is up", () => {
  const [[stroke]] = fitLines([UP], 100, 100, 10, -30);
  expect(stroke.angle).toBeCloseTo(-90, 4);
  expect(stroke.length).toBeCloseTo(80, 4);
  // North up it leans, as on a map with north up.
  const [[leaning]] = fitLines([UP], 100, 100, 10);
  expect(leaning.angle).toBeCloseTo(-120, 4);
  expect(fitLines([UP], 100, 100, 10, 0)).toEqual(fitLines([UP], 100, 100, 10));
});

test("the lines turn about one middle: the run still lies on its route", () => {
  const firstSide = SQUARE.slice(0, 2);
  const [route, track] = fitLines([SQUARE, firstSide], 100, 100, 10, 90);
  expect(route).toHaveLength(4);
  expect(track).toHaveLength(1);
  // The bottom side, running east with north up, now runs down the left:
  // what pointed east points down at a bearing of 90.
  expect(track[0]).toEqual(route[0]);
  expect(Math.abs(route[0].angle)).toBeCloseTo(90, 4);
  expect(route[0].length).toBeCloseTo(80, 4);
  // And the frame still holds the square whole, 80 by 80.
  for (const s of route) {
    expect(s.length).toBeCloseTo(80, 4);
  }
});

test("a turn by a full circle changes nothing but rounding", () => {
  const [[once]] = fitLines([UP], 100, 100, 10);
  const [[around]] = fitLines([UP], 100, 100, 10, 360);
  expect(around.angle).toBeCloseTo(once.angle, 6);
  expect(around.left).toBeCloseTo(once.left, 6);
  expect(around.top).toBeCloseTo(once.top, 6);
});
