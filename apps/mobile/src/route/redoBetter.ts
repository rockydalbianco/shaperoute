import type { Activity, LatLon, Walk } from "@shaperoute/shared-types";

import type { AnyRouteRequest } from "../api/routes";
import { cumulative, nearest, OFF_ROUTE_M, passesNear } from "../navigation/progress";
import { isOnWater } from "../swim/water";
import { againOfRequest, type DrawAgain, drawsAgain } from "./drawAgain";

/**
 * «Redo better» (TASK-451, ADR-0419): at the end of a run that left its
 * route, the same shape or word, the same distance and the same start, to
 * choose again in «Draw». The engine plans the new route as always: this
 * only chooses what to ask.
 */

/** The route is looked at every this many metres. */
export const REDO_STEP_M = 10;
/** Farther than this from the track, a piece of the route was not run: the
 * same as off the route during the run. */
export const REDO_AWAY_M = OFF_ROUTE_M;
/** From this many metres of the route not run, the run left it. */
export const REDO_MISSED_M = 200;

/** What «Draw» opens with: the figure and its distance, and the start. */
export type Redo = { again: DrawAgain; start: LatLon };

const EARTH_M = 6_371_008.8;
const RADIANS = Math.PI / 180;

type Plane = (point: LatLon) => [x: number, y: number];

/** Metres east and north of `origin`, on the plane tangent there: a run is
 * a few km wide, where the error is a few centimetres. */
function planeAt([lat0, lon0]: LatLon): Plane {
  const east = Math.cos(lat0 * RADIANS) * EARTH_M * RADIANS;
  const north = EARTH_M * RADIANS;
  return ([lat, lon]) => [(lon - lon0) * east, (lat - lat0) * north];
}

type Segment = [ax: number, ay: number, bx: number, by: number];

/**
 * The track's segments in squares REDO_AWAY_M wide, each in every square
 * its box touches: a point is near the track only through a segment in its
 * own square or the eight round it, so a long run is not looked at whole
 * for each point of the route.
 */
class NearTrack {
  private readonly cells = new Map<string, Segment[]>();

  constructor(line: [number, number][]) {
    const segments: Segment[] =
      line.length === 1
        ? [[line[0][0], line[0][1], line[0][0], line[0][1]]]
        : line.slice(1).map(([bx, by], i) => [line[i][0], line[i][1], bx, by]);
    for (const segment of segments) {
      const [ax, ay, bx, by] = segment;
      for (let cx = cell(Math.min(ax, bx)); cx <= cell(Math.max(ax, bx)); cx += 1) {
        for (let cy = cell(Math.min(ay, by)); cy <= cell(Math.max(ay, by)); cy += 1) {
          const key = `${cx},${cy}`;
          const here = this.cells.get(key);
          if (here === undefined) {
            this.cells.set(key, [segment]);
          } else {
            here.push(segment);
          }
        }
      }
    }
  }

  /** Whether (px, py) is within REDO_AWAY_M of the track. */
  near(px: number, py: number): boolean {
    const cx = cell(px);
    const cy = cell(py);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const segment of this.cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (offSegment(px, py, segment) <= REDO_AWAY_M) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

function cell(metres: number): number {
  return Math.floor(metres / REDO_AWAY_M);
}

/** Metres from (px, py) to the nearest point of the segment. */
function offSegment(px: number, py: number, [ax, ay, bx, by]: Segment): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 > 0
      ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / length2))
      : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** The points along the route, asked for farther and farther along: each
 * picks up where the last one was. */
function walkerAlong(route: LatLon[], along: number[]): (atM: number) => LatLon {
  let i = 1;
  return (atM) => {
    while (i < route.length - 1 && along[i] < atM) {
      i += 1;
    }
    const span = along[i] - along[i - 1];
    const t = span > 0 ? Math.min(1, Math.max(0, (atM - along[i - 1]) / span)) : 0;
    const [lat1, lon1] = route[i - 1];
    const [lat2, lon2] = route[i];
    return [lat1 + t * (lat2 - lat1), lon1 + t * (lon2 - lon1)];
  };
}

