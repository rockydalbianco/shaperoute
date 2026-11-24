import type { LatLon } from "@shaperoute/shared-types";

import type { FlightTask, Turnpoint } from "./flightTask";
import {
  destination,
  distanceM,
  FAI_RADIUS_M,
  shortestRoute,
  taskRoute,
} from "./taskRoute";

// An invented place: no real task anywhere in these tests.
const ORIGIN: LatLon = [46, 11];

/** `northKm` north and `eastKm` east of the origin. */
function at(northKm: number, eastKm: number): LatLon {
  return destination(destination(ORIGIN, 0, northKm * 1000), 90, eastKm * 1000);
}

function cylinder(
  point: LatLon,
  radiusM: number,
  kind: Turnpoint["kind"] = "turnpoint",
): Turnpoint {
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

/** The shortest way through one cylinder by trying every tenth of a
 * degree. */
function bruteForce(from: LatLon, one: Turnpoint, to: LatLon): number {
  let best = Infinity;
  for (let i = 0; i < 3600; i += 1) {
    const p = destination(one.waypoint.point, i / 10, one.radiusM);
    best = Math.min(
      best,
      distanceM(from, p, "faiSphere") + distanceM(p, to, "faiSphere"),
    );
  }
  return best;
}

describe("distanceM", () => {
  it("measures a degree of latitude on the FAI sphere", () => {
    expect(distanceM([45, 11], [46, 11], "faiSphere")).toBeCloseTo(
      (Math.PI / 180) * FAI_RADIUS_M,
      3,
    );
  });

  it("measures a degree of latitude at 45° on the WGS84 ellipsoid", () => {
    // 111 132 m from 44.5° to 45.5°, the ellipsoid's own number.
    expect(Math.abs(distanceM([44.5, 11], [45.5, 11], "wgs84") - 111_132)).toBeLessThan(
      5,
    );
  });

  it("is nothing from a point to itself", () => {
    expect(distanceM(ORIGIN, ORIGIN, "wgs84")).toBe(0);
    expect(distanceM(ORIGIN, ORIGIN, "faiSphere")).toBe(0);
  });

  it("puts a destination where it said", () => {
    const p = destination(ORIGIN, 37, 12_345);
    expect(distanceM(ORIGIN, p, "faiSphere")).toBeCloseTo(12_345, 3);
  });
});

describe("shortestRoute", () => {
  it("ends on the near edge of a last cylinder", () => {
    const route = shortestRoute(ORIGIN, [cylinder(at(10, 0), 2000)], "faiSphere");
    expect(route.totalM).toBeCloseTo(8000, 0);
  });

  it("goes straight through a cylinder on the way", () => {
    const route = shortestRoute(
      ORIGIN,
      [cylinder(at(0, 10), 2000), cylinder(at(0, 20), 0)],
      "faiSphere",
    );
    expect(Math.abs(route.totalM - 20_000)).toBeLessThan(1);
  });

  it("finds the shortest touch of a cylinder off the way, within a metre", () => {
    const one = cylinder(at(5, 10), 1000);
    const goal = cylinder(at(0, 20), 0);
    const route = shortestRoute(ORIGIN, [one, goal], "faiSphere");
    expect(Math.abs(route.totalM - bruteForce(ORIGIN, one, at(0, 20)))).toBeLessThan(1);
    expect(route.legsM).toHaveLength(2);
    expect(distanceM(route.points[0], one.waypoint.point, "faiSphere")).toBeCloseTo(
      1000,
      0,
    );
  });

  it("settles a chain of cylinders, each touched on its edge", () => {
    const chain = [
      cylinder(at(10, 0), 3000),
      cylinder(at(10, 15), 2000),
      cylinder(at(-5, 20), 1000),
      cylinder(at(0, 5), 400),
    ];
    const route = shortestRoute(ORIGIN, chain, "wgs84");
    chain.forEach((one, index) => {
      expect(
        distanceM(route.points[index], one.waypoint.point, "faiSphere"),
      ).toBeCloseTo(one.radiusM, 0);
    });
    // Moving any touch point a degree round its circle makes it longer.
    chain.forEach((one, index) => {
      const centre = one.waypoint.point;
      for (const turn of [-1, 1]) {
        const points = [...route.points];
        const bearing =
          (Math.atan2(
            (points[index][1] - centre[1]) * Math.cos((centre[0] * Math.PI) / 180),
            points[index][0] - centre[0],
          ) *
            180) /
          Math.PI;
        points[index] = destination(centre, bearing + turn, one.radiusM);
        let total = 0;
        let previous = ORIGIN;
        for (const point of points) {
          total += distanceM(previous, point, "wgs84");
          previous = point;
        }
        expect(total).toBeGreaterThan(route.totalM - 0.5);
      }
    });
  });

  it("crosses a goal line at its middle", () => {
    const route = shortestRoute(
      ORIGIN,
      [cylinder(at(10, 0), 1000), cylinder(at(10, 10), 500, "goal")],
      "faiSphere",
      true,
    );
    expect(route.points[1]).toEqual(at(10, 10));
  });
});

describe("taskRoute", () => {
  it("counts from the takeoff's centre", () => {
    const task: FlightTask = {
      earth: "faiSphere",
      turnpoints: [cylinder(ORIGIN, 400, "takeoff"), cylinder(at(10, 0), 2000, "goal")],
      start: null,
      goal: { type: "cylinder", deadline: null },
    };
    expect(taskRoute(task).totalM).toBeCloseTo(8000, 0);
  });
});
