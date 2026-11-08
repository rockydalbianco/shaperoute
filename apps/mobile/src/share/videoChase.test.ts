import type { LatLon } from "@shaperoute/shared-types";

import {
  CHASE_MAX_ZOOM,
  CHASE_PITCH,
  CHASE_SAMPLES,
  CHASE_ZOOM_UP,
  chaseCamera,
  chaseSamples,
  headingAt,
  planeOf,
  pointAt,
} from "./videoChase";

/** 2 km north, then 2 km east, a point every 50 m. */
function corner(): LatLon[] {
  const north = Array.from({ length: 41 }, (_, i): LatLon => [
    46.07 + (i * 50) / 111_195,
    11.12,
  ]);
  const top = north[north.length - 1];
  const k = 111_195 * Math.cos((46.07 * Math.PI) / 180);
  const east = Array.from({ length: 40 }, (_, i): LatLon => [
    top[0],
    11.12 + ((i + 1) * 50) / k,
  ]);
  return [...north, ...east];
}

describe("the camera behind the animal (TASK-408 C2b)", () => {
  const plane = planeOf(corner());

  it("measures the run in metres on a flat plane", () => {
    expect(plane.length).toBeCloseTo(4000, -1);
    const [x, y] = pointAt(plane, 1000);
    expect(x).toBeCloseTo(0, 1);
    expect(y).toBeCloseTo(1000, 0);
    expect(pointAt(plane, -50)).toEqual([0, 0]);
    expect(pointAt(plane, 99_999)[0]).toBeCloseTo(2000, -1);
  });

  it("looks along the road: north, then east, turning smoothly at the corner", () => {
    expect(headingAt(plane, 500)).toBeCloseTo(0, 0);
    expect(headingAt(plane, 3500)).toBeCloseTo(90, 0);
    const turning = headingAt(plane, 2000);
    expect(turning).toBeGreaterThan(30);
    expect(turning).toBeLessThan(60);
  });

  it("keeps its middle a little ahead of the animal, closer than the whole drawing, leaning", () => {
    const camera = chaseCamera(plane, 0.25, 13);
    const [lon, lat] = camera.center;
    // 1000 m north of the start, and 60 m ahead.
    expect((lat - 46.07) * 111_195).toBeCloseTo(1060, -1);
    expect(lon).toBeCloseTo(11.12, 6);
    expect(camera.zoom).toBe(13 + CHASE_ZOOM_UP);
    expect(camera.pitch).toBe(CHASE_PITCH);
    expect(chaseCamera(plane, 0.5, 16).zoom).toBe(CHASE_MAX_ZOOM);
  });

  it("gives the page cameras from the start to the end of the run, to try", () => {
    const samples = chaseSamples(plane, 13);
    expect(samples).toHaveLength(CHASE_SAMPLES);
    expect(samples[0].center[1]).toBeCloseTo(46.07 + 60 / 111_195, 6);
    expect(samples[samples.length - 1].bearing).toBeCloseTo(90, 0);
  });

  it("stands still on a run of one point, with no error", () => {
    const one = planeOf([[46.07, 11.12]]);
    expect(one.length).toBe(0);
    expect(headingAt(one, 0)).toBe(0);
    expect(chaseCamera(one, 0.5, 13).center).toEqual([11.12, 46.07]);
  });
});
