/**
 * A race on its map (TASK-305 part R6c): the flights as stretches of the
 * track's fixes, and the line cut at them; nothing for a flight alone or
 * another sport, whose line is a run's.
 */
import type { LatLon } from "@shaperoute/shared-types";

import type { FreeRun } from "../navigation/freeRun";
import type { Track, TrackFix } from "../navigation/trackRecorder";
import { airLegsOf, flightAirOf, splitAtAir } from "./flightLegs";

jest.mock("../settings/sport", () => ({
  ...jest.requireActual("../settings/sport"),
  loadSport: () => "paragliding",
}));

const T0 = 1_794_470_400_000;
const EARTH_RADIUS_M = 6_371_000;

function fix(metres: number, seconds: number, height: number): TrackFix {
  return {
    point: [45.7355 + ((metres / EARTH_RADIUS_M) * 180) / Math.PI, 10.835],
    timeMs: T0 + seconds * 1000,
    accuracyM: 5,
    altitudeM: height,
  };
}

type Leg = { seconds: number; mps: number; vario: number };

function runOf(legs: Leg[]): FreeRun {
  const fixes: TrackFix[] = [fix(0, 0, 1000)];
  let metres = 0;
  let height = 1000;
  let t = 0;
  for (const leg of legs) {
    for (let s = 0; s < leg.seconds; s += 1) {
      t += 1;
      metres += leg.mps;
      height += leg.vario;
      fixes.push(fix(metres, t, height));
    }
  }
  const track: Track = { fixes, distanceM: metres };
  return { version: 1, route: [], track, status: "stopped" };
}

const UP: Leg = { seconds: 1200, mps: 1.5, vario: 0.25 };
const FLY: Leg = { seconds: 900, mps: 10, vario: -1.6 };
const WALK: Leg = { seconds: 300, mps: 1.2, vario: 0 };

test("a race's flights are stretches of its fixes, in their order", () => {
  const run = runOf([UP, FLY, WALK]);
  const legs = airLegsOf(run, "paragliding");
  expect(legs).toHaveLength(1);
  const [air] = legs ?? [];
  // Up on foot for 1200 fixes, then the flight: within a few fixes.
  expect(Math.abs(air.from - UP.seconds)).toBeLessThan(15);
  expect(air.to).toBeGreaterThan(UP.seconds + FLY.seconds - 15);
  expect(air.to).toBeLessThan(run.track.fixes.length - 1);
});

test("a flight alone, a walk alone or another sport: no flights to draw", () => {
  expect(airLegsOf(runOf([FLY]), "paragliding")).toBeNull();
  expect(airLegsOf(runOf([UP]), "paragliding")).toBeNull();
  expect(airLegsOf(runOf([UP, FLY, WALK]), "run")).toBeNull();
  expect(airLegsOf({ ...runOf([]), track: { fixes: [], distanceM: 0 } })).toBeNull();
});

test("once per run: the same list each time, so the line is not drawn again", () => {
  const run = runOf([UP, FLY, WALK]);
  const first = flightAirOf(run);
  expect(first).not.toBeNull();
  expect(flightAirOf(run)).toBe(first);
  expect(flightAirOf(null)).toBeNull();
});

test("the line cut at the flights, without holes", () => {
  const line: LatLon[] = Array.from({ length: 7 }, (_, i) => [45 + i / 1000, 10]);
  const cut = splitAtAir(line, [{ from: 2, to: 4 }]);
  expect(cut.foot).toEqual([line.slice(0, 3), line.slice(4)]);
  expect(cut.air).toEqual([line.slice(2, 5)]);
  // A flight to the very end leaves no piece on foot after it.
  expect(splitAtAir(line, [{ from: 3, to: 6 }]).foot).toEqual([line.slice(0, 4)]);
});