/** A pass of the route counts as reached when the track ran most of the
 * route this many metres before it. */
const REACHED_M = 100;

/** The point `atM` metres along the route. */
function pointAlong(route: LatLon[], along: number[], atM: number): LatLon {
  return walkerAlong(route, along)(atM);
}

/**
 * Where the run stopped along the route, in metres: the last fix placed on
 * the route. A shape passes the same street twice, and a closed route ends
 * where it starts: of the passes near the last fix, the farthest along
 * whose last REACHED_M the track ran wins. A run that came all the way
 * round, or cut across and came home along the last street, stopped at the
 * end; a run stopped a few metres after the start stopped there. A last
 * fix off the route is placed at its nearest point.
 */
function stoppedAtM(
  route: LatLon[],
  along: number[],
  last: LatLon,
  plane: Plane,
  near: NearTrack,
): number {
  const passes = passesNear(route, along, last)
    .map((pass) => pass.alongM)
    .sort((a, b) => b - a);
  if (passes.length === 0) {
    return nearest(route, along, last).alongM;
  }
  const reached = passes.find((atM) => {
    let run = 0;
    let looked = 0;
    for (
      let backM = REDO_STEP_M;
      backM <= REACHED_M && backM <= atM;
      backM += REDO_STEP_M
    ) {
      looked += 1;
      const [x, y] = plane(pointAlong(route, along, atM - backM));
      if (near.near(x, y)) {
        run += 1;
      }
    }
    return looked > 0 && run * 2 > looked;
  });
  return reached ?? passes[passes.length - 1];
}

/**
 * Metres of the route not run: the route looked at every REDO_STEP_M, each
 * point farther than REDO_AWAY_M from the track missed, up to where the run
 * stopped. Stopping before the end misses nothing; «Keep running» is for
 * that. The walks of a route with the pen up are left out: the way from one
 * letter to the next draws nothing. 0 for a route or a track of no length.
 */
export function missedRouteM(
  route: LatLon[],
  track: LatLon[],
  walks: Walk[] = [],
): number {
  if (route.length < 2 || track.length === 0) {
    return 0;
  }
  const along = cumulative(route);
  const total = along[along.length - 1];
  if (total <= 0) {
    return 0;
  }
  const plane = planeAt(route[0]);
  const near = new NearTrack(track.map(plane));
  const stopM = stoppedAtM(route, along, track[track.length - 1], plane, near);
  const walked = walks.map(([from, to]) => [along[from] ?? 0, along[to] ?? total]);
  const pointAt = walkerAlong(route, along);
  let missed = 0;
  for (let atM = 0; atM < stopM; atM += REDO_STEP_M) {
    if (walked.some(([fromM, toM]) => atM >= fromM && atM <= toM)) {
      continue;
    }
    const [x, y] = plane(pointAt(atM));
    if (!near.near(x, y)) {
      missed += Math.min(REDO_STEP_M, stopM - atM);
    }
  }
  return missed;
}

/** What the end of a run knows of it. */
export type EndedRun = {
  /** The request of its route, while the app still has it; null without. */
  request: AnyRouteRequest | null;
  /** The sport it was run as. */
  activity: Activity;
  /** The planned route. */
  route: LatLon[];
  /** The walks of a route with the pen up. */
  walks?: Walk[];
  /** What was run, in order. */
  track: LatLon[];
};

/**
 * What «Redo better» opens «Draw» with, or null when it has no button: a
 * run on the water (no wrong turns there, and a swimmer's GPS jumps), a
 * route «Draw» cannot ask for again from its request (a picture, a photo,
 * a word «Draw» would refuse), a run without its request, or a run that
 * missed less than REDO_MISSED_M of its route.
 */
export function redoOf(run: EndedRun): Redo | null {
  const { request, activity } = run;
  if (request === null || isOnWater(activity)) {
    return null;
  }
  const again = againOfRequest(request);
  if (!drawsAgain(again, activity)) {
    return null;
  }
  if (missedRouteM(run.route, run.track, run.walks) < REDO_MISSED_M) {
    return null;
  }
  return { again, start: request.start };
}
