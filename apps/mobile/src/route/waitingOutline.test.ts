import type {
  ImageRouteRequest,
  OutlinePoint,
  RouteRequest,
} from "@shaperoute/shared-types";

import { shapeScale } from "./shapeScale";
import { inSquare, waitingOutline } from "./waitingOutline";

// The outline shown while a route is drawn (TASK-442): what the app already
// has for the request, and nothing it would have to make up.

const TRENTO: [number, number] = [46.0679, 11.1211];

const HEART: RouteRequest = {
  start: TRENTO,
  shape: "heart",
  distance_m: 5000,
  activity: "running",
};

function bounds(lines: OutlinePoint[][]) {
  const points = lines.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

test("a shape of the catalogue gives the outline the preview of «Draw» shows", () => {
  expect(waitingOutline(HEART)).toEqual(shapeScale("heart", 5000).lines);
});

test("the heart is one closed line inside the box, touching two of its sides", () => {
  const lines = waitingOutline(HEART);
  expect(lines).not.toBeNull();
  const [outline] = lines as OutlinePoint[][];
  expect(outline.length).toBeGreaterThan(10);
  expect(outline[0]).toEqual(outline[outline.length - 1]);
  const box = bounds(lines as OutlinePoint[][]);
  expect(box.minX).toBeGreaterThanOrEqual(0);
  expect(box.minY).toBeGreaterThanOrEqual(0);
  expect(box.maxX).toBeLessThanOrEqual(1);
  expect(box.maxY).toBeLessThanOrEqual(1);
  expect(Math.max(box.maxX - box.minX, box.maxY - box.minY)).toBeCloseTo(1, 9);
});

test("the distance changes the size on the ground, not the outline shown", () => {
  expect(waitingOutline({ ...HEART, distance_m: 12000 })).toEqual(
    waitingOutline(HEART),
  );
});

test("a word has no letters on the phone: no outline", () => {
  const word: RouteRequest = {
    start: TRENTO,
    word: "CIAO",
    distance_m: 5000,
    activity: "running",
  };
  expect(waitingOutline(word)).toBeNull();
  const noShape: RouteRequest = { ...word, word: "CIAO", shape: null };
  expect(waitingOutline(noShape)).toBeNull();
});

test("an image gives its own outline, turned y down and centred in the box", () => {
  // Twice as wide as tall, in the engine's frame: [-1, 1], y up.
  const image: ImageRouteRequest = {
    start: TRENTO,
    outline: [
      [-1, -0.5],
      [1, -0.5],
      [1, 0.5],
      [-1, 0.5],
      [-1, -0.5],
    ],
    distance_m: 5000,
    activity: "running",
  };
  expect(waitingOutline(image)).toEqual([
    [
      [0, 0.75],
      [1, 0.75],
      [1, 0.25],
      [0, 0.25],
      [0, 0.75],
    ],
  ]);
});

test("the details drawn on an image come with its outline, in the same frame", () => {
  const image: ImageRouteRequest = {
    start: TRENTO,
    outline: [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ],
    strokes: [
      [
        [0, 1],
        [0, 0],
      ],
    ],
    distance_m: 5000,
    activity: "running",
  };
  expect(waitingOutline(image)).toEqual([
    [
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
      [0, 1],
    ],
    [
      [0.5, 0],
      [0.5, 0.5],
    ],
  ]);
});

test("nothing to draw gives no outline, never a line made up", () => {
  expect(inSquare([])).toBeNull();
  expect(inSquare([[[0.3, 0.3]]])).toBeNull();
  expect(
    inSquare([
      [
        [0.3, 0.3],
        [0.3, 0.3],
      ],
    ]),
  ).toBeNull();
  const empty: ImageRouteRequest = {
    start: TRENTO,
    outline: [],
    distance_m: 5000,
    activity: "running",
  };
  expect(waitingOutline(empty)).toBeNull();
});
