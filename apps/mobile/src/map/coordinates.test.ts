import type { LatLon } from "@shaperoute/shared-types";

import { fromLngLat, toLngLat } from "./coordinates";

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
