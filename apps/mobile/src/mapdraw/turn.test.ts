import { type LatLon, MAX_OUTLINE_POINTS, SHAPES } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { isImageRequest } from "../api/routes";
import { canvasRequest } from "./canvasRequest";
import { degreesLabel, typedDegrees } from "./DrawOnMap";
import { newDrawing } from "./drawing";
import { distanceOf, onMap, type Placed, placeAt, unitsOn } from "./figure";
import { dist } from "./geometry";
import { fromPlane, toPlane } from "./plane";
import {
  normalDeg,
  shapeOutline,
  shownFigure,
  turnedBy,
  turnedTo,
  turnOf,
} from "./turn";
import { useMapCanvas } from "./useMapCanvas";

jest.mock("../api/imageOutlines", () => ({ requestImageOutline: jest.fn() }));

const MIDDLE: LatLon = [46.07, 11.13];

/** An open line going east from the middle, 600 m long. */
function eastLine(): LatLon[] {
  return Array.from({ length: 13 }, (_, i) => fromPlane(MIDDLE, [i * 50, 0]));
}

function drawing(): Placed {
  const drawn = newDrawing(eastLine());
  if (drawn === null || "problem" in drawn) {
    throw new Error("no drawing");
  }
  return drawn.placed;
}

test("angles are whole degrees within (−180°, 180°]", () => {
  expect(normalDeg(0)).toBe(0);
  expect(normalDeg(-0)).toBe(0);
  expect(normalDeg(180)).toBe(180);
  expect(normalDeg(-180)).toBe(180);
  expect(normalDeg(195)).toBe(-165);
  expect(normalDeg(-375)).toBe(-15);
  expect(normalDeg(30.4)).toBe(30);
});

test("turned four times by 90° the figure is as it was, with no angle", () => {
  const placed = placeAt({ kind: "shape", shape: "heart" }, MIDDLE, 5000);
  let turned = placed;
  for (let i = 0; i < 4; i += 1) {
    turned = turnedBy(turned, 90);
  }
  expect(turned).toEqual(placed);
  expect("turnDeg" in turned).toBe(false);
  expect(turnOf(turnedTo(placed, 30))).toBe(30);
  // The same angle is the same figure.
  const at30 = turnedTo(placed, 30);
  expect(turnedTo(at30, 30)).toBe(at30);
});

test("a turn is clockwise on the map, and the units turn back from it", () => {
  const placed: Placed = {
    ...placeAt({ kind: "shape", shape: "circle" }, MIDDLE, 5000),
  };
  const north = onMap(placed, [0, 1]);
  const turned = turnedTo(placed, 90);
  // North of the middle goes east.
  const [x, y] = toPlane(MIDDLE, onMap(turned, [0, 1]));
  expect(x).toBeCloseTo(placed.unitM, 6);
  expect(y).toBeCloseTo(0, 6);
  expect(dist(unitsOn(turned, onMap(turned, [0.3, -0.7])), [0.3, -0.7])).toBeLessThan(
    1e-9,
  );
  expect(unitsOn(placed, north)[1]).toBeCloseTo(1, 9);
});

test("a shape of the catalogue turned is its outline, within the corners the contract takes", () => {
  for (const shape of SHAPES) {
    const outline = shapeOutline(shape);
    expect(outline.kind).toBe("picture");
    if (outline.kind !== "picture") {
      return;
    }
    expect(outline.outline.length).toBeLessThanOrEqual(MAX_OUTLINE_POINTS);
    // Still closed.
    expect(outline.outline[0]).toEqual(outline.outline[outline.outline.length - 1]);
  }
  const heart = placeAt({ kind: "shape", shape: "heart" }, MIDDLE, 5000);
  expect(shownFigure(heart)).toBe(heart.figure);
  expect(shownFigure(turnedTo(heart, 30))).toBe(shapeOutline("heart"));
  // Its length is about the shape's.
  const shown = { ...heart, figure: shapeOutline("heart") };
  expect(distanceOf(shown) / distanceOf(heart)).toBeCloseTo(1, 2);
});

