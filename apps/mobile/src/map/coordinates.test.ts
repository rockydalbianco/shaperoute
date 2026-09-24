import type { LatLon } from "@shaperoute/shared-types";

import { fromLngLat, metresBetween, toLngLat } from "./coordinates";

// The Trento start (docs/TESTING.md): latitude and longitude differ enough
// that a swap cannot pass unnoticed.
const TRENTO: LatLon = [46.0671, 11.1214];

test("toLngLat puts longitude first", () => {
  expect(toLngLat(TRENTO)).toEqual([11.1214, 46.0671]);
});

test("fromLngLat puts latitude first", () => {
  expect(fromLngLat([11.1214, 46.0671])).toEqual(TRENTO);
});

test("the two conversions undo each other", () => {
  expect(fromLngLat(toLngLat(TRENTO))).toEqual(TRENTO);
});

test("metresBetween measures along the Earth, like the route engine", () => {
  expect(metresBetween(TRENTO, TRENTO)).toBe(0);
  // One degree of latitude on a sphere of 6371 km.
  expect(metresBetween([46, 11], [47, 11])).toBeCloseTo(111_195, 0);
  // Trento to Levico, about 15 km as the crow flies (docs/TESTING.md).
  expect(metresBetween(TRENTO, [46.0122, 11.2986]) / 1000).toBeCloseTo(15, 0);
});
