import type { LatLon } from "@shaperoute/shared-types";

import { activityKey } from "../activities/activityKey";
import { type FlightFix, flightFixesOf, type KeptFlightEntry } from "./flightArchive";
import {
  compareSameTakeoff,
  MAX_OTHERS,
  numbersOf,
  sameTakeoffFlights,
} from "./sameTakeoff";
import { flightOf } from "./syntheticFlight";
import { destination } from "./taskRoute";

jest.mock("expo-file-system", () => ({
  File: class {},
  Directory: class {},
  Paths: { document: { uri: "file:///documents/" } },
}));

/** A made-up flight from `takeoff` a day after T0 per `day`, climbing at
 * `climb` in its thermal. */
function flight(day: number, climb: number, from: LatLon | null = null): FlightFix[] {
  const fixes = flightFixesOf(
    flightOf(
      [
        { kind: "glide", seconds: 90, airspeedMps: 10, headingDeg: 60, varioMps: -1 },
        {
          kind: "circle",
          seconds: 200,
          airspeedMps: 10,
          turnSeconds: 22,
          direction: 1,
          varioMps: climb,
        },
        {
          kind: "glide",
          seconds: 90 + day * 10,
          airspeedMps: 10,
          headingDeg: 90,
          varioMps: -1,
        },
      ],
      { fromAltM: 1800 },
    ),
  );
  return fixes.map((fix) => ({
    ...fix,
    timeMs: fix.timeMs + day * 86_400_000,
    point:
      from === null
        ? fix.point
        : ([
            fix.point[0] - fixes[0].point[0] + from[0],
            fix.point[1] - fixes[0].point[1] + from[1],
          ] as LatLon),
  }));
}

function entryOf(fixes: FlightFix[]): KeptFlightEntry {
  return {
    key: activityKey(fixes[0]),
    source: "muw",
    startMs: fixes[0].timeMs,
    takeoff: fixes[0].point,
  };
}

describe("sameTakeoff", () => {
  const today = flight(10, 2);
  const near = [flight(1, 1), flight(2, 3), flight(3, 1.5)];
  const takeoff = today[0].point;
  const far = flight(4, 4, destination(takeoff, 90, 600));
  const all = [...near, far, today];
  const byKey = new Map(all.map((fixes) => [activityKey(fixes[0]), fixes]));
  const entries = all.map(entryOf);

  it("compares with the flights from within 500 m, not with itself", () => {
    const comparison = compareSameTakeoff(
      activityKey(today[0]),
      today,
      entries,
      (key) => byKey.get(key) ?? null,
    )!;
    expect(comparison.others).toBe(3);
    const climbs = near.map((fixes) => numbersOf(fixes)!.avgClimbMps!);
    expect(comparison.best.avgClimbMps).toBeCloseTo(Math.max(...climbs), 5);
    expect(comparison.average.avgClimbMps).toBeCloseTo(
      climbs.reduce((a, b) => a + b, 0) / 3,
      5,
    );
    expect(comparison.flight.avgClimbMps).toBeGreaterThan(1.7);
    expect(comparison.flight.avgClimbMps).toBeLessThan(2.1);
    expect(comparison.best.durationS).toBe(numbersOf(near[2])!.durationS);
    expect(comparison.flight.xcPoints).toBeGreaterThan(0);
  });

  it("has nothing to compare with fewer than two other flights", () => {
    const read = (key: string) => byKey.get(key) ?? null;
    const two = [entryOf(near[0]), entryOf(today)];
    expect(compareSameTakeoff(activityKey(today[0]), today, two, read)).toBeNull();
    // A kept flight the phone cannot read does not count.
    expect(
      compareSameTakeoff(activityKey(today[0]), today, entries, (key) =>
        key === activityKey(near[0][0]) ? null : (byKey.get(key) ?? null),
      )?.others,
    ).toBe(2);
  });

  it("reads at most the latest MAX_OTHERS", () => {
    const many: KeptFlightEntry[] = Array.from({ length: MAX_OTHERS + 5 }, (_, i) => ({
      key: `${i}`.padStart(16, "0"),
      source: "igc",
      startMs: i,
      takeoff,
    }));
    const chosen = sameTakeoffFlights("x", takeoff, many);
    expect(chosen).toHaveLength(MAX_OTHERS);
    expect(chosen[0].startMs).toBe(MAX_OTHERS + 4);
  });
});
