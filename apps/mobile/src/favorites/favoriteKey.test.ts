import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import type { LatLon } from "@shaperoute/shared-types";

import { favoriteKey } from "./favoriteKey";

const LINE = detail.points as LatLon[];

test("the key is 16 hex digits, as the API wants it", () => {
  const key = favoriteKey(LINE);
  expect(key).toMatch(/^[0-9a-f]{16}$/);
  // favorites.py: KEY_PATTERN.
  expect(key).toMatch(/^[a-z0-9]{8,40}$/);
});

test("the same line has the same key, on any phone", () => {
  expect(favoriteKey(LINE)).toBe(favoriteKey(LINE.map(([lat, lon]) => [lat, lon])));
  // Written down: a key that changes with the code loses every heart.
  expect(
    favoriteKey([
      [46.067, 11.1215],
      [46.07, 11.123],
    ]),
  ).toBe("680c391da0dfaa4f");
});

test("less than a metre apart is the same route", () => {
  const moved = LINE.map(([lat, lon]): LatLon => [lat + 2e-6, lon - 2e-6]);
  expect(favoriteKey(moved)).toBe(favoriteKey(LINE));
});

test("another line has another key", () => {
  const keys = new Set([
    favoriteKey(LINE),
    favoriteKey(LINE.slice(1)),
    favoriteKey([...LINE].reverse()),
    favoriteKey(LINE.map(([lat, lon]): LatLon => [lat + 1e-4, lon])),
    favoriteKey(LINE.map(([lat, lon]): LatLon => [lon, lat])),
    favoriteKey([]),
  ]);
  expect(keys.size).toBe(6);
});

test("south and west of zero count too", () => {
  const sydney: LatLon[] = [
    [-33.8688, 151.2093],
    [-33.87, 151.21],
  ];
  const mirrored = sydney.map(([lat, lon]): LatLon => [-lat, -lon]);
  expect(favoriteKey(sydney)).not.toBe(favoriteKey(mirrored));
});
