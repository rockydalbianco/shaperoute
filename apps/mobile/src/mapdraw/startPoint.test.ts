import { MAX_OUTLINE_POINTS } from "@shaperoute/shared-types";

import { canvasRequest } from "./canvasRequest";
import { isOpenLine, newDrawing } from "./drawing";
import {
  distanceOf,
  type Figure,
  lookOf,
  onMap,
  type Placed,
  type Unit,
} from "./figure";
import { outlineFrom, startedAt, startLineOf } from "./startPoint";
import { shapeOutline } from "./turn";

/**
 * The start moved along the figure (TASK-426, ADR-0354): the outline starts
 * again at the point chosen, the figure stays where it is, and the request
 * starts there.
 */

const TRENTO: [number, number] = [46.0671, 11.1214];
const SQUARE: Unit[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];
const DRAWN: Figure = { kind: "drawing", outline: SQUARE, details: [] };

function placed(figure: Figure): Placed {
  return { figure, centre: TRENTO, unitM: 500 };
}

test("a corner within reach is the new start, the corners in their order", () => {
  expect(outlineFrom(SQUARE, [0.95, 1.05], 0.1)).toEqual([
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
    [1, 1],
  ]);
});

test("between two corners the start is a new corner on the side", () => {
  expect(outlineFrom(SQUARE, [1.2, 0.5], 0.1)).toEqual([
    [1, 0.5],
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
    [1, 0.5],
  ]);
  // On the closing side too, between the last corner and the first.
  expect(outlineFrom(SQUARE, [-1.1, 0], 0.1)).toEqual([
    [-1, 0],
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [-1, 0],
  ]);
});

test("the start left where it is changes nothing", () => {
  expect(outlineFrom(SQUARE, [-0.98, -1.01], 0.1)).toBeNull();
  expect(startedAt(DRAWN, [-1, -1], 0)).toBeNull();
});

test("an outline with no room for a corner more starts on the nearest", () => {
  const full: Unit[] = Array.from({ length: MAX_OUTLINE_POINTS }, (_, i) => {
    const a = (2 * Math.PI * i) / MAX_OUTLINE_POINTS;
    return [Math.cos(a), Math.sin(a)];
  });
  const ring = [...full, full[0]];
  const moved = outlineFrom(ring, [0, 1.1], 0);
  expect(moved).toHaveLength(ring.length);
  expect(moved?.[0]).toEqual(full[MAX_OUTLINE_POINTS / 4]);
});

