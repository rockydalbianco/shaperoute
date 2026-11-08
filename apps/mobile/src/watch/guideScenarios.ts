import type { Direction, LatLon } from "@shaperoute/shared-types";

import levico from "../navigation/fixtures/levico-dead-end-u-turn.json";
import trento from "../navigation/fixtures/trento-fiere-crossings.json";
import { ANNOUNCE_M } from "../navigation/navigator";
import { cumulative, nearest } from "../navigation/progress";
import { RIDE_ANNOUNCE_M } from "../navigation/ride";

/**
 * Runs made up on real routes, the same every time (TASK-370 part B1,
 * ADR-0314): the phone's navigator follows them in guideTrace.ts, and the
 * watch's Swift navigator follows the same fixes in its XCTest. Each shows
 * one thing the guidance does: the turns to the end, a detour and back, a
 * detour that gets back on the route further on, a gap in the fixes, poor
 * fixes, and a phone that gives no times.
 */

/** A fix as the phone gives it, with what the navigator reads of it. */
export type ScenarioFix = {
  fix: LatLon;
  accuracyM: number | null;
  timeMs: number | null;
};

export type Scenario = {
  name: string;
  points: LatLon[];
  directions: Direction[];
  announceM: number;
  fixes: ScenarioFix[];
};

/** A fix every this many metres along the route, this many ms apart: a
 * runner at 3.3 m/s. */
const STEP_M = 10;
const STEP_MS = 3000;
/** The accuracy of a good fix, and of a poor one (POOR_FIX_M is 40). */
const GOOD_M = 5;
const POOR_M = 80;
/** How far off the route a detour runs: OFF_ROUTE_M is 40. Where the
 * route passes there again, further out (`clear`). */
const DETOUR_M = 70;
/** A fix of a detour is this far from every part of the route: a shape
 * passes the same streets again, and a detour must not land on them. */
const CLEAR_M = 60;
/** How far along the route a detour runs before it gets back on it:
 * beyond AHEAD_M (300), where only the detour's window finds it, and
 * beyond what that window would be with less than REJOIN_PER_M (2) for
 * each metre run off the route. */
const DETOUR_AHEAD_M = 700;
/** A gap longer than GAP_MS (20 s). */
const GAP_STEP_MS = 35_000;

type Route = { name: string; points: LatLon[]; directions: Direction[] };

const ROUTES: readonly Route[] = [
  {
    name: "levico",
    points: levico.points as LatLon[],
    directions: levico.directions as Direction[],
  },
  {
    name: "trento",
    points: trento.points as LatLon[],
    directions: trento.directions as Direction[],
  },
];

const EARTH_RADIUS_M = 6_371_000;
const RAD = Math.PI / 180;

/** Fixes in the scenario files have 8 decimals (about a millimetre), and
 * the navigators read them as written: the phone and the watch get the
 * same numbers. */
function rounded([lat, lon]: LatLon): LatLon {
  return [Number(lat.toFixed(8)), Number(lon.toFixed(8))];
}

/** The point `alongM` metres along the route. */
function pointAt(points: LatLon[], along: number[], alongM: number): LatLon {
  for (let i = 1; i < points.length; i += 1) {
    if (along[i] >= alongM) {
      const length = along[i] - along[i - 1];
      const t = length > 0 ? (alongM - along[i - 1]) / length : 0;
      const [lat0, lon0] = points[i - 1];
      const [lat1, lon1] = points[i];
      return [lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0)];
    }
  }
  return points[points.length - 1];
}

/** `point` moved `leftM` metres to the left of the route's way there. */
function leftOf(
  points: LatLon[],
  along: number[],
  alongM: number,
  leftM: number,
): LatLon {
  const total = along[along.length - 1];
  const [lat0, lon0] = pointAt(points, along, Math.max(0, alongM - 5));
  const [lat1, lon1] = pointAt(points, along, Math.min(total, alongM + 5));
  const east = (lon1 - lon0) * RAD * EARTH_RADIUS_M * Math.cos(lat0 * RAD);
  const north = (lat1 - lat0) * RAD * EARTH_RADIUS_M;
  const length = Math.hypot(east, north) || 1;
  // Left of the way (east, north) is (-north, east).
  const [lat, lon] = pointAt(points, along, alongM);
  const dNorth = (east / length) * leftM;
  const dEast = (-north / length) * leftM;
  return [
    lat + dNorth / (RAD * EARTH_RADIUS_M),
    lon + dEast / (RAD * EARTH_RADIUS_M * Math.cos(lat * RAD)),
  ];
}

/** The metres from `fromM` to `toM` along the route, every STEP_M. */
function stepsBetween(fromM: number, toM: number): number[] {
  const steps: number[] = [];
  for (let m = fromM; m < toM; m += STEP_M) {
    steps.push(m);
  }
  steps.push(toM);
  return steps;
}

/** A run that writes its fixes one after the other, STEP_MS apart. */
class Run {
  readonly fixes: ScenarioFix[] = [];
  private timeMs = 0;

