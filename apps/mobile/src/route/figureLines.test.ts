import type { LatLon, OutlinePoint } from "@shaperoute/shared-types";
import imageRequest from "@shaperoute/shared-types/fixtures/image-route-request.json";

import { metresBetween } from "../map/coordinates";
import { isOpenLine } from "../mapdraw/drawing";
import { drawingOf } from "../mapdraw/edit";
import { distanceOf, onMap } from "../mapdraw/figure";
import { fromPlane } from "../mapdraw/plane";
import { drawingTrack, requestLines, routeTrack, trackInPlace } from "./figureLines";

/**
 * The lines «Edit the drawing» puts on the map (TASK-320, TASK-331): of a
 * route asked for, of a route run; in the engine's frame, [-1, 1] with y
 * up. A shape of the catalogue — an emoji — has none (ADR-0288). The
 * track of a member's drawing goes where it was run, as big (TASK-346), and
 * since TASK-369 (ADR-0313) so does the line of every drawing and route.
 */

const TRENTO: LatLon = [46.0671, 11.1214];

/** A loop of 50 points around Trento, as a run of a picture leaves it. */
const RING: LatLon[] = Array.from({ length: 50 }, (_, i) => {
  const a = (2 * Math.PI * i) / 50;
  return [TRENTO[0] + 0.004 * Math.sin(a), TRENTO[1] + 0.006 * Math.cos(a)];
});

test("a route asked for: a picture by its outline and details as sent; a shape or a word nothing", () => {
  const start = TRENTO;
  const strokes: OutlinePoint[][] = [
    [
      [0, -0.8],
      [0, 0],
    ],
  ];
  const picture = requestLines({
    ...imageRequest,
    start: imageRequest.start as LatLon,
    outline: imageRequest.outline as OutlinePoint[],
    strokes,
    activity: "running",
  });
  expect(picture?.outline).toEqual(imageRequest.outline);
  expect(picture?.details).toBe(strokes);
  // Without strokes, no details.
  expect(
    requestLines({
      ...imageRequest,
      start: imageRequest.start as LatLon,
      outline: imageRequest.outline as OutlinePoint[],
      activity: "running",
    })?.details,
  ).toEqual([]);
  // An emoji is not changed.
  expect(
    requestLines({ start, shape: "star", distance_m: 5000, activity: "running" }),
  ).toBeNull();
  expect(
    requestLines({
      start,
      word: "CIAO",
      style: "round",
      distance_m: 12000,
      activity: "running",
    }),
  ).toBeNull();
});

test("the points of a route run give one closed outline, as a favorite keeps it, where they were run", () => {
  const { lines, centre, unitM } = trackInPlace(RING);
  const { outline, details } = lines;
  expect(details).toEqual([]);
  expect(outline[outline.length - 1]).toEqual(outline[0]);
  expect(outline.length).toBeLessThanOrEqual(101);
  for (const [x, y] of outline) {
    expect(Math.abs(x)).toBeLessThanOrEqual(1 + 1e-3);
    expect(Math.abs(y)).toBeLessThanOrEqual(1 + 1e-3);
  }
  // Its middle is the middle of the loop, one unit its half width in metres.
  expect(metresBetween(centre, TRENTO)).toBeLessThan(1);
  expect(unitM).toBeCloseTo(metresBetween(TRENTO, [TRENTO[0], TRENTO[1] + 0.006]), -1);
  // On the map, each point is back on the track.
  outline.forEach((point, i) => {
    const run = RING[i % RING.length];
    expect(
      metresBetween(
        onMap({ figure: { kind: "shape", shape: "heart" }, centre, unitM }, point),
        run,
      ),
    ).toBeLessThan(1);
  });
});

test("a long track keeps at most the corners an outline may have, its start first", () => {
  const long: LatLon[] = Array.from({ length: 400 }, (_, i) => {
    const a = (2 * Math.PI * i) / 400;
    return [TRENTO[0] + 0.01 * Math.sin(a), TRENTO[1] + 0.01 * Math.cos(a)];
  });
  const { lines, centre, unitM } = trackInPlace(long);
  expect(lines.outline.length).toBeLessThanOrEqual(101);
  const first = onMap(
    { figure: { kind: "shape", shape: "heart" }, centre, unitM },
    lines.outline[0],
  );
  expect(metresBetween(first, long[0])).toBeLessThan(1);
});

