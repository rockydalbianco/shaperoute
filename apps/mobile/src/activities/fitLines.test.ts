import type { LatLon } from "@shaperoute/shared-types";

import { fitLines } from "./fitLines";

/** A square about 111 m a side at the equator, where east and north weigh
 * the same. */
const SQUARE: LatLon[] = [
  [0, 0],
  [0, 0.001],
  [0.001, 0.001],
  [0.001, 0],
  [0, 0],
];

test("the lines share one frame: the run lies on the route it followed", () => {
  const firstSide = SQUARE.slice(0, 2);
  const [route, track] = fitLines([SQUARE, firstSide], 100, 100, 10);
  expect(route).toHaveLength(4);
  expect(track).toHaveLength(1);
  // The bottom side of the square, left to right, for both.
  expect(track[0]).toEqual(route[0]);
  expect(route[0].left).toBeCloseTo(10);
  expect(route[0].top).toBeCloseTo(90);
  expect(route[0].length).toBeCloseTo(80);
  expect(route[0].angle).toBeCloseTo(0);
});

test("the frame holds every line, whichever is wider", () => {
  // The run went twice as far east as the route.
  const run: LatLon[] = [
    [0, 0],
    [0, 0.002],
  ];
  const [route, track] = fitLines([SQUARE, run], 120, 100, 10);
  expect(track[0].left).toBeCloseTo(10);
  expect(track[0].length).toBeCloseTo(100);
  // The square is half as wide, and keeps its proportions: 50 by 50.
  expect(route[0].length).toBeCloseTo(50);
  expect(route[1].length).toBeCloseTo(50);
  for (const s of [...route, ...track]) {
    // A segment is given by its middle: its ends are half its length away.
    const turn = (s.angle * Math.PI) / 180;
    const midX = s.left + s.length / 2;
    const halfX = (Math.abs(Math.cos(turn)) * s.length) / 2;
    const halfY = (Math.abs(Math.sin(turn)) * s.length) / 2;
    expect(midX - halfX).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(midX + halfX).toBeLessThanOrEqual(110 + 1e-6);
    expect(s.top - halfY).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(s.top + halfY).toBeLessThanOrEqual(90 + 1e-6);
  }
});

test("north is up", () => {
  const north: LatLon[] = [
    [0, 0],
    [0.001, 0],
  ];
  const [[segment]] = fitLines([north], 100, 100, 10);
  // From the bottom to the top of the box: turned a quarter, upwards.
  expect(segment.angle).toBeCloseTo(-90);
  expect(segment.length).toBeCloseTo(80);
});

test("a run without a route is drawn alone", () => {
  const [route, track] = fitLines([[], SQUARE], 100, 100, 10);
  expect(route).toEqual([]);
  expect(track).toHaveLength(4);
});

test("less than a line draws nothing", () => {
  expect(fitLines([[], [[46, 11]]], 100, 100, 10)).toEqual([[], []]);
  expect(fitLines([], 100, 100, 10)).toEqual([]);
  // The same point twice has no length.
  const still: LatLon[] = [
    [46, 11],
    [46, 11],
  ];
  expect(fitLines([still], 100, 100, 10)).toEqual([[]]);
});

test("a long run with a point every few metres is one line (TASK-254)", () => {
  // A square 2 km a side at the equator, a position every 5 m: 1600 points
  // in a box 190 × 200 pt, where 5 m is less than half a point.
  const side = 0.018;
  const step = side / 400;
  const run: LatLon[] = [];
  for (let i = 0; i < 400; i += 1) run.push([0, i * step]);
  for (let i = 0; i < 400; i += 1) run.push([i * step, side]);
  for (let i = 0; i < 400; i += 1) run.push([side, side - i * step]);
  for (let i = 0; i <= 400; i += 1) run.push([side - i * step, 0]);
  const [segments] = fitLines([run], 190, 200, 10);
  expect(segments.length).toBeGreaterThan(300);
  // The segments add up to the square's four sides, 170 pt each.
  const drawn = segments.reduce((sum, s) => sum + s.length, 0);
  expect(drawn).toBeGreaterThan(4 * 170 * 0.99);
  expect(drawn).toBeLessThanOrEqual(4 * 170 + 1e-3);
  // Each starts where the one before ended: one line, no gaps.
  const ends = segments.map((s) => {
    const turn = (s.angle * Math.PI) / 180;
    const midX = s.left + s.length / 2;
    const half = s.length / 2;
    return {
      from: [midX - Math.cos(turn) * half, s.top - Math.sin(turn) * half],
      to: [midX + Math.cos(turn) * half, s.top + Math.sin(turn) * half],
    };
  });
  for (let i = 1; i < ends.length; i += 1) {
    expect(ends[i].from[0]).toBeCloseTo(ends[i - 1].to[0], 6);
    expect(ends[i].from[1]).toBeCloseTo(ends[i - 1].to[1], 6);
  }
});
