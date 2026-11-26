import type { LatLon, Shape } from "@shaperoute/shared-types";

import { lineCamera } from "../feed/feedMapPage";
import catalogue from "../mapdraw/catalogueShapes.json";
import { lookOf } from "../mapdraw/figure";
import { lineLength } from "../mapdraw/geometry";
import { toPlane } from "../mapdraw/plane";
import {
  BASE_FRAME_M,
  dashesOf,
  FRAME_FILL,
  FRAME_STEP,
  livePreview,
  placeIn,
} from "./previewFrame";

// Piazza del Duomo, Trento.
const START: LatLon = [46.0679, 11.1211];
const WIDTH = 340;
const HEIGHT = 190;
const SHAPES = Object.keys(catalogue.shapes) as Shape[];

function shape(name: Shape) {
  return lookOf({ kind: "shape", shape: name });
}

function preview(name: Shape, distanceM: number) {
  const made = livePreview(shape(name), START, distanceM, WIDTH, HEIGHT);
  if (made === null) {
    throw new Error("no preview");
  }
  return made;
}

/** The metres of a line on the map, on the plane tangent at the start. */
function metresOf(line: LatLon[]): number {
  const flat = line.map((point) => toPlane(START, point));
  let total = 0;
  for (let i = 1; i < flat.length; i += 1) {
    total += Math.hypot(flat[i][0] - flat[i - 1][0], flat[i][1] - flat[i - 1][1]);
  }
  return total;
}

test("the first point of the outline is on the start", () => {
  for (const name of ["circle", "heart", "star", "horse"] as const) {
    const { lines, dot, points } = preview(name, 5000);
    expect(lines[0][0][0]).toBeCloseTo(START[0], 9);
    expect(lines[0][0][1]).toBeCloseTo(START[1], 9);
    // In the box too: the dot is where the line begins.
    expect(points[0][0][0]).toBeCloseTo(dot[0], 6);
    expect(points[0][0][1]).toBeCloseTo(dot[1], 6);
  }
});

test("a unit of the outline is the distance over the length the engine takes it to be", () => {
  for (const name of ["circle", "heart", "star", "bicycle"] as const) {
    const look = shape(name);
    const { lines } = preview(name, 8000);
    expect(lines).toHaveLength(look.lines.length);
    lines.forEach((line, index) => {
      const units = lineLength(look.lines[index]);
      expect(metresOf(line) / units).toBeCloseTo(8000 / look.length, 6);
    });
  }
  // A circle is what it looks: as long as the distance, to a part in a hundred.
  expect(Math.abs(metresOf(preview("circle", 8000).lines[0]) / 8000 - 1)).toBeLessThan(
    0.01,
  );
});

test("north is up: what is higher on the plane is further north and higher in the box", () => {
  const look = shape("christmas_tree");
  const flat = look.lines.flat();
  const top = flat.reduce((a, b) => (b[1] > a[1] ? b : a));
  const at = flat.indexOf(top);
  const { lines, points } = preview("christmas_tree", 6000);
  const lats = lines.flat().map(([lat]) => lat);
  const ys = points.flat().map(([, y]) => y);
  expect(lats[at]).toBe(Math.max(...lats));
  expect(ys[at]).toBe(Math.min(...ys));
});

test("a circle of 2π km is 2 km across", () => {
  const { widthM, heightM } = preview("circle", 2000 * Math.PI);
  expect(widthM).toBeCloseTo(2000, -1);
  expect(heightM).toBeCloseTo(2000, -1);
});

test("within a step the frame stays and the outline grows from the start", () => {
  // The step of 5 km: found, not assumed.
  const at = preview("heart", 5000);
  let lowest = 5000;
  while (preview("heart", lowest - 100).key === at.key) {
    lowest -= 100;
  }
  let highest = 5000;
  while (preview("heart", highest + 100).key === at.key) {
    highest += 100;
  }
  expect(highest).toBeGreaterThan(lowest + 500);
  const small = preview("heart", lowest);
  const large = preview("heart", highest);
  expect(small.frame).toEqual(large.frame);
  expect(small.corners).toEqual(large.corners);
  // The start does not move on the picture; the outline is larger.
  expect(small.dot[0]).toBeCloseTo(large.dot[0], 9);
  expect(small.dot[1]).toBeCloseTo(large.dot[1], 9);
  const span = (points: number[][][]) => {
    const xs = points.flat().map(([x]) => x);
    return Math.max(...xs) - Math.min(...xs);
  };
  expect(span(large.points) / span(small.points)).toBeCloseTo(highest / lowest, 6);
});

test("past a step the frame is a step wider: two steps double it", () => {
  const widths = new Set<number>();
  for (let metres = 1000; metres <= 50_000; metres += 250) {
    widths.add(preview("heart", metres).frame.widthM);
  }
  const sorted = [...widths].sort((a, b) => a - b);
  expect(sorted.length).toBeGreaterThan(6);
  for (let i = 1; i < sorted.length; i += 1) {
    expect(sorted[i] / sorted[i - 1]).toBeCloseTo(FRAME_STEP, 2);
  }
  for (let i = 2; i < sorted.length; i += 1) {
    expect(sorted[i] / sorted[i - 2]).toBeCloseTo(2, 2);
  }
  for (const width of sorted) {
    // To the metre, so a frame has one name.
    expect(Number.isInteger(width)).toBe(true);
    const steps = Math.log(width / BASE_FRAME_M) / Math.log(FRAME_STEP);
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(0.01);
  }
});

