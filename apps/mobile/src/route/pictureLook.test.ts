import type { ImageOutline } from "@shaperoute/shared-types";
import edited from "@shaperoute/shared-types/fixtures/image-outline-edited.json";
import withPieces from "@shaperoute/shared-types/fixtures/image-outline-pieces.json";
import traced from "@shaperoute/shared-types/fixtures/image-outline.json";

import { lookOf, travelledLength } from "../mapdraw/figure";
import { lineLength } from "../mapdraw/geometry";
import { pictureLook } from "./pictureLook";
import { livePreview } from "./previewFrame";

const ONE = traced as ImageOutline;
// The empty pieces of the fixture are never[] to tsc: through unknown.
const DETAILS = edited as unknown as ImageOutline;
const PIECES = withPieces as unknown as ImageOutline;

test("with the pen down: the picture as «Draw on the map» sizes it", () => {
  const look = pictureLook(DETAILS, false);
  const strokes = DETAILS.strokes ?? [];
  expect(strokes.length).toBeGreaterThan(0);
  expect(look).toEqual(lookOf({ kind: "picture", outline: DETAILS.points, strokes }));
  // The outline once, each detail there and back.
  expect(look.length).toBeCloseTo(
    lineLength(DETAILS.points) +
      strokes.reduce((total, stroke) => total + travelledLength(stroke), 0),
  );
  expect(look.start).toEqual(DETAILS.points[0]);
});

test("one subject: its outline alone, whatever the pen", () => {
  expect(pictureLook(ONE, false).lines).toEqual([ONE.points]);
  // No pieces to lift the pen between: drawn as with the pen down.
  expect(pictureLook(ONE, true)).toEqual(pictureLook(ONE, false));
});

test("drawn apart: the outline and its pieces, sized by what is drawn", () => {
  const pieces = PIECES.pieces ?? [];
  expect(pieces.length).toBeGreaterThan(0);
  const look = pictureLook(PIECES, true);
  expect(look.lines).toEqual([PIECES.points, ...pieces]);
  expect(look.length).toBeCloseTo(
    lineLength(PIECES.points) +
      pieces.reduce((total, piece) => total + lineLength(piece), 0),
  );
  expect(look.start).toEqual(PIECES.points[0]);
  // With the pen down the same picture is its outline and its strokes.
  expect(pictureLook(PIECES, false).lines).toHaveLength(
    1 + (PIECES.strokes ?? []).length,
  );
});

test("a picture's look goes on the map as a shape's does", () => {
  const made = livePreview(
    pictureLook(DETAILS, false),
    [46.0679, 11.1211],
    6000,
    340,
    190,
  );
  expect(made).not.toBeNull();
  expect(made?.lines[0][0][0]).toBeCloseTo(46.0679, 9);
  expect(made?.lines[0][0][1]).toBeCloseTo(11.1211, 9);
  for (const [x, y] of made?.points.flat() ?? []) {
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(340);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(190);
  }
});
