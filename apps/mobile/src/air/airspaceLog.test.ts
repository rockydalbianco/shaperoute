/**
 * The airspace log after a flight (TASK-479 part E3): the times inside a
 * volume of the pilot's file, from an invented file and a made-up flight.
 */
import type { Track } from "../navigation/trackRecorder";
import { airspaceLog } from "./airspaceLog";
import type { Airspace, Limit } from "./openair";
import { flightOf, pointAt, T0 } from "./syntheticFlight";

/** A box from `east1` to `east2` metres east of the origin, 1 km wide. */
function box(
  name: string,
  east1: number,
  east2: number,
  floor: Limit,
  ceiling: Limit,
  klass = "R",
): Airspace {
  return {
    class: klass,
    name,
    floor,
    ceiling,
    points: [
      pointAt(east1, -500),
      pointAt(east2, -500),
      pointAt(east2, 500),
      pointAt(east1, 500),
    ],
  };
}

const GROUND: Limit = { kind: "ground" };
const sea = (metres: number): Limit => ({ kind: "aboveSea", metres });

// 10 m/s east for 300 s from 1500 m, level: x = 10 · t metres.
const level = flightOf(
  [{ kind: "glide", seconds: 300, airspeedMps: 10, headingDeg: 90, varioMps: 0 }],
  { fromAltM: 1500 },
);

describe("airspaceLog", () => {
  it("logs one time inside a volume, with when, how deep and the nearer limit", () => {
    const log = airspaceLog(level, [box("ONE", 1000, 2000, GROUND, sea(1800))]);
    expect(log).toHaveLength(1);
    const [entry] = log;
    expect(entry.airspace.name).toBe("ONE");
    // In from about 100 s to 200 s.
    expect(Math.abs(entry.fromMs - (T0 + 100_000))).toBeLessThanOrEqual(1_000);
    expect(Math.abs(entry.toMs - (T0 + 200_000))).toBeLessThanOrEqual(1_000);
    // At most 500 m from the outline: the middle of a 1 km box.
    expect(entry.edgeM).toBeGreaterThan(480);
    expect(entry.edgeM).toBeLessThanOrEqual(501);
    // 300 m under the ceiling; the floor is the ground, far under.
    expect(entry.limitM).toBeCloseTo(300, 0);
    expect(entry.approx).toBe(false);
  });

  it("leaves out a volume flown over or under", () => {
    expect(airspaceLog(level, [box("UNDER", 1000, 2000, GROUND, sea(1400))])).toEqual(
      [],
    );
    expect(airspaceLog(level, [box("OVER", 1000, 2000, sea(1600), sea(3000))])).toEqual(
      [],
    );
  });

  it("gives null for the limit between the ground and unlimited", () => {
    const [entry] = airspaceLog(level, [
      box("ALL", 1000, 2000, GROUND, { kind: "unlimited" }),
    ]);
    expect(entry.limitM).toBeNull();
  });

  it("marks a flight level, or a height above the ground, as approximate", () => {
    const [fl] = airspaceLog(level, [
      box("FL", 1000, 2000, GROUND, { kind: "flightLevel", level: 95 }),
    ]);
    expect(fl.approx).toBe(true);
    // Above the ground: counted as met, since the ground is not known.
    const [agl] = airspaceLog(level, [
      box("AGL", 1000, 2000, { kind: "aboveGround", metres: 300 }, sea(3000)),
    ]);
    expect(agl.approx).toBe(true);
    expect(agl.limitM).toBeCloseTo(1500, 0);
  });

  it("orders the times by start and keeps two volumes apart", () => {
    const log = airspaceLog(level, [
      box("LATER", 2500, 2800, GROUND, sea(3000), "D"),
      box("FIRST", 500, 900, GROUND, sea(3000)),
    ]);
    expect(log.map((entry) => entry.airspace.name)).toEqual(["FIRST", "LATER"]);
  });

  it("looks only within the windows in the air", () => {
    const one = [box("ONE", 1000, 2000, GROUND, sea(1800))];
    expect(airspaceLog(level, one, [{ startMs: T0, endMs: T0 + 50_000 }])).toEqual([]);
    const [entry] = airspaceLog(level, one, [
      { startMs: T0 + 150_000, endMs: T0 + 300_000 },
    ]);
    expect(entry.fromMs).toBe(T0 + 150_000);
  });

  it("ends a time inside at a gap in the recording", () => {
    const fixes = level.fixes.map((fix) =>
      fix.timeMs === T0 + 150_000 ? { ...fix, gap: true as const } : fix,
    );
    const track: Track = { ...level, fixes };
    const log = airspaceLog(track, [box("ONE", 1000, 2000, GROUND, sea(1800))]);
    expect(log).toHaveLength(2);
    expect(log[0].toMs).toBe(T0 + 149_000);
    expect(log[1].fromMs).toBe(T0 + 150_000);
  });

  it("skips fixes with no height", () => {
    const fixes = level.fixes.map(({ altitudeM: _, ...fix }) => fix);
    expect(
      airspaceLog({ ...level, fixes }, [box("ONE", 1000, 2000, GROUND, sea(1800))]),
    ).toEqual([]);
  });
});
