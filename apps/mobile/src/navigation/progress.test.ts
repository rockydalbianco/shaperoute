import type { LatLon } from "@shaperoute/shared-types";

import { cumulative, locate, OFF_ROUTE_M } from "./progress";

// Where a fix is placed along a route that comes back on itself (TASK-253):
// a spur walked there and back, a street crossed twice. The runner is
// followed fix by fix, 6 m apart, with the GPS off by a few metres.

const LAT = 46.0;
const M_PER_DEG_LON = 77_214;
const M_PER_DEG_LAT = 111_195;

/** `x` metres east and `y` metres north of the origin. */
function at(x: number, y: number): LatLon {
  return [LAT + y / M_PER_DEG_LAT, 11.0 + x / M_PER_DEG_LON];
}

/** A GPS off by a few metres, the same every time. */
const NOISE_M = [3, -5, 8, -2, 6, -8, 1, -6, 4, -3, 7, -1, -7, 5, 2, -4];

/** The runner's true place `s` metres along `path`, offset `noise` metres
 * sideways, plus the true metres along. */
function along(path: LatLon[], s: number, noise: number): LatLon {
  const metres = cumulative(path);
  let i = 1;
  while (i < metres.length - 1 && metres[i] < s) {
    i += 1;
  }
  const t = (s - metres[i - 1]) / (metres[i] - metres[i - 1]);
  const [lat0, lon0] = path[i - 1];
  const [lat1, lon1] = path[i];
  const x0 = (lon0 - 11.0) * M_PER_DEG_LON;
  const y0 = (lat0 - LAT) * M_PER_DEG_LAT;
  const x1 = (lon1 - 11.0) * M_PER_DEG_LON;
  const y1 = (lat1 - LAT) * M_PER_DEG_LAT;
  const length = Math.hypot(x1 - x0, y1 - y0);
  // Sideways: to the left of the way.
  const nx = -(y1 - y0) / length;
  const ny = (x1 - x0) / length;
  return at(x0 + t * (x1 - x0) + noise * nx, y0 + t * (y1 - y0) + noise * ny);
}

/** Every placement of a runner going `fromS` to `toS` metres along `path`,
 * 6 m a fix, starting from where the navigator last had them. */
function follow(
  path: LatLon[],
  fromS: number,
  toS: number,
  noisy: boolean,
): { trueM: number; alongM: number; offM: number }[] {
  const metres = cumulative(path);
  const placed = [];
  let fromM = fromS;
  for (let s = fromS, i = 0; s <= toS; s += 6, i += 1) {
    const noise = noisy ? NOISE_M[i % NOISE_M.length] : 0;
    const located = locate(path, metres, along(path, s, noise), fromM);
    placed.push({ trueM: s, ...located });
    fromM = located.alongM;
  }
  return placed;
}

// East 200 m, a spur 80 m north and back, then east to 600 m.
const SPUR: LatLon[] = [at(0, 0), at(200, 0), at(200, 80), at(200, 0), at(600, 0)];
// A loop that crosses its own first street: the crossing at (60, 0) is 60 m
// along on the first pass and 300 m along on the second.
const CROSSING: LatLon[] = [
  at(0, 0),
  at(120, 0),
  at(120, 60),
  at(60, 60),
  at(60, -60),
  at(0, -60),
];

test.each([
  ["without GPS noise", false],
  ["with the GPS off by up to 8 m", true],
])(
  "on a spur the fix stays on the way out, then on the way back, %s",
  (_name, noisy) => {
    const placed = follow(SPUR, 100, 500, noisy);
    for (const { trueM, alongM, offM } of placed) {
      expect(Math.abs(alongM - trueM)).toBeLessThan(12);
      expect(offM).toBeLessThan(OFF_ROUTE_M);
    }
    // Never backwards by more than the noise.
    for (let i = 1; i < placed.length; i += 1) {
      expect(placed[i].alongM - placed[i - 1].alongM).toBeGreaterThan(-10);
    }
  },
);

test.each([
  ["without GPS noise", false],
  ["with the GPS off by up to 8 m", true],
])(
  "at a crossing the fix stays on the first pass until the second, %s",
  (_name, noisy) => {
    const placed = follow(CROSSING, 20, 350, noisy);
    for (const { trueM, alongM } of placed) {
      expect(Math.abs(alongM - trueM)).toBeLessThan(12);
    }
  },
);

test("a runner who skips ahead is found again within a few fixes", () => {
  const metres = cumulative(SPUR);
  // On the route at 100 m, then no fix until 390 m (a tunnel, a pause):
  // the end of the first street, 30 m away, still passes for the place.
  let fromM = 100;
  const found: number[] = [];
  for (let s = 390; s <= 420; s += 6) {
    const located = locate(SPUR, metres, along(SPUR, s, 2), fromM);
    fromM = located.alongM;
    found.push(Math.abs(located.alongM - s));
  }
  // Found within three fixes, and kept from then on.
  expect(found.findIndex((m) => m < 5)).toBeLessThanOrEqual(2);
  expect(found.slice(3).every((m) => m < 5)).toBe(true);
});

test("off the route, the nearest point is still the reference", () => {
  const metres = cumulative(SPUR);
  // 60 m south of the street at 300 m, from 290 m.
  const off = locate(SPUR, metres, at(300, -60), 290);
  expect(off.offM).toBeCloseTo(60, 0);
  expect(off.alongM).toBeCloseTo(300 + 160, -1);
});
