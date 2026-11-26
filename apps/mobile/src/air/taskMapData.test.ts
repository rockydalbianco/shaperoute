import type { LatLon } from "@shaperoute/shared-types";

import type { FlightTask, Turnpoint } from "./flightTask";
import { RING_CORNERS, ringOf, taskFeatures } from "./taskMapData";
import { destination, distanceM, shortestRoute } from "./taskRoute";

// An invented task: no real one anywhere in these tests.
const ORIGIN: LatLon = [46, 11];
const at = (northKm: number, eastKm: number): LatLon =>
  destination(destination(ORIGIN, 0, northKm * 1000), 90, eastKm * 1000);

function tp(point: LatLon, radiusM: number, kind: Turnpoint["kind"]): Turnpoint {
  return {
    waypoint: {
      name: "T",
      code: null,
      point,
      altM: null,
      landing: false,
      description: null,
    },
    radiusM,
    kind,
  };
}

const TASK: FlightTask = {
  earth: "faiSphere",
  turnpoints: [
    tp(ORIGIN, 400, "takeoff"),
    tp(at(10, 0), 1000, "turnpoint"),
    tp(at(10, 10), 500, "goal"),
  ],
  start: null,
  goal: { type: "cylinder", deadline: null },
};

describe("taskFeatures", () => {
  it("rings each cylinder at its radius, closed", () => {
    const ring = ringOf(at(10, 0), 1000);
    expect(ring).toHaveLength(RING_CORNERS + 1);
    expect(ring[0]).toEqual(ring[RING_CORNERS]);
    for (const [lon, lat] of ring) {
      expect(distanceM([lat, lon], at(10, 0), "faiSphere")).toBeCloseTo(1000, 3);
    }
  });

  it("marks the next cylinder and the ones taken, and draws the way left", () => {
    const progress = { next: 2, taken: [{ index: 1, atMs: 0 }], startMs: null };
    const here = at(10, 2);
    const route = shortestRoute(here, TASK.turnpoints.slice(2), TASK.earth);
    const features = taskFeatures(TASK, progress, here, route).features;
    expect(features.map((one) => one.properties)).toEqual([
      { part: "cylinder", next: false, taken: true },
      { part: "cylinder", next: false, taken: true },
      { part: "cylinder", next: true, taken: false },
      { part: "route", next: false, taken: false },
    ]);
    const way = features[3].geometry.coordinates as [number, number][];
    expect(way[0]).toEqual([here[1], here[0]]);
    expect(way).toHaveLength(2);
  });

  it("draws a goal line across the last leg, as long as its two radii", () => {
    const task: FlightTask = { ...TASK, goal: { type: "line", deadline: null } };
    const features = taskFeatures(
      task,
      { next: 1, taken: [], startMs: null },
      null,
      null,
    ).features;
    expect(features).toHaveLength(3);
    const line = features[2];
    expect(line.properties.part).toBe("goalLine");
    const [[lon1, lat1], [lon2, lat2]] = line.geometry.coordinates as [
      number,
      number,
    ][];
    expect(distanceM([lat1, lon1], [lat2, lon2], "faiSphere")).toBeCloseTo(1000, 0);
    // The last leg goes east: the line stands north–south.
    expect(Math.abs(lon1 - lon2)).toBeLessThan(1e-6);
  });
});
