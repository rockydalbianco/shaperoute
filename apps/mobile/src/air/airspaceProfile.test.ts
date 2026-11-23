/**
 * The airspace under the altitude chart (TASK-479 part E3): the volumes
 * whose outline held the pilot in each bar, floor to ceiling.
 */
import { hasBands, placeSeries, profileBands } from "./airspaceProfile";
import { CHART_BARS } from "./instrument";
import type { Airspace } from "./openair";
import { flightOf, pointAt, T0 } from "./syntheticFlight";

const square = (
  east1: number,
  east2: number,
  floor: Airspace["floor"],
  ceiling: Airspace["ceiling"],
  klass = "R",
): Airspace => ({
  class: klass,
  name: "TEST",
  floor,
  ceiling,
  points: [
    pointAt(east1, -500),
    pointAt(east2, -500),
    pointAt(east2, 500),
    pointAt(east1, 500),
  ],
});

// 10 m/s east for 600 s: one bar a 10 s slice, 100 m apart.
const track = flightOf([
  { kind: "glide", seconds: 600, airspeedMps: 10, headingDeg: 90, varioMps: 0 },
]);
const end = T0 + 600_000;

describe("placeSeries", () => {
  it("gives the pilot's place at the end of each slice, null before the track", () => {
    const places = placeSeries(track, end);
    expect(places).toHaveLength(CHART_BARS);
    expect(places[CHART_BARS - 1]).toEqual(track.fixes[track.fixes.length - 1].point);
    expect(placeSeries(track, T0 + 300_000)[0]).toBeNull();
  });
});

describe("profileBands", () => {
  const places = placeSeries(track, end);

  it("bands the bars over a volume, floor to ceiling", () => {
    const bands = profileBands(
      places,
      [
        square(
          2050,
          3050,
          { kind: "aboveSea", metres: 1000 },
          { kind: "flightLevel", level: 95 },
        ),
      ],
      null,
    );
    // Bars 20–29 end at 2100…3000 m east.
    expect(bands[19]).toEqual([]);
    expect(bands[20]).toHaveLength(1);
    expect(bands[29]).toHaveLength(1);
    expect(bands[30]).toEqual([]);
    expect(bands[25][0].floorM).toBe(1000);
    expect(bands[25][0].ceilingM).toBeCloseTo(2895.6, 1);
    expect(bands[25][0].danger).toBe(true);
    expect(hasBands(bands)).toBe(true);
  });

  it("opens a band on a side not known, and uses the ground when known", () => {
    const agl = square(
      0,
      6100,
      { kind: "aboveGround", metres: 300 },
      { kind: "unlimited" },
      "D",
    );
    const [unknown] = profileBands([places[10]], [agl], null)[0];
    expect(unknown.floorM).toBe(Number.NEGATIVE_INFINITY);
    expect(unknown.ceilingM).toBe(Number.POSITIVE_INFINITY);
    expect(unknown.danger).toBe(false);
    const [known] = profileBands([places[10]], [agl], 1200)[0];
    expect(known.floorM).toBe(1500);
  });

  it("has no bands away from every volume, or with no file", () => {
    expect(
      hasBands(
        profileBands(
          places,
          [square(9000, 9500, { kind: "ground" }, { kind: "unlimited" })],
          null,
        ),
      ),
    ).toBe(false);
    expect(hasBands(profileBands(places, [], null))).toBe(false);
  });
});
