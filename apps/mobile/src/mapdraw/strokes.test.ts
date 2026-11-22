import { type LatLon, MAX_STROKE_M, MAX_STROKE_POINTS } from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import { lineLength, type P } from "./geometry";
import { toPlane } from "./plane";
import { PIECE_M, pieces, resampled, smoothed, STEP_M, strokesOf } from "./strokes";

const TRENTO: LatLon = [46.0702, 11.1265];

/** A point `east` and `north` metres from Trento. */
function at(east: number, north: number): LatLon {
  return [
    TRENTO[0] + north / 111_195,
    TRENTO[1] + east / (111_195 * Math.cos((TRENTO[0] * Math.PI) / 180)),
  ];
}

function lengthM(line: readonly LatLon[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i += 1) {
    total += metresBetween(line[i - 1], line[i]);
  }
  return total;
}

test("resampled puts a point every step, and keeps both ends", () => {
  const line: P[] = [
    [0, 0],
    [25, 0],
    [25, 15],
  ];
  const out = resampled(line, 10);
  expect(out[0]).toEqual([0, 0]);
  expect(out[out.length - 1]).toEqual([25, 15]);
  expect(out).toEqual([
    [0, 0],
    [10, 0],
    [20, 0],
    [25, 5],
    [25, 15],
  ]);
});

test("resampled drops points repeated, and a line in one place stays one point", () => {
  expect(
    resampled([
      [3, 3],
      [3, 3],
    ]),
  ).toEqual([[3, 3]]);
});

test("smoothed cuts the corners and keeps the ends where the finger put them", () => {
  const corner: P[] = [
    [0, 0],
    [100, 0],
    [100, 100],
  ];
  const out = smoothed(corner, 1);
  expect(out[0]).toEqual([0, 0]);
  expect(out[out.length - 1]).toEqual([100, 100]);
  expect(out).not.toContainEqual([100, 0]);
  expect(lineLength(out)).toBeLessThan(lineLength(corner));
});

test("a side longer than a piece is cut into sides that fit", () => {
  const out = pieces(
    [
      [0, 0],
      [100, 0],
    ],
    500,
    30,
  );
  expect(out).toHaveLength(4);
  expect(out.every((piece) => lineLength(piece) <= 30 + 1e-9)).toBe(true);
  expect(out[3][out[3].length - 1]).toEqual([100, 0]);
});

test("pieces cuts by points and by length, each from the end of the one before", () => {
  const line: P[] = Array.from({ length: 11 }, (_, i) => [i * 10, 0]);
  const byPoints = pieces(line, 4, 1_000);
  expect(byPoints.map((piece) => piece.length)).toEqual([4, 4, 4, 2]);
  for (let i = 1; i < byPoints.length; i += 1) {
    expect(byPoints[i][0]).toEqual(byPoints[i - 1][byPoints[i - 1].length - 1]);
  }
  const byLength = pieces(line, 100, 35);
  expect(byLength.every((piece) => lineLength(piece) <= 35)).toBe(true);
  expect(
    byLength[byLength.length - 1][byLength[byLength.length - 1].length - 1],
  ).toEqual([100, 0]);
});

test("a tap gives no stroke", () => {
  expect(strokesOf([TRENTO])).toEqual([]);
  expect(strokesOf([TRENTO, TRENTO])).toEqual([]);
});

test("a wobbly straight line becomes a short straight stroke", () => {
  // 1 km east, the finger wobbling 3 m either side every 6 m.
  const wobbly = Array.from({ length: 168 }, (_, i) => at(i * 6, i % 2 === 0 ? 3 : -3));
  const [stroke, ...rest] = strokesOf(wobbly);
  expect(rest).toEqual([]);
  expect(stroke.length).toBeLessThan(10);
  expect(metresBetween(stroke[0], wobbly[0])).toBeLessThan(1);
  expect(
    metresBetween(stroke[stroke.length - 1], wobbly[wobbly.length - 1]),
  ).toBeLessThan(1);
  expect(Math.abs(lengthM(stroke) - 1_002)).toBeLessThan(15);
});

test("a corner the finger meant stays a corner", () => {
  const corner = [
    ...Array.from({ length: 51 }, (_, i) => at(i * 10, 0)),
    ...Array.from({ length: 50 }, (_, i) => at(500, (i + 1) * 10)),
  ];
  const [stroke] = strokesOf(corner);
  const nearCorner = stroke.some((point) => metresBetween(point, at(500, 0)) < 15);
  expect(nearCorner).toBe(true);
});

test("a stroke too long for one request is cut, each piece within the limits", () => {
  // 31 km of zigzag, 250 m sides: turns of 150 m kept, not flattened.
  const zigzag = Array.from({ length: 126 }, (_, i) =>
    at(i * 200, i % 2 === 0 ? 0 : 150),
  );
  const strokes = strokesOf(zigzag);
  expect(strokes.length).toBeGreaterThanOrEqual(3);
  for (const stroke of strokes) {
    expect(stroke.length).toBeLessThanOrEqual(MAX_STROKE_POINTS);
    expect(lengthM(stroke)).toBeLessThanOrEqual(MAX_STROKE_M);
  }
  for (let i = 1; i < strokes.length; i += 1) {
    const before = strokes[i - 1];
    expect(metresBetween(strokes[i][0], before[before.length - 1])).toBeLessThan(0.01);
  }
});

test("the pieces are cut short of the API's limit", () => {
  expect(PIECE_M).toBeLessThan(MAX_STROKE_M);
  expect(STEP_M).toBeGreaterThan(0);
  const plane = toPlane(TRENTO, at(30, 40));
  expect(Math.hypot(...plane)).toBeCloseTo(50, 0);
});
