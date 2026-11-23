import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { metresBetween } from "../map/coordinates";
import { lookOf, onMap, placedStart, type Unit } from "./figure";
import { fromPlane } from "./plane";
import { type MapCanvasOptions, useMapCanvas } from "./useMapCanvas";

/**
 * The start dot of «Draw on the map» (TASK-426, ADR-0354): where the route
 * starts, dragged with «Move» along the figure's line, a step «Undo» takes
 * back; none on the water.
 */

jest.mock("../api/imageOutlines", () => ({ requestImageOutline: jest.fn() }));

const TRENTO: LatLon = [46.0671, 11.1214];
const MIDDLE: LatLon = [46.07, 11.13];
const LIMITS: [number, number] = [1000, 21_000];
/** Metres a pixel of the map is, as the page tells it. */
const PX_M = 2;

function setUp(options: Partial<MapCanvasOptions> = {}) {
  return renderHook(() =>
    useMapCanvas({
      apiUrl: "http://api.test",
      penUp: true,
      activity: "running",
      limitsM: LIMITS,
      distanceM: 5000,
      start: TRENTO,
      ...options,
    }),
  );
}

type Hook = Awaited<ReturnType<typeof setUp>>["result"];

/** A square about `side` metres wide around MIDDLE, drawn with a finger and
 * closed where it started: its corners first south-west, then on round. */
function squareLine(side: number): LatLon[] {
  const h = side / 2;
  const corners: [number, number][] = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
    [-h, -h],
  ];
  const line: LatLon[] = [];
  for (let i = 1; i < corners.length; i += 1) {
    const [a, b] = [corners[i - 1], corners[i]];
    for (let k = 0; k < 10; k += 1) {
      line.push(
        fromPlane(MIDDLE, [
          a[0] + ((b[0] - a[0]) * k) / 10,
          a[1] + ((b[1] - a[1]) * k) / 10,
        ]),
      );
    }
  }
  line.push(fromPlane(MIDDLE, corners[0]));
  return line;
}

async function drawSquare(result: Hook) {
  await act(async () =>
    result.current.onCanvas({
      type: "drawn",
      line: squareLine(2000),
      metresPerPx: PX_M,
    }),
  );
}

async function leaveStart(result: Hook, point: LatLon) {
  await act(async () =>
    result.current.onCanvas({ type: "started", point, metresPerPx: PX_M }),
  );
}

test("the dot is on the start of the figure, and moves along its outline", async () => {
  const { result } = await setUp();
  await act(async () => result.current.onCanvas({ type: "centre", point: MIDDLE }));
  await act(async () => result.current.pick("heart"));
  const placed = result.current.placed;
  if (placed === null) {
    throw new Error("no figure");
  }
  const { canvas } = result.current;
  expect(canvas.start).toEqual(placedStart(placed));
  expect(canvas.start).toEqual(result.current.request?.start);
  expect(canvas.startLine).toEqual(canvas.lines[0]);
  expect(canvas.startEnds).toBe(false);
});

test("a drawing's start left on a side: the request starts there, «Undo» puts it back", async () => {
  const { result } = await setUp();
  await drawSquare(result);
  const before = result.current.request;
  const placed = result.current.placed;
  if (placed === null || before === null) {
    throw new Error("no drawing");
  }
  const lines = result.current.canvas.lines;
  // The middle of the east side, a little off it, as a finger leaves it.
  const east = fromPlane(MIDDLE, [1010, 0]);
  await leaveStart(result, east);
  const after = result.current.request;
  expect(
    metresBetween(after?.start as LatLon, fromPlane(MIDDLE, [1000, 0])),
  ).toBeLessThan(25);
  expect(result.current.canvas.start).toEqual(after?.start);
  // The figure stays where it was, as long.
  expect(result.current.placed?.centre).toEqual(placed.centre);
  expect(result.current.placed?.unitM).toBe(placed.unitM);
  expect(after?.distance_m).toBe(before.distance_m);
  expect(result.current.canvas.lines[0]).toHaveLength(lines[0].length + 1);
  expect(result.current.canUndo).toBe(true);

  await act(async () => result.current.undo());
  expect(result.current.request?.start).toEqual(before.start);
  expect(result.current.canvas.start).toEqual(before.start);
});