/** A line of 60 points going east from Trento, 1.2 km: it ends away from
 * its start, and a side back to it crosses its wiggles, so closed it makes
 * no outline. */
const LINE: LatLon[] = Array.from({ length: 60 }, (_, i) => [
  TRENTO[0] + 0.0005 * Math.sin(i / 6),
  TRENTO[1] + (0.015 * i) / 59,
]);

/** A track of straight sides through the points `xy`, in metres east and
 * north of Trento, 20 points a side. */
function trackOf(xy: [number, number][]): LatLon[] {
  const points: LatLon[] = [];
  for (let i = 1; i < xy.length; i += 1) {
    const [a, b] = [xy[i - 1], xy[i]];
    for (let k = 0; k < 20; k += 1) {
      const t = k / 20;
      points.push(
        fromPlane(TRENTO, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]),
      );
    }
  }
  points.push(fromPlane(TRENTO, xy[xy.length - 1]));
  return points;
}

/** The distance «Draw route» asks for the drawing of `track`, in metres. */
function askedFor(track: LatLon[]): number {
  const { lines, centre, unitM } = trackInPlace(track);
  const drawing = drawingOf(lines);
  if (drawing === null) {
    throw new Error("no drawing");
  }
  return distanceOf({ figure: drawing, centre, unitM });
}

test("a track that ends away from its start is closed by a side back to it, run once (TASK-425)", () => {
  // Steps, 4.5 km in all, ending 3.2 km from the start.
  const steps = trackOf([
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [2000, 1000],
    [2000, 2500],
  ]);
  const { lines, centre, unitM } = trackInPlace(steps);
  expect(lines.details).toEqual([]);
  expect(isOpenLine(lines.outline, lines.details)).toBe(false);
  const { outline } = lines;
  expect(outline[outline.length - 1]).toEqual(outline[0]);
  // Its route starts where the track did.
  const at = (point: OutlinePoint) =>
    onMap({ figure: { kind: "shape", shape: "heart" }, centre, unitM }, point);
  expect(metresBetween(at(outline[0]), steps[0])).toBeLessThan(1);
  // The track once and the way back: before, out and back, over 9 km.
  expect(askedFor(steps)).toBeCloseTo(4500 + Math.hypot(2000, 2500), -1);
});

test("a word's zigzag is run once with the way back, not twice (TASK-425)", () => {
  const zigzag = trackOf([
    [0, 0],
    [0, 800],
    [400, 100],
    [800, 800],
    [1200, 100],
  ]);
  expect(askedFor(zigzag)).toBeCloseTo(
    800 + 3 * Math.hypot(400, 700) + Math.hypot(1200, 100),
    -1,
  );
});

test("a closed track asks the distance it is, as before", () => {
  const square = trackOf([
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [0, 1000],
    [0, 0],
  ]);
  expect(askedFor(square)).toBeCloseTo(4000, -1);
});

/** The length of a track, in metres. */
function lengthOf(track: LatLon[]): number {
  return track.slice(1).reduce((total, p, i) => total + metresBetween(track[i], p), 0);
}

test("a track whose side back crosses it is a loop hung on a ring at its start (TASK-428)", () => {
  const { lines, centre, unitM } = trackInPlace(LINE);
  // The outline is the small ring on the first point, the loop a detail.
  expect(isOpenLine(lines.outline, lines.details)).toBe(true);
  expect(lines.details).toHaveLength(1);
  const at = (point: OutlinePoint) =>
    onMap({ figure: { kind: "shape", shape: "heart" }, centre, unitM }, point);
  expect(metresBetween(at(lines.outline[0]), LINE[0])).toBeLessThan(1);
  const detail = lines.details[0];
  // It starts where the track did and ends on that very point: run once.
  expect(metresBetween(at(detail[0]), LINE[0])).toBeLessThan(1);
  expect(detail[detail.length - 1]).toEqual(detail[0]);
  // It reaches the end of the track.
  const end = LINE[LINE.length - 1];
  expect(
    Math.min(...detail.map((point) => metresBetween(at(point), end))),
  ).toBeLessThan(1);
  // Every point of the detail lies on the track.
  for (const point of detail) {
    expect(Math.min(...LINE.map((p) => metresBetween(p, at(point))))).toBeLessThan(15);
  }
  // The track once and the straight way back, not out and back.
  const once = lengthOf(LINE) + metresBetween(end, LINE[0]);
  expect(askedFor(LINE) / once).toBeGreaterThan(0.97);
  expect(askedFor(LINE) / once).toBeLessThan(1.03);
});