test("a shape turned is asked by its outline, and by its name again at 0°", () => {
  const heart = placeAt({ kind: "shape", shape: "heart" }, MIDDLE, 5000);
  const turned = canvasRequest(turnedTo(heart, 45), false, "running");
  expect(isImageRequest(turned)).toBe(true);
  expect(turned.distance_m).toBeGreaterThan(4900);
  const back = canvasRequest(turnedTo(turnedTo(heart, 45), 0), false, "running");
  expect(back).toMatchObject({ shape: "heart", distance_m: 5000 });
});

test("a drawing turned is asked turned: an east line goes south at 90°", () => {
  const placed = drawing();
  const straight = canvasRequest(placed, false, "running");
  const turned = canvasRequest(turnedTo(placed, 90), false, "running");
  if (!isImageRequest(straight) || !isImageRequest(turned)) {
    throw new Error("not an outline");
  }
  const line = (request: typeof straight) => request.strokes?.[0] ?? request.outline;
  const [a, b] = [line(straight)[0], line(straight)[line(straight).length - 1]];
  const [c, d] = [line(turned)[0], line(turned)[line(turned).length - 1]];
  // East (x grows) before, south (y falls) after.
  expect(b[0] - a[0]).toBeGreaterThan(1);
  expect(d[1] - c[1]).toBeLessThan(-1);
  expect(Math.abs(d[0] - c[0])).toBeLessThan(0.01);
  expect(turned.distance_m).toBe(straight.distance_m);
  // The start turns with it, about the middle.
  expect(metres(turned.start, straight.start)).toBeGreaterThan(100);
});

function metres(a: LatLon, b: LatLon): number {
  return dist([0, 0], toPlane(a, b));
}

test("«−15°», «+15°», the degrees typed and two fingers turn the figure; «Undo» turns it back", async () => {
  const { result } = await renderHook(() =>
    useMapCanvas({
      apiUrl: "http://api.test",
      penUp: false,
      activity: "running",
      limitsM: [1000, 21_000],
      distanceM: 5000,
      start: MIDDLE,
    }),
  );
  await act(async () => result.current.pick("star"));
  expect(result.current.turnDeg).toBe(0);
  const steps = result.current.canUndo;
  expect(steps).toBe(true);

  await act(async () => result.current.turnBy(15));
  expect(result.current.turnDeg).toBe(15);
  expect(result.current.request).not.toHaveProperty("shape");
  await act(async () => result.current.turnTo(-170));
  expect(result.current.turnDeg).toBe(-170);
  await act(async () => result.current.turnBy(-15));
  expect(result.current.turnDeg).toBe(175);

  // Two fingers: sized and turned at once, a step of its own.
  await act(async () =>
    result.current.onCanvas({
      type: "figure",
      centre: MIDDLE,
      factor: 1.2,
      done: true,
      turn: 10,
    }),
  );
  expect(result.current.turnDeg).toBe(-175);
  expect(result.current.distanceM).toBeGreaterThan(5900);

  await act(async () => result.current.undo());
  expect(result.current.turnDeg).toBe(175);
  await act(async () => result.current.undo());
  await act(async () => result.current.undo());
  await act(async () => result.current.undo());
  expect(result.current.turnDeg).toBe(0);
  expect(result.current.request).toMatchObject({ shape: "star" });

  // A tile keeps the angle: the new figure where it is, as turned.
  await act(async () => result.current.turnTo(30));
  await act(async () => result.current.pick("heart"));
  expect(result.current.turnDeg).toBe(30);
});

test("the angle reads with a true minus, and the degrees typed are read loosely", () => {
  expect(degreesLabel(30)).toBe("30°");
  expect(degreesLabel(-15)).toBe("−15°");
  expect(degreesLabel(0)).toBe("0°");
  expect(typedDegrees("30")).toBe(30);
  expect(typedDegrees("−45")).toBe(-45);
  expect(typedDegrees("-30,6°")).toBe(-31);
  expect(typedDegrees("270")).toBe(-90);
  expect(typedDegrees("")).toBeNull();
  expect(typedDegrees("abc")).toBeNull();
});