  constructor(
    private readonly route: Route,
    private readonly along: number[],
    private readonly timed: boolean,
  ) {}

  /** Along the route from `fromM` to `toM`. */
  on(fromM: number, toM: number, accuracyM: number = GOOD_M): this {
    for (const m of stepsBetween(fromM, toM)) {
      this.at(pointAt(this.route.points, this.along, m), accuracyM);
    }
    return this;
  }

  /** Beside the route, from `fromM` to `toM` along it, on one side and at
   * one distance all the way (`clearOffset`): a runner going along a
   * parallel street, who runs about as far as the route goes. */
  beside(fromM: number, toM: number): this {
    const steps = stepsBetween(fromM, toM);
    const leftM = this.clearOffset(steps);
    for (const m of steps) {
      this.at(leftOf(this.route.points, this.along, m, leftM), GOOD_M);
    }
    return this;
  }

  /** `count` fixes standing still beside the route at `alongM`. */
  standBeside(alongM: number, count: number): this {
    const fix = leftOf(
      this.route.points,
      this.along,
      alongM,
      this.clearOffset([alongM]),
    );
    for (let i = 0; i < count; i += 1) {
      this.at(fix, GOOD_M);
    }
    return this;
  }

  /** Metres to the left (to the right when negative), the first of a few
   * at which the route at each of `steps` metres along it is CLEAR_M from
   * every part of it. */
  private clearOffset(steps: number[]): number {
    for (const outM of [DETOUR_M, 2 * DETOUR_M, 4 * DETOUR_M, 8 * DETOUR_M]) {
      for (const leftM of [outM, -outM]) {
        const clear = steps.every(
          (m) =>
            nearest(
              this.route.points,
              this.along,
              leftOf(this.route.points, this.along, m, leftM),
            ).offM >= CLEAR_M,
        );
        if (clear) {
          return leftM;
        }
      }
    }
    throw new Error(`No clear way beside ${this.route.name} at ${steps[0]} m`);
  }

  /** Off the route by `leftM`, even where it is near another part of it:
   * a poor fix, which must count for nothing wherever it is. */
  stray(alongM: number, leftM: number, accuracyM: number): this {
    this.at(leftOf(this.route.points, this.along, alongM, leftM), accuracyM);
    return this;
  }

  /** No fix for `ms` before the next one. */
  gap(ms: number): this {
    this.timeMs += ms - STEP_MS;
    return this;
  }

  private at(fix: LatLon, accuracyM: number): void {
    this.fixes.push({
      fix: rounded(fix),
      accuracyM: this.timed ? accuracyM : null,
      timeMs: this.timed ? this.timeMs : null,
    });
    this.timeMs += STEP_MS;
  }
}

/** Every scenario on every route. */
export function guideScenarios(): Scenario[] {
  return ROUTES.flatMap((route) => {
    const along = cumulative(route.points);
    const total = along[along.length - 1];
    const run = (timed = true) => new Run(route, along, timed);
    const scenario = (name: string, fixes: ScenarioFix[], announceM = ANNOUNCE_M) => ({
      name: `${route.name}-${name}`,
      points: route.points,
      directions: route.directions,
      announceM,
      fixes,
    });
    const detourAt = Math.round(total * 0.4);
    const aheadAt = Math.round(total * 0.2);
    const gapAt = Math.round(total * 0.3);
    const gapTo = Math.round(total * 0.7);
    return [
      scenario("straight", run().on(0, total).on(total, total).fixes),
      scenario("bike", run().on(0, total).on(total, total).fixes, RIDE_ANNOUNCE_M),
      scenario(
        "detour",
        run()
          .on(0, detourAt)
          .standBeside(detourAt, 6)
          .on(detourAt, total)
          .on(total, total).fixes,
      ),
      scenario(
        "detour-ahead",
        run()
          .on(0, aheadAt)
          .beside(aheadAt, aheadAt + DETOUR_AHEAD_M)
          .on(aheadAt + DETOUR_AHEAD_M, total)
          .on(total, total).fixes,
      ),
      scenario(
        "gap",
        run().on(0, gapAt).gap(GAP_STEP_MS).on(gapTo, total).on(total, total).fixes,
      ),
      scenario("poor", poorRun(run(), total).fixes),
      scenario(
        "no-times",
        run(false)
          .on(0, detourAt)
          .standBeside(detourAt, 4)
          .on(detourAt, total)
          .on(total, total).fixes,
      ),
    ];
  });
}

/** A run along the route where every fourth fix is poor, off the route or
 * on it, which the navigator must not read as off the route nor as ahead. */
function poorRun(run: Run, total: number): Run {
  for (let m = 0; m < total; m += STEP_M * 4) {
    const end = Math.min(total, m + STEP_M * 3);
    run.on(m, end);
    if ((m / (STEP_M * 4)) % 2 === 0) {
      run.stray(end, 100, POOR_M);
    } else {
      run.on(end, end, POOR_M);
    }
  }
  return run.on(total, total).on(total, total);
}
