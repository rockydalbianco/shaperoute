import type { Direction, LatLon } from "@shaperoute/shared-types";

import {
  ANNOUNCE_M,
  chainFrom,
  onFix,
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

test("off the route is said once, and the way back too", () => {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  const off = onFix(navigation, north(OFF_ROUTE_M + 20, east(100)));
  expect(off.navigation.offRoute).toBe(true);
  expect(off.cues).toEqual([
    { say: "You are off the route. Head back to it.", vibrate: true },
  ]);
  expect(onFix(off.navigation, north(OFF_ROUTE_M + 30, east(110))).cues).toEqual([]);
  const back = onFix(off.navigation, east(120));
  expect(back.navigation.offRoute).toBe(false);
  expect(back.cues[0]).toEqual({ say: "Back on the route.", vibrate: false });
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
