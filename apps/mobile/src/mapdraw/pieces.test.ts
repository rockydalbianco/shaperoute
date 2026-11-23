import {
  type LatLon,
  MAX_DETAIL_POINTS,
  MAX_OUTLINE_POINTS,
} from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import { travelledPoints } from "./drawing";
import { onMap, type Placed, placeAt, placedLines } from "./figure";
import {
  addedPiece,
  fitsRoute,
  heldPieces,
  joinedPieces,
  MAX_PIECES,
  pieceAt,
  pieceBox,
  pieceDistance,
  piecesTurnedBy,
} from "./pieces";
import { fromPlane, toPlane } from "./plane";
import { turnOf } from "./turn";

const MIDDLE: LatLon = [46.07, 11.13];

function heart(centre: LatLon = MIDDLE): Placed {
  return placeAt({ kind: "shape", shape: "heart" }, centre, 6000);
}

/** A star a third of the heart's size, `east` metres east of the middle. */
function starEast(east: number): Placed {
  const pieces = [heart()];
  return addedPiece(
    pieces,
    { kind: "shape", shape: "star" },
    fromPlane(MIDDLE, [east, 0]),
  );
}

function drawingOf(joined: ReturnType<typeof joinedPieces>) {
  const figure = joined.placed.figure;
  if (figure.kind !== "drawing") throw new Error("not a drawing");
  return figure;
}

test("two pieces make one drawing: the first's outline, the second a detail joined by a dashed link", () => {
  const pieces = [heart(), starEast(3000)];
  const joined = joinedPieces(pieces);
  const figure = drawingOf(joined);
  expect(figure.details).toHaveLength(1);
  expect(figure.linked).toEqual([true]);
  expect(joined.owners).toEqual([0, 1]);
  // The star goes round once, from where the link reaches it.
  const star = figure.details[0];
  expect(star[1]).toEqual(star[star.length - 1]);
  expect(fitsRoute(joined)).toBe(true);
  // Where it is on the map: the heart's outline where the heart is.
  const lines = placedLines(joined.placed);
  const heartLines = placedLines(heart());
  expect(metresBetween(lines[0][0], heartLines[0][0])).toBeLessThan(1);
});

test("a piece touching the drawing hangs on it without a link", () => {
  const joined = joinedPieces([heart(), starEast(300)]);
  expect(drawingOf(joined).linked).toEqual([false]);
});

test("a piece added is a third of the figure's size, in the middle given", () => {
  const star = starEast(3000);
  expect(star.centre).toEqual(fromPlane(MIDDLE, [3000, 0]));
  const heartBox = pieceBox(heart(), 0).map((p) => toPlane(MIDDLE, p));
  const starBox = pieceBox(star, 1).map((p) => toPlane(MIDDLE, p));
  const width = (box: [number, number][]) =>
    Math.max(
      Math.max(...box.map(([x]) => x)) - Math.min(...box.map(([x]) => x)),
      Math.max(...box.map(([, y]) => y)) - Math.min(...box.map(([, y]) => y)),
    );
  expect(width(starBox) / width(heartBox)).toBeCloseTo(1 / 3, 2);
});

test("moving a piece leaves the other where it is", () => {
  const before = joinedPieces([heart(), starEast(3000)]);
  const moved = { ...starEast(3000), centre: fromPlane(MIDDLE, [0, -4000]) };
  const after = joinedPieces([heart(), moved]);
  const heartBefore = placedLines(before.placed)[0];
  const heartAfter = placedLines(after.placed)[0];
  heartBefore.forEach((point, i) =>
    expect(metresBetween(point, heartAfter[i])).toBeLessThan(1),
  );
  // The star went 4 km south and 3 km west.
  const starAt = (joined: ReturnType<typeof joinedPieces>) => {
    // The middle of its corners, past the link.
    const corners = placedLines(joined.placed)[1]
      .slice(1)
      .map((p) => toPlane(MIDDLE, p));
    return [0, 1].map(
      (axis) => corners.reduce((total, p) => total + p[axis], 0) / corners.length,
    );
  };
  const [x0, y0] = starAt(before);
  const [x1, y1] = starAt(after);
  expect(Math.hypot(x1 - x0 + 3000, y1 - y0 + 4000)).toBeLessThan(50);
});

test("all pieces held together move, grow and turn as one", () => {
  const pieces = [heart(), starEast(3000)];
  const to = fromPlane(MIDDLE, [500, 500]);
  const held = heldPieces(pieces, to, 2, 90);
  expect(held[0].centre).toEqual(to);
  expect(held[0].unitM).toBeCloseTo(2 * pieces[0].unitM);
  expect(turnOf(held[1])).toBe(90);
  // The star, 3 km east, is now 6 km south (clockwise).
  const [x, y] = toPlane(to, held[1].centre);
  expect(x).toBeCloseTo(0, 0);
  expect(y).toBeCloseTo(-6000, 0);
  // Turned about their middle, the pieces keep their distance apart.
  const turned = piecesTurnedBy(pieces, 45);
  expect(metresBetween(turned[0].centre, turned[1].centre)).toBeCloseTo(
    metresBetween(pieces[0].centre, pieces[1].centre),
    0,
  );
  expect(turned.map(turnOf)).toEqual([45, 45]);
});

test("a tap chooses the piece under it, the smaller one inside both, none outside", () => {
  const pieces = [heart(), starEast(0)];
  const reach = 50;
  // On the star's lines, in the middle of the heart.
  const starTip = onMap(pieces[1], [0, 1]);
  expect(pieceAt(pieces, starTip, reach)).toBe(1);
  // On the heart's outline.
  expect(pieceAt(pieces, onMap(pieces[0], [1, 0.3]), reach)).not.toBeNull();
  expect(pieceAt(pieces, fromPlane(MIDDLE, [20_000, 0]), reach)).toBeNull();
});

test("pieces added are straightened, and too many points are refused", () => {
  // Six hearts fit in one route…
  const six = Array.from({ length: MAX_PIECES }, (_, i) =>
    i === 0
      ? heart()
      : {
          ...starEast(0),
          figure: heart().figure,
          centre: fromPlane(MIDDLE, [i * 4000, 0]),
        },
  );
  const joined = joinedPieces(six);
  const figure = drawingOf(joined);
  expect(figure.outline.length).toBeLessThanOrEqual(MAX_OUTLINE_POINTS + 1);
  expect(travelledPoints(figure.details)).toBeLessThanOrEqual(MAX_DETAIL_POINTS);
  expect(fitsRoute(joined)).toBe(true);
  // …six horses do not.
  const horses = six.map((piece) => ({
    ...piece,
    figure: { kind: "shape" as const, shape: "horse" as const },
  }));
  expect(fitsRoute(joinedPieces(horses))).toBe(false);
});

test("a piece's distance is its lines' length at its size", () => {
  const star = starEast(3000);
  expect(pieceDistance(star, 1)).toBeGreaterThan(0);
  const bigger = { ...star, unitM: 2 * star.unitM };
  expect(pieceDistance(bigger, 1)).toBeCloseTo(2 * pieceDistance(star, 1));
});
