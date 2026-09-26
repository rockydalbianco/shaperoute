import type { Direction, LatLon } from "@shaperoute/shared-types";

import {
  ANNOUNCE_M,
  BACK_FIXES,
  chainFrom,
  type Cue,
  type Navigation,
  OFF_SECONDS,
  onFix,
  type Reading,
  remainingM,
  startNavigation,
  upcoming,
} from "./navigator";
import { cumulative, locate, OFF_ROUTE_M } from "./progress";

// A route due east along a parallel, then back west on the same street:
// 1 km out, 1 km back. 0.001° of longitude here is about 77 m.
const LAT = 46.0;
const M_PER_DEG_LON = 77_214;
function east(m: number): LatLon {
  return [LAT, 11.0 + m / M_PER_DEG_LON];
}
function north(m: number, from: LatLon): LatLon {
  return [from[0] + m / 111_195, from[1]];
}
const OUT: LatLon[] = [0, 250, 500, 750, 1000].map(east);
const POINTS: LatLon[] = [...OUT, ...OUT.slice(0, -1).reverse()];

function direction(
  turn: Direction["turn"],
  distance_m: number,
  street: string | null,
  joined = false,
): Direction {
  return {
    node: distance_m,
    point: east(distance_m <= 1000 ? distance_m : 2000 - distance_m),
    distance_m,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined,
  };
}

const DIRECTIONS: Direction[] = [
  direction("depart", 0, "Via Roma"),
  direction("left", 400, "Via Verdi"),
  direction("right", 408, "Via Bianchi", true),
  direction("u-turn", 1000, "Via Roma"),
];

test("the route is measured in metres along it", () => {
  const along = cumulative(OUT);
  expect(along[along.length - 1]).toBeCloseTo(1000, -1);
});

test("a fix is placed near where the runner was, not on the way back", () => {
  const along = cumulative(POINTS);
  // At 300 m out, the street is also the way back at 1700 m.
  const out = locate(POINTS, along, east(300), 280);
  expect(out.alongM).toBeCloseTo(300, -1);
  expect(out.offM).toBeLessThan(1);
  const back = locate(POINTS, along, east(300), 1650);
  expect(back.alongM).toBeCloseTo(1700, -1);
});

test("the start says where to head out, without vibrating", () => {
  const { cues } = startNavigation(POINTS, DIRECTIONS);
  expect(cues).toEqual([{ say: "Head out on Via Roma", vibrate: false }]);
});

test("a turn is said once, within ANNOUNCE_M, with the ones joined to it", () => {
  let { navigation } = startNavigation(POINTS, DIRECTIONS);
  const far = onFix(navigation, east(300));
  expect(far.cues).toEqual([]);
  navigation = far.navigation;
  const near = onFix(navigation, east(400 - ANNOUNCE_M + 10));
  expect(near.cues).toEqual([
    {
      say: "In 40 metres, turn left onto Via Verdi, then turn right onto Via Bianchi",
      vibrate: true,
    },
  ]);
  const again = onFix(near.navigation, east(380));
  expect(again.cues).toEqual([]);
  // Past both, the next one is the U-turn, not the joined right.
  const past = onFix(again.navigation, east(430));
  expect(upcoming(past.navigation)?.direction.turn).toBe("u-turn");
});

const OFF_CUE: Cue = { say: "You are off the route. Head back to it.", vibrate: true };
const BACK_CUE: Cue = { say: "Back on the route.", vibrate: false };
/** A fix every 2 s, as the phone gives them at a running pace (6 m apart). */
const FIX_S = 2;

/** Runs fix after fix from `navigation`; returns every cue and when it came. */
function run(
  navigation: Navigation,
  fixes: { at: LatLon; reading?: Reading }[],
): { navigation: Navigation; cues: { index: number; cue: Cue }[] } {
  const cues: { index: number; cue: Cue }[] = [];
  fixes.forEach(({ at, reading }, index) => {
    const result = onFix(navigation, at, reading ?? { timeMs: index * FIX_S * 1000 });
    navigation = result.navigation;
    cues.push(...result.cues.map((cue) => ({ index, cue })));
  });
  return { navigation, cues };
}

// GPS error across the street, in metres: it strays in runs of a few
// seconds, as it does between buildings, up to 23 m beyond the far pavement.
const NOISE_M = [
  0, 6, -4, 12, 19, 20, 23, 9, -2, -8, 5, 14, 21, 19, 3, -6, 11, 16, 22, 7,
];

test("the far pavement with a stray GPS is never off the route", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  // Along the far pavement, 22 m from the route, for 120 fixes (4 minutes).
  const fixes = Array.from({ length: 120 }, (_, i) => ({
    at: north(22 + NOISE_M[i % NOISE_M.length], east(20 + 6 * i)),
  }));
  expect(fixes.some(({ at }) => at[0] - LAT > OFF_ROUTE_M / 111_195)).toBe(true);
  const result = run(navigation, fixes);
  expect(result.cues.map(({ cue }) => cue)).not.toContainEqual(OFF_CUE);
  expect(result.navigation.offRoute).toBe(false);
  expect(result.navigation.alongM).toBeGreaterThan(600);
});

