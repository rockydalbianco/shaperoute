import type { LatLon } from "@shaperoute/shared-types";

/**
 * «Camera behind» on «3D» (TASK-408, ADR-0339, part C2b): the map's camera
 * following the animal along the run, as MapLibre takes it. Worked out
 * here, from the run's own track in metres on a flat plane about its
 * start, so it is tested in the app: the page only moves the map where
 * each picture says. The camera looks along the road, smoothed over a
 * stretch of it so a GPS wobble does not shake the picture, from a little
 * behind and above; its middle is a little ahead of the animal, so the
 * animal runs in the lower half of the picture.
 */

/** A camera of the map: its middle as [lon, lat], as MapLibre has it. */
export type ChaseCamera = {
  center: [number, number];
  bearing: number;
  zoom: number;
  pitch: number;
};

/** How far the camera leans, in degrees from straight down. */
export const CHASE_PITCH = 62;
/** How much closer than the whole drawing, in zoom levels, and the
 * closest it comes. */
export const CHASE_ZOOM_UP = 1.8;
export const CHASE_MAX_ZOOM = 16.5;
/** The camera's middle this far ahead of the animal, in metres. */
const AHEAD_M = 60;
/** The road's direction is taken across this many metres, at this many
 * places around the animal, a stretch `SMOOTH_M` long. */
const LOOK_M = 120;
const SMOOTH_M = 300;
const SMOOTH_SAMPLES = 9;
/** How many cameras along the run the page tries before the video. */
export const CHASE_SAMPLES = 16;

/** The track on a flat plane about its start: x east, y north, in metres,
 * with the distance run up to each point. */
export type Plane = {
  lat0: number;
  lon0: number;
  /** Metres in a degree of longitude here. */
  k: number;
  xs: number[];
  ys: number[];
  run: number[];
  length: number;
};

const METRES_PER_DEGREE = 111_195;

export function planeOf(track: readonly LatLon[]): Plane {
  const [lat0, lon0] = track.length > 0 ? track[0] : [0, 0];
  const k = METRES_PER_DEGREE * Math.cos((lat0 * Math.PI) / 180);
  const xs = track.map(([, lon]) => (lon - lon0) * k);
  const ys = track.map(([lat]) => (lat - lat0) * METRES_PER_DEGREE);
  const run = [0];
  for (let i = 1; i < track.length; i += 1) {
    run.push(run[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  }
  return { lat0, lon0, k, xs, ys, run, length: run[run.length - 1] ?? 0 };
}

/** The point `metres` along the track, clamped to its ends. */
export function pointAt(plane: Plane, metres: number): [number, number] {
  const { xs, ys, run } = plane;
  if (xs.length === 0) {
    return [0, 0];
  }
  const d = Math.min(Math.max(metres, 0), plane.length);
  let i = 1;
  while (i < run.length - 1 && run[i] < d) {
    i += 1;
  }
  if (i >= run.length) {
    return [xs[xs.length - 1], ys[ys.length - 1]];
  }
  const span = run[i] - run[i - 1];
  const u = span > 0 ? (d - run[i - 1]) / span : 0;
  return [xs[i - 1] + (xs[i] - xs[i - 1]) * u, ys[i - 1] + (ys[i] - ys[i - 1]) * u];
}

/** The road's direction at `metres`, in degrees clockwise from north,
 * smoothed over the stretch around it. */
export function headingAt(plane: Plane, metres: number): number {
  let east = 0;
  let north = 0;
  for (let s = 0; s < SMOOTH_SAMPLES; s += 1) {
    const at = metres + SMOOTH_M * (s / (SMOOTH_SAMPLES - 1) - 0.5);
    const [ax, ay] = pointAt(plane, at - LOOK_M / 2);
    const [bx, by] = pointAt(plane, at + LOOK_M / 2);
    const dx = bx - ax;
    const dy = by - ay;
    const size = Math.hypot(dx, dy);
    if (size > 0) {
      east += dx / size;
      north += dy / size;
    }
  }
  if (east === 0 && north === 0) {
    return 0;
  }
  const degrees = (Math.atan2(east, north) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

function lonLatOf(plane: Plane, [x, y]: [number, number]): [number, number] {
  return [plane.lon0 + x / plane.k, plane.lat0 + y / METRES_PER_DEGREE];
}

/** The camera behind the animal at `share` of the run (0 to 1, of its
 * metres), `fitZoom` being the zoom of the whole drawing. */
export function chaseCamera(plane: Plane, share: number, fitZoom: number): ChaseCamera {
  const at = plane.length * Math.min(Math.max(share, 0), 1);
  return {
    center: lonLatOf(plane, pointAt(plane, at + AHEAD_M)),
    bearing: headingAt(plane, at),
    zoom: Math.min(fitZoom + CHASE_ZOOM_UP, CHASE_MAX_ZOOM),
    pitch: CHASE_PITCH,
  };
}

/** The cameras the page tries along the run before the video: for the
 * map's tiles, and what a picture costs. */
export function chaseSamples(plane: Plane, fitZoom: number): ChaseCamera[] {
  return Array.from({ length: CHASE_SAMPLES }, (_, i) =>
    chaseCamera(plane, i / (CHASE_SAMPLES - 1), fitZoom),
  );
}
