import type {
  ImageRouteRequest,
  LatLon,
  RouteRequest,
  RouteResult,
} from "@shaperoute/shared-types";

import { metresBetween } from "../map/coordinates";
import {
  leftElsewhere,
  movable,
  movedCentre,
  movedRequest,
  NOT_THERE_M,
} from "./shapeMove";

const RICCIONE: LatLon = [44.0007, 12.6513];
const CENTRE: LatLon = [44.0041, 12.655];

const PADDLING: RouteRequest = {
  start: RICCIONE,
  shape: "heart",
  distance_m: 2000,
  activity: "paddling",
};

function result(centre?: LatLon | null): RouteResult {
  return {
    points: [RICCIONE, CENTRE, RICCIONE],
    distance_m: 1984,
    similarity: 1,
    shape: "heart",
    warnings: [],
    directions: [],
    ...(centre === undefined ? {} : { centre }),
  };
}

test("a route on the water that says where its shape is can be moved", () => {
  expect(movable(PADDLING, result(CENTRE))).toBe(true);
});

test("an API of before says no centre: its shapes are not moved", () => {
  expect(movable(PADDLING, result())).toBe(false);
  expect(movable(PADDLING, result(null))).toBe(false);
  expect(movedRequest(PADDLING, result(), [0.001, 0])).toBeNull();
});

test("a shape on the roads is not moved, nor an image", () => {
  const running: RouteRequest = { ...PADDLING, distance_m: 5000, activity: "running" };
  expect(movable(running, result(CENTRE))).toBe(false);
  const image: ImageRouteRequest = {
    start: RICCIONE,
    outline: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
    distance_m: 5000,
    activity: "running",
  };
  expect(movable(image, result(CENTRE))).toBe(false);
  expect(movedRequest(image, result(CENTRE), [0.001, 0])).toBeNull();
});

test("the drag is degrees of longitude and latitude; the centre is (lat, lon)", () => {
  const [lat, lon] = movedCentre(CENTRE, [0.002, -0.001]);
  expect(lat).toBeCloseTo(44.0031, 9);
  expect(lon).toBeCloseTo(12.657, 9);
});

test("the moved request is the same one, with the shape wanted where it was left", () => {
  const moved = movedRequest(PADDLING, result(CENTRE), [0.002, -0.001]);
  expect(moved).toEqual({ ...PADDLING, near: movedCentre(CENTRE, [0.002, -0.001]) });
  // The same start: the shape stays within reach of where the user asked from.
  expect(moved?.start).toBe(PADDLING.start);
});

test("moved again, the shape starts from where the engine placed it", () => {
  const first = movedRequest(PADDLING, result(CENTRE), [0.002, 0]);
  expect(first).not.toBeNull();
  const placed: LatLon = [44.0043, 12.6566];
  const again = first && movedRequest(first, result(placed), [0.001, 0]);
  expect(again?.near?.[0]).toBeCloseTo(44.0043, 9);
  expect(again?.near?.[1]).toBeCloseTo(12.6576, 9);
});

test("placed near where it was left, the shape is there; far, it is elsewhere", () => {
  const near: LatLon = [CENTRE[0] + 0.0003, CENTRE[1]];
  expect(metresBetween(near, CENTRE)).toBeLessThan(NOT_THERE_M);
  expect(leftElsewhere({ ...PADDLING, near }, result(CENTRE))).toBe(false);

  const far: LatLon = [CENTRE[0] + 0.003, CENTRE[1]];
  expect(metresBetween(far, CENTRE)).toBeGreaterThan(NOT_THERE_M);
  expect(leftElsewhere({ ...PADDLING, near: far }, result(CENTRE))).toBe(true);
});

test("a route that was not moved is never elsewhere", () => {
  expect(leftElsewhere(PADDLING, result(CENTRE))).toBe(false);
  expect(leftElsewhere({ ...PADDLING, near: null }, result(CENTRE))).toBe(false);
  expect(leftElsewhere({ ...PADDLING, near: CENTRE }, result())).toBe(false);
});
