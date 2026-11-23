/**
 * The pilot against the airspaces of their file (TASK-479 part E2): inside
 * or out, how far from the edge, over or under the limits; flight levels
 * as ≈ heights; limits above the ground only with the ground known; the
 * warning on the nearest within both thresholds. Invented volumes only.
 */
import {
  airspaceFeatures,
  alertOf,
  distanceToOutline,
  heightOf,
  nearAirspaces,
  volumeOf,
  withinOutline,
} from "./airspaceNear";
import { type Airspace, METRES_PER_FOOT } from "./openair";

// An invented square of about 2.2 km a side, 45.00–45.02 N, 10.00–10.03 E.
const SQUARE: Airspace = {
  class: "R",
  name: "TEST SQUARE",
  floor: { kind: "aboveSea", metres: 1000 },
  ceiling: { kind: "flightLevel", level: 95 },
  points: [
    [45.0, 10.0],
    [45.0, 10.03],
    [45.02, 10.03],
    [45.02, 10.0],
  ],
};
const LOW: Airspace = {
  ...SQUARE,
  class: "D",
  name: "TEST LOW",
  floor: { kind: "ground" },
  ceiling: { kind: "aboveGround", metres: 300 },
};
const FAR: Airspace = {
  ...SQUARE,
  name: "TEST FAR",
  points: SQUARE.points.map(([lat, lon]) => [lat + 1, lon] as [number, number]),
};

const CENTRE: [number, number] = [45.01, 10.015];
// About 780 m south of the square's southern edge.
const SOUTH: [number, number] = [44.993, 10.015];

describe("heights", () => {
  it("reads each kind of limit at the pilot's place", () => {
    expect(heightOf({ kind: "aboveSea", metres: 900 }, null)).toEqual({
      metres: 900,
      approx: false,
    });
    expect(heightOf({ kind: "flightLevel", level: 95 }, null)).toEqual({
      metres: 9500 * METRES_PER_FOOT,
      approx: true,
    });
    expect(heightOf({ kind: "aboveGround", metres: 300 }, 1200).metres).toBe(1500);
    expect(heightOf({ kind: "aboveGround", metres: 300 }, null).metres).toBeNull();
    expect(heightOf({ kind: "ground" }, 1200).metres).toBe(1200);
    expect(heightOf({ kind: "unlimited" }, null).metres).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("outlines", () => {
  it("knows inside from outside", () => {
    expect(withinOutline(CENTRE, SQUARE.points)).toBe(true);
    expect(withinOutline(SOUTH, SQUARE.points)).toBe(false);
  });

  it("measures the way to the nearest edge", () => {
    expect(distanceToOutline(SOUTH, SQUARE.points)).toBeCloseTo(778, -1);
  });
});

describe("nearAirspaces", () => {
  it("is inside between floor and ceiling, nearest first, the far ones left out", () => {
    const near = nearAirspaces([FAR, SQUARE], CENTRE, 1500, null);
    expect(near.map((one) => one.airspace.name)).toEqual(["TEST SQUARE"]);
    expect(near[0]).toMatchObject({
      within: true,
      horizontalM: 0,
      verticalM: 0,
      inside: true,
    });
    expect(near[0].approx).toBe(true);
  });

  it("is under the floor by so much, or over the ceiling", () => {
    const under = nearAirspaces([SQUARE], CENTRE, 800, null)[0];
    expect(under).toMatchObject({ within: true, verticalM: 200, inside: false });
    const over = nearAirspaces([SQUARE], CENTRE, 3200, null)[0];
    expect(over.verticalM).toBeCloseTo(3200 - 9500 * METRES_PER_FOOT, 3);
  });

  it("does not know the height of a limit above the ground without the ground", () => {
    expect(nearAirspaces([LOW], CENTRE, 1500, null)[0].verticalM).toBeNull();
    expect(nearAirspaces([LOW], CENTRE, 1500, 1100)[0].verticalM).toBe(100);
  });
});

describe("alertOf", () => {
  const thresholds = { horizontalM: 1000, verticalM: 100 };

  it("warns of the nearest within both thresholds", () => {
    const near = nearAirspaces([SQUARE], SOUTH, 1500, null);
    expect(alertOf(near, thresholds)?.airspace.name).toBe("TEST SQUARE");
    expect(alertOf(near, { horizontalM: 500, verticalM: 100 })).toBeNull();
  });

  it("does not warn far under the floor", () => {
    const near = nearAirspaces([SQUARE], CENTRE, 700, null);
    expect(alertOf(near, thresholds)).toBeNull();
  });

  it("warns on the horizontal alone when the height is not known", () => {
    const near = nearAirspaces([LOW], SOUTH, 1500, null);
    expect(alertOf(near, thresholds)?.airspace.name).toBe("TEST LOW");
  });
});

describe("volumes on the map", () => {
  it("stand from the floor to the ceiling over the ground under the pilot", () => {
    expect(volumeOf(SQUARE, 600)).toEqual({
      base: 400,
      top: Math.round(9500 * METRES_PER_FOOT - 600),
    });
    expect(volumeOf(LOW, 600)).toEqual({ base: 0, top: 300 });
    expect(volumeOf(SQUARE, null)).toBeNull();
  });

  it("are drawn flat without the ground, in the danger colour for P, R and Q", () => {
    const near = nearAirspaces([SQUARE, LOW], CENTRE, 1500, null);
    const { features } = airspaceFeatures(near, null);
    expect(features).toHaveLength(2);
    expect(features.every((one) => one.properties.flat)).toBe(true);
    expect(features.find((one) => one.properties.danger)).toBeDefined();
    // Closed, [lon, lat].
    const ring = features[0].geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring[0]).toEqual([10.0, 45.0]);
  });
});