test("a start left near a corner goes on the corner", async () => {
  const { result } = await setUp();
  await drawSquare(result);
  const placed = result.current.placed;
  if (placed === null || placed.figure.kind !== "drawing") {
    throw new Error("no drawing");
  }
  const corners = placed.figure.outline;
  // 10 m from a corner: within half a finger's reach (24 m).
  const corner = onMap(placed, corners[2]);
  await leaveStart(result, fromPlane(corner, [6, 8]));
  expect(result.current.request?.start).toEqual(corner);
  const moved = result.current.placed?.figure;
  expect(moved?.kind === "drawing" && moved.outline).toHaveLength(corners.length);
});

test("the start left where it is changes nothing, and the page has the dot back", async () => {
  const { result } = await setUp();
  await drawSquare(result);
  const canvas = result.current.canvas;
  const request = result.current.request;
  await leaveStart(result, canvas.start as LatLon);
  expect(result.current.request).toBe(request);
  expect(result.current.canUndo).toBe(true);
  // A new canvas, so the page draws the dot where it is again.
  expect(result.current.canvas).not.toBe(canvas);
  expect(result.current.canvas.start).toEqual(canvas.start);
});

test("an emoji whose start is moved is asked by its outline, from there", async () => {
  const { result } = await setUp();
  await act(async () => result.current.onCanvas({ type: "centre", point: MIDDLE }));
  await act(async () => result.current.pick("heart"));
  expect(result.current.request).toMatchObject({ shape: "heart" });
  const placed = result.current.placed;
  if (placed === null) {
    throw new Error("no figure");
  }
  const line = lookOf(placed.figure).lines[0];
  const far = onMap(placed, line[Math.floor(line.length / 2)] as Unit);
  await leaveStart(result, far);
  const request = result.current.request;
  expect(request !== null && "outline" in request).toBe(true);
  expect(metresBetween(request?.start as LatLon, far)).toBeLessThan(60);
  expect(result.current.placed?.figure.kind).toBe("picture");
  await act(async () => result.current.undo());
  expect(result.current.request).toMatchObject({ shape: "heart" });
});

test("an emoji asked with the pen up shows its start, which stays", async () => {
  const { result } = await setUp({ penUp: true });
  await act(async () => result.current.pick("smiley"));
  const { canvas } = result.current;
  expect(canvas.start).toEqual(result.current.request?.start);
  expect(canvas.startLine).toEqual([]);
  const request = result.current.request;
  await leaveStart(result, canvas.lines[0][10]);
  expect(result.current.request).toBe(request);
});

test("on the water there is no dot", async () => {
  const { result } = await setUp({ activity: "paddling" });
  await drawSquare(result);
  expect(result.current.canvas.start).toBeNull();
  expect(result.current.canvas.startLine).toEqual([]);
  const request = result.current.request;
  await leaveStart(result, fromPlane(MIDDLE, [1000, 0]));
  expect(result.current.request).toBe(request);
});

test("with pieces the start moves on the first piece, a step «Undo» takes back", async () => {
  const { result } = await setUp();
  await drawSquare(result);
  await act(async () => result.current.pieces.setAdding(true));
  await act(async () =>
    result.current.onCanvas({ type: "centre", point: fromPlane(MIDDLE, [4000, 0]) }),
  );
  await act(async () => result.current.pick("star"));
  expect(result.current.pieces.count).toBe(2);
  // The star chosen: the dot stays.
  expect(result.current.canvas.startLine).toEqual([]);
  await act(async () => result.current.setMode("move"));
  const canvas = result.current.canvas;
  expect(canvas.startLine).toHaveLength(5);
  expect(canvas.start).toEqual(canvas.startLine?.[0]);
  const before = result.current.request?.start;
  await leaveStart(result, fromPlane(MIDDLE, [0, 1005]));
  expect(result.current.pieces.count).toBe(2);
  const after = result.current.request?.start as LatLon;
  expect(metresBetween(after, fromPlane(MIDDLE, [0, 1000]))).toBeLessThan(25);
  expect(result.current.canvas.start).toEqual(after);
  await act(async () => result.current.undo());
  expect(result.current.request?.start).toEqual(before);
  expect(result.current.pieces.count).toBe(2);
});
