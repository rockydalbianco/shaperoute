import type { LatLon, OutlinePoint } from "@shaperoute/shared-types";
import imageRequest from "@shaperoute/shared-types/fixtures/image-route-request.json";

import { metresBetween } from "../map/coordinates";
import { onMap } from "../mapdraw/figure";
import { drawingTrack, requestLines, trackInPlace } from "./figureLines";

/**
 * The lines «Edit the drawing» puts on the map (TASK-320, TASK-331): of a
 * route asked for, of a route run; in the engine's frame, [-1, 1] with y
 * up. A shape of the catalogue — an emoji — has none (ADR-0288). The
 * track of a member's drawing goes where it was run, as big (TASK-346).
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

test("a member's drawing: a picture or a drawing by the track run, where it was run", () => {
  const run = { shape: null, word: null, route_title: null, track: RING };
  // A drawing, a picture or a photo: its planned route says only a title.
  expect(drawingTrack({ ...run, route_title: "Drawing" })).toEqual(trackInPlace(RING));
  expect(drawingTrack({ ...run, route_title: "Image", source: "muw" })).toEqual(
    trackInPlace(RING),
  );
});

test.each([
  ["a shape of the catalogue", { shape: "star", route_title: "Star" }],
  ["a shape the app does not know", { shape: "dragon" }],
  ["a word", { word: "ciao", style: "round" as const }],
  ["a run without a planned route", {}],
  [
    "a run imported from another app",
    { route_title: "Morning run", source: "file" as const },
  ],
  ["a post of photos alone", { route_title: "Image", track: [] }],
  ["a track too short to follow", { route_title: "Image", track: [TRENTO] }],
])("a member's drawing puts nothing on the map: %s", (_what, fields) => {
  const run = { shape: null, word: null, route_title: null, track: RING };
  expect(drawingTrack({ ...run, ...fields })).toBeNull();
});