test("every shape of the catalogue stays inside the box, at every distance", () => {
  // The room FRAME_FILL leaves at the edges, on the narrower side.
  const edge = ((1 - FRAME_FILL) / 2) * Math.min(WIDTH, HEIGHT * (WIDTH / HEIGHT));
  expect(edge).toBeGreaterThan(8);
  for (const name of SHAPES) {
    for (const metres of [500, 1000, 2300, 5000, 9900, 21_000, 50_000]) {
      const { points, dot } = preview(name, metres);
      const flat = [...points.flat(), dot];
      const xs = flat.map(([x]) => x);
      const ys = flat.map(([, y]) => y);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(WIDTH);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(HEIGHT);
      // And it is never a speck: over half the room, one way.
      const across = (Math.max(...xs) - Math.min(...xs)) / WIDTH;
      const down = (Math.max(...ys) - Math.min(...ys)) / HEIGHT;
      expect(Math.max(across, down)).toBeGreaterThan(FRAME_FILL / FRAME_STEP - 0.01);
    }
  }
});

test("the corners, fitted in the box as the feed's map does, are the frame", () => {
  const made = preview("horse", 12_000);
  const camera = lineCamera(made.corners, WIDTH, HEIGHT, 0);
  if (camera === null) {
    throw new Error("no camera");
  }
  // The middle of the picture is the middle of the frame.
  const [x, y] = toPlane(START, [camera.center[1], camera.center[0]]);
  expect(x).toBeCloseTo(made.frame.centre[0], 3);
  expect(y).toBeCloseTo(made.frame.centre[1], 3);
  // Points for a metre: MapLibre's world is 512 points at zoom 0.
  const lat = (camera.center[1] * Math.PI) / 180;
  const perMetre = (512 * 2 ** camera.zoom) / (2 * Math.PI * 6_371_000 * Math.cos(lat));
  expect(perMetre / (WIDTH / made.frame.widthM)).toBeCloseTo(1, 3);
});

test("another start, another picture; the same start and step, the same", () => {
  const here = preview("star", 5000);
  const again = preview("star", 5200);
  const there = livePreview(shape("star"), [45.4642, 9.19], 5000, WIDTH, HEIGHT);
  expect(again.key).toBe(here.key);
  expect(there?.key).not.toBe(here.key);
});

test("nothing to draw, nowhere to draw it: no preview", () => {
  const look = shape("circle");
  expect(livePreview(look, START, 0, WIDTH, HEIGHT)).toBeNull();
  expect(livePreview(look, START, 5000, 0, HEIGHT)).toBeNull();
  expect(livePreview({ ...look, lines: [] }, START, 5000, WIDTH, HEIGHT)).toBeNull();
  expect(livePreview({ ...look, length: 0 }, START, 5000, WIDTH, HEIGHT)).toBeNull();
});

test("dashes along a straight line", () => {
  const dashes = dashesOf(
    [
      [0, 10],
      [20, 10],
    ],
    4,
    4,
    2,
  );
  expect(dashes.map(({ left, length }) => [left, left + length])).toEqual([
    [0, 4],
    [8, 12],
    [16, 20],
  ]);
  expect(dashes.every(({ top, angle }) => top === 9 && angle === 0)).toBe(true);
});

test("the pattern runs on round a corner", () => {
  const dashes = dashesOf(
    [
      [0, 0],
      [6, 0],
      [6, 10],
    ],
    4,
    4,
    2,
  );
  // 0–4 on the first side; 8–12 along the line is 2–6 down the second.
  expect(dashes).toHaveLength(2);
  expect(dashes[1].angle).toBeCloseTo(Math.PI / 2);
  expect(dashes[1].length).toBeCloseTo(4);
  // Half the line is dash, whatever its corners.
  const drawn = dashes.reduce((total, { length }) => total + length, 0);
  expect(drawn).toBeCloseTo(8);
  expect(dashesOf([[0, 0]], 4, 4, 2)).toEqual([]);
  expect(
    dashesOf(
      [
        [0, 0],
        [9, 0],
      ],
      0,
      4,
      2,
    ),
  ).toEqual([]);
});

test("the longest outline of the catalogue is a few hundred dashes", () => {
  let most = 0;
  for (const name of SHAPES) {
    for (const metres of [1900, 5000, 14_000]) {
      const { points } = preview(name, metres);
      const dashes = points.flatMap((line) => dashesOf(line, 4, 4, 2));
      most = Math.max(most, dashes.length);
    }
  }
  expect(most).toBeLessThan(400);
});

test("the frame before, placed in the box of the frame after it", () => {
  // The heart at the top of one step and just past it: the same start.
  let metres = 5000;
  while (preview("heart", metres + 50).key === preview("heart", 5000).key) {
    metres += 50;
  }
  const old = preview("heart", metres);
  const now = preview("heart", metres + 50);
  const place = placeIn(now.frame, old.frame, WIDTH);
  // A step narrower, with the box's proportions.
  expect(place.width).toBeCloseTo(WIDTH / FRAME_STEP, 0);
  expect(place.width / place.height).toBeCloseTo(WIDTH / HEIGHT, 6);
  // The start is the same point of the ground: on the old picture, placed,
  // it falls where the new frame has it.
  const share = [old.dot[0] / WIDTH, old.dot[1] / HEIGHT];
  expect(place.left + share[0] * place.width).toBeCloseTo(now.dot[0], 6);
  expect(place.top + share[1] * place.height).toBeCloseTo(now.dot[1], 6);
  // The other way, stepping back in: the wider picture is larger than the box.
  const back = placeIn(old.frame, now.frame, WIDTH);
  expect(back.width).toBeCloseTo(WIDTH * FRAME_STEP, 0);
  expect(back.left + (now.dot[0] / WIDTH) * back.width).toBeCloseTo(old.dot[0], 6);
  // The same frame fills the box.
  expect(placeIn(now.frame, now.frame, WIDTH)).toEqual({
    left: 0,
    top: 0,
    width: WIDTH,
    height: HEIGHT,
  });
});