test("one fix 60 m away is not off the route", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  const result = run(navigation, [
    { at: east(100) },
    { at: north(60, east(106)) },
    { at: east(112) },
    { at: east(118) },
  ]);
  expect(result.cues).toEqual([]);
  expect(result.navigation.offRoute).toBe(false);
});

test("a wrong parallel street is off the route within seconds", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  // On the route to 100 m, then along a street 55 m north of it.
  const fixes = Array.from({ length: 20 }, (_, i) => {
    const m = 40 + 6 * i;
    return { at: m <= 100 ? east(m) : north(55 + (NOISE_M[i] - 8) / 2, east(m)) };
  });
  const firstOff = fixes.findIndex(({ at }) => at[0] > LAT);
  const result = run(navigation, fixes);
  const said = result.cues.filter(({ cue }) => cue.say === OFF_CUE.say);
  expect(said).toHaveLength(1);
  const seconds = (said[0].index - firstOff) * FIX_S;
  expect(seconds).toBeGreaterThanOrEqual(OFF_SECONDS);
  expect(seconds).toBeLessThanOrEqual(OFF_SECONDS + 2 * FIX_S);
  expect(said[0].cue).toEqual(OFF_CUE);
});

test("off the route is said once, and the way back after BACK_FIXES", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  const off = run(
    navigation,
    Array.from({ length: 10 }, (_, i) => ({
      at: north(OFF_ROUTE_M + 20, east(100 + 6 * i)),
    })),
  );
  expect(off.navigation.offRoute).toBe(true);
  expect(off.cues.map(({ cue }) => cue)).toEqual([OFF_CUE]);
  const first = onFix(off.navigation, east(160), { accuracyM: 8, timeMs: 30_000 });
  expect(BACK_FIXES).toBe(2);
  expect(first.cues).toEqual([]);
  expect(first.navigation.offRoute).toBe(true);
  const back = onFix(first.navigation, east(166), { accuracyM: 8, timeMs: 32_000 });
  expect(back.navigation.offRoute).toBe(false);
  expect(back.cues[0]).toEqual(BACK_CUE);
  expect(back.navigation.alongM).toBeCloseTo(166, -1);
});

test("a fix with an 80 m error says nothing about being off", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  // A minute of poor fixes 80 m away: the phone has lost the sky.
  const poor = run(
    navigation,
    Array.from({ length: 30 }, (_, i) => ({
      at: north(80, east(100)),
      reading: { accuracyM: 80, timeMs: i * FIX_S * 1000 },
    })),
  );
  expect(poor.cues).toEqual([]);
  expect(poor.navigation.offRoute).toBe(false);
  // Nor does it bring a runner off the route back on it.
  const off = run(
    navigation,
    Array.from({ length: 10 }, (_, i) => ({ at: north(60, east(100 + 6 * i)) })),
  );
  const still = run(off.navigation, [
    { at: east(160), reading: { accuracyM: 80, timeMs: 30_000 } },
    { at: east(166), reading: { accuracyM: 80, timeMs: 32_000 } },
  ]);
  expect(still.cues).toEqual([]);
  expect(still.navigation.offRoute).toBe(true);
});

test("without times from the phone, OFF_FIXES fixes in a row are enough", () => {
  let { navigation } = startNavigation(POINTS, DIRECTIONS);
  const cues: Cue[] = [];
  for (const m of [100, 106, 112]) {
    const result = onFix(navigation, north(60, east(m)));
    navigation = result.navigation;
    cues.push(...result.cues);
  }
  expect(cues).toEqual([OFF_CUE]);
});

test("the end of the route is said, and nothing after", () => {
  let navigation = startNavigation(POINTS, DIRECTIONS).navigation;
  // Along the way, fix by fix, as the phone gives them.
  for (let m = 50; m <= 1990; m += 40) {
    navigation = onFix(navigation, m <= 1000 ? east(m) : east(2000 - m)).navigation;
  }
  const end = onFix(navigation, east(5));
  expect(end.navigation.arrived).toBe(true);
  expect(end.cues).toContainEqual({ say: "You have arrived.", vibrate: true });
  expect(onFix(end.navigation, east(5)).cues).toEqual([]);
  expect(remainingM(end.navigation)).toBeLessThan(30);
});

test("a chain is the direction and the joined ones after it", () => {
  expect(chainFrom(DIRECTIONS, 1).map((d) => d.turn)).toEqual(["left", "right"]);
  expect(chainFrom(DIRECTIONS, 3).map((d) => d.turn)).toEqual(["u-turn"]);
});