test("a track that crosses itself is run once with the way back, not twice (TASK-428)", () => {
  // 5 km of sides, the fourth crossing the first; it ends 1.6 km away.
  const crossing = trackOf([
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [500, 1000],
    [500, -500],
    [1500, -500],
  ]);
  const { lines } = trackInPlace(crossing);
  expect(isOpenLine(lines.outline, lines.details)).toBe(true);
  const detail = lines.details[0];
  expect(detail[detail.length - 1]).toEqual(detail[0]);
  // Before, out and back: over 10 km.
  const once = 5000 + Math.hypot(1500, 500);
  expect(askedFor(crossing) / once).toBeGreaterThan(0.99);
  expect(askedFor(crossing) / once).toBeLessThan(1.01);
});

test("a closed track that crosses itself is a loop hung on a ring at its start, run once", () => {
  // A bowtie back to its start, 4.8 km: its two halves cross in the
  // middle, so it makes no outline. Before, «Edit the drawing» had no
  // drawing of it and the card of «Explore» showed no button.
  const sides = [
    [0, 0],
    [1000, 1000],
    [1000, 0],
    [0, 1000],
    [0, 0],
  ] as [number, number][];
  const bowtie = trackOf(sides);
  const { lines, centre, unitM } = trackInPlace(bowtie);
  expect(drawingOf(lines)).not.toBeNull();
  expect(routeTrack(bowtie)).toEqual({ lines, centre, unitM });
  expect(isOpenLine(lines.outline, lines.details)).toBe(true);
  expect(lines.details).toHaveLength(1);
  const detail = lines.details[0];
  // It starts where the track did and ends on that very point: run once.
  const at = (point: OutlinePoint) =>
    onMap({ figure: { kind: "shape", shape: "heart" }, centre, unitM }, point);
  expect(metresBetween(at(detail[0]), bowtie[0])).toBeLessThan(1);
  expect(detail[detail.length - 1]).toEqual(detail[0]);
  // The whole bowtie once, not out and back.
  const once = 2000 + 2 * Math.hypot(1000, 1000);
  expect(askedFor(bowtie) / once).toBeGreaterThan(0.99);
  expect(askedFor(bowtie) / once).toBeLessThan(1.01);
});

test("a track that ends near its start is still one closed outline", () => {
  expect(isOpenLine(trackInPlace(RING).lines.outline, [])).toBe(false);
  expect(trackInPlace(RING).lines.details).toEqual([]);
});

const RUN = { track: RING };

test.each([
  ["a picture or a drawing", { shape: null, word: null, route_title: "Drawing" }],
  ["a photo", { route_title: "Image", source: "muw" as const }],
  ["a shape of the catalogue, an emoji", { shape: "star", route_title: "Star" }],
  ["a shape the app does not know", { shape: "dragon" }],
  ["a word", { word: "ciao", style: "round" as const }],
  ["a run without a planned route", { route_title: null }],
  [
    "a run imported from another app",
    { route_title: "Morning run", source: "file" as const },
  ],
  ["a run on foot", { activity: "running" as const }],
  ["a ride", { activity: "cycling" as const }],
  ["a drawing paddled, on the water (part B)", { activity: "paddling" as const }],
])("a member's drawing gives its track where it was run: %s", (_what, fields) => {
  expect(drawingTrack({ ...RUN, ...fields })).toEqual(trackInPlace(RING));
});

test.each([
  ["a post of photos alone", { track: [] }],
  ["a track too short to follow", { track: [TRENTO] }],
])("a member's drawing puts nothing on the map: %s", (_what, fields) => {
  expect(drawingTrack({ ...RUN, ...fields })).toBeNull();
});

test("a route of «Explore» gives its line where it is; one too short nothing", () => {
  expect(routeTrack(RING)).toEqual(trackInPlace(RING));
  expect(routeTrack(LINE)).toEqual(trackInPlace(LINE));
  expect(routeTrack([TRENTO])).toBeNull();
  expect(routeTrack([])).toBeNull();
});