test("a drawing moved keeps its details, its lines and its length", () => {
  const withDetail: Figure = {
    kind: "drawing",
    outline: SQUARE,
    details: [
      [
        [1, 0],
        [1.5, 0],
      ],
    ],
    linked: [false],
  };
  const moved = startedAt(withDetail, [0, 1.1], 0.1);
  expect(moved).toEqual({
    ...withDetail,
    outline: [
      [0, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
      [1, 1],
      [0, 1],
    ],
  });
  expect(lookOf(moved as Figure).length).toBeCloseTo(lookOf(withDetail).length, 9);
});

test("the request starts where the start was moved, the figure where it was", () => {
  const before = canvasRequest(placed(DRAWN), false, "running");
  const moved = startedAt(DRAWN, [1.1, 0], 0.1) as Figure;
  const after = canvasRequest(placed(moved), false, "running");
  expect(after.start).toEqual(onMap(placed(DRAWN), [1, 0]));
  expect(after.start).not.toEqual(before.start);
  expect(after.distance_m).toBe(before.distance_m);
  expect("outline" in after && after.outline[0]).toEqual([1, 0]);
  expect("outline" in after && after.outline.at(-1)).toEqual([1, 0]);
});

test("turned, the start goes where the finger is on the turned figure", () => {
  const turned = { ...placed(DRAWN), turnDeg: 90 };
  const moved = startedAt(DRAWN, [1.1, 0], 0.1) as Figure;
  const request = canvasRequest({ ...turned, figure: moved }, false, "running");
  expect(request.start).toEqual(onMap(turned, [1, 0]));
});

test("a photo's outline moves as a drawing's, its strokes and sample kept", () => {
  const picture: Figure = {
    kind: "picture",
    outline: SQUARE,
    strokes: [],
    sample: "cat",
  };
  expect(startedAt(picture, [1.1, 0], 0.1)).toEqual({
    ...picture,
    outline: [
      [1, 0],
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
      [1, 0],
    ],
  });
});

test("an emoji moved is its outline, asked as an image", () => {
  const heart: Figure = { kind: "shape", shape: "heart" };
  const line = startLineOf(heart, false);
  expect(line).toEqual({ line: lookOf(heart).lines[0], ends: false });
  const outline = (shapeOutline("heart") as { outline: Unit[] }).outline;
  const far = outline[Math.floor(outline.length / 2)];
  const moved = startedAt(heart, far, 0.01);
  expect(moved?.kind).toBe("picture");
  expect((moved as { outline: Unit[] }).outline[0]).toEqual(far);
  const request = canvasRequest(placed(moved as Figure), false, "running");
  expect("outline" in request).toBe(true);
  expect(request.start).toEqual(onMap(placed(heart), far));
});

test("an emoji asked with the pen up keeps its start", () => {
  const smiley: Figure = { kind: "shape", shape: "smiley" };
  expect(startLineOf(smiley, true)).toBeNull();
  expect(startedAt(smiley, [0, 0.5], 0.1, true)).toBeNull();
});

test("every emoji of the catalogue drawn with the pen down is a closed outline", () => {
  for (const shape of ["circle", "star", "horse", "smiley", "sun"] as const) {
    const outline = (shapeOutline(shape) as { outline: Unit[] }).outline;
    expect(outline[0]).toEqual(outline[outline.length - 1]);
    expect(startLineOf({ kind: "shape", shape }, false)).not.toBeNull();
  }
});

/** An open line drawn on the map, in the drawing's units. */
function openLine(): Extract<Figure, { kind: "drawing" }> {
  const drawn = newDrawing([
    [46.06, 11.12],
    [46.065, 11.125],
    [46.07, 11.12],
    [46.075, 11.13],
  ]);
  if (drawn === null || "problem" in drawn) {
    throw new Error("no drawing");
  }
  const figure = drawn.placed.figure;
  if (figure.kind !== "drawing") {
    throw new Error("not a drawing");
  }
  return figure;
}

test("an open line starts at one of its two ends", () => {
  const open = openLine();
  expect(isOpenLine(open.outline, open.details)).toBe(true);
  const line = open.details[0];
  expect(startLineOf(open, false)).toEqual({
    line: [line[0], line[line.length - 1]],
    ends: true,
  });
  // Nearer its start, it stays.
  expect(startedAt(open, line[0], 0.1)).toBeNull();
  expect(startedAt(open, line[1], 0.1)).toBeNull();
});

test("an open line started at its end goes the other way, on a ring there", () => {
  const open = openLine();
  const line = open.details[0];
  const end = line[line.length - 1];
  const moved = startedAt(open, end, 0.1);
  if (moved === null || moved.kind !== "drawing") {
    throw new Error("not moved");
  }
  expect(moved.details[0]).toEqual([...line].reverse());
  expect(moved.outline[0]).toBe(moved.details[0][0]);
  expect(moved.outline[0]).toEqual(end);
  expect(moved.outline[moved.outline.length - 1]).toBe(moved.outline[0]);
  expect(isOpenLine(moved.outline, moved.details)).toBe(true);
  expect(lookOf(moved).start).toEqual(end);
  // The same line; the small ring at its start alone may differ, by less
  // than a metre.
  expect(Math.abs(distanceOf(placed(moved)) - distanceOf(placed(open)))).toBeLessThan(
    1,
  );
  // And back again.
  const back = startedAt(moved, line[0], 0.1);
  expect(back !== null && back.kind === "drawing" && back.details[0]).toEqual(line);
});

test("an open line ending on a loop keeps its start", () => {
  const open = openLine();
  const line = open.details[0];
  const looped: Figure = {
    ...open,
    details: [[...line, line[1]]],
  };
  expect(startLineOf(looped, false)).toBeNull();
  expect(startedAt(looped, line[line.length - 1], 0.1)).toBeNull();
});

test("an open line with a detail hung off the ring keeps its start", () => {
  const open = openLine();
  const offRing: Figure = {
    ...open,
    details: [
      ...open.details,
      [open.outline[1], [open.outline[1][0] - 0.3, open.outline[1][1] - 0.3]],
    ],
  };
  expect(startLineOf(offRing, false)).toBeNull();
  // Hung on the line, it may go round.
  const onLine: Figure = {
    ...open,
    details: [...open.details, [open.details[0][2], [0, -0.9]]],
  };
  expect(startLineOf(onLine, false)).not.toBeNull();
});
