import type { Activity, Direction, LatLon, Walk } from "@shaperoute/shared-types";
import penUp from "@shaperoute/shared-types/fixtures/route-result-pen-up.json";
import swimming from "@shaperoute/shared-types/fixtures/route-result-swimming.json";

import levico from "../navigation/fixtures/levico-dead-end-u-turn.json";
import trento from "../navigation/fixtures/trento-fiere-crossings.json";
import { ANNOUNCE_M } from "../navigation/navigator";
import { cumulative, nearest } from "../navigation/progress";
import { announceMOf, RIDE_ANNOUNCE_M } from "../navigation/ride";
import { startsAnywhere } from "../navigation/startAnywhere";

/**
 * Runs made up on real routes, the same every time (TASK-370 part B1,
 * ADR-0314): the phone's navigator follows them in guideTrace.ts, and the
 * watch's Swift navigator follows the same fixes in its XCTest. Each shows
 * one thing the guidance does: the turns to the end, a detour and back, a
 * detour that gets back on the route further on, a gap in the fixes, poor
 * fixes, and a phone that gives no times; from part B2, a closed route
 * joined wherever the runner reaches it (TASK-273), and a word or a shape
 * in pieces with the pen up between them (TASK-198, TASK-223).
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
  /** A closed route joined wherever the runner reaches it (`startsAnywhere`). */
  anywhere: boolean;
  /** The stretches with the pen up, the word and the sport, for `startPen`. */
  walks: Walk[];
  word: string | null;
  activity: Activity | undefined;
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

/** The metres from `fromM` to `toM` along the route, every `stepM`. */
function stepsBetween(fromM: number, toM: number, stepM: number = STEP_M): number[] {
  const steps: number[] = [];
  for (let m = fromM; m < toM; m += stepM) {
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
    private readonly stepM: number = STEP_M,
  ) {}

  /** Along the route from `fromM` to `toM`. */
  on(fromM: number, toM: number, accuracyM: number = GOOD_M): this {
    for (const m of stepsBetween(fromM, toM, this.stepM)) {
      this.at(pointAt(this.route.points, this.along, m), accuracyM);
    }
    return this;
  }

  /** Round a closed route from `fromM` to `toM` metres, past its end and
   * on from its start; backwards when `toM` is less than `fromM`. */
  round(fromM: number, toM: number): this {
    const total = this.along[this.along.length - 1];
    const sign = toM >= fromM ? 1 : -1;
    for (const m of stepsBetween(0, Math.abs(toM - fromM), this.stepM)) {
      const at = (((fromM + sign * m) % total) + total) % total;
      this.at(pointAt(this.route.points, this.along, at), GOOD_M);
    }
    return this;
  }

  /** In a straight line from `from` to `to`, `from` left out. */
  line(from: LatLon, to: LatLon): this {
    const count = Math.max(1, Math.ceil(metresApart(from, to) / this.stepM));
    for (let i = 1; i <= count; i += 1) {
      const t = i / count;
      this.at(
        [from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])],
        GOOD_M,
      );
    }
    return this;
  }

  /** Beside the route, from `fromM` to `toM` along it, on one side and at
   * one distance all the way (`clearOffset`): a runner going along a
   * parallel street, who runs about as far as the route goes. */
  beside(fromM: number, toM: number): this {
    const steps = stepsBetween(fromM, toM, this.stepM);
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

/** Every scenario: the routes followed from their start (part B1), the
 * closed ones joined anywhere and the ones in pieces (part B2). */
export function guideScenarios(): Scenario[] {
  return [...fromStartScenarios(), ...loopScenarios(), ...penScenarios()];
}

/** The routes from their start, each run every way of part B1. */
function fromStartScenarios(): Scenario[] {
  return ROUTES.flatMap((route) => {
    const along = cumulative(route.points);
    const total = along[along.length - 1];
    const run = (timed = true) => new Run(route, along, timed);
    const scenario = (
      name: string,
      fixes: ScenarioFix[],
      announceM = ANNOUNCE_M,
    ): Scenario => ({
      name: `${route.name}-${name}`,
      points: route.points,
      directions: route.directions,
      announceM,
      anywhere: false,
      walks: [],
      word: null,
      activity: undefined,
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

/** Metres between two points on the plane tangent at the first. */
function metresApart([lat0, lon0]: LatLon, [lat, lon]: LatLon): number {
  return Math.hypot(
    (lon - lon0) * RAD * EARTH_RADIUS_M * Math.cos(lat0 * RAD),
    (lat - lat0) * RAD * EARTH_RADIUS_M,
  );
}

// A square block, 500 m a side, run anticlockwise from its south-west
// corner, as in startAnywhere.test.ts: east along Via Sud, north along Via
// Est, west along Via Nord, south along Via Ovest. A point every 50 m; once
// round is 2 km.
const ORIGIN: LatLon = [46.0, 11.0];
const M_PER_DEG_LAT = EARTH_RADIUS_M * RAD;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos(ORIGIN[0] * RAD);

/** The point `x` metres east and `y` north of the square's corner. */
function onPlane(x: number, y: number): LatLon {
  return [ORIGIN[0] + y / M_PER_DEG_LAT, ORIGIN[1] + x / M_PER_DEG_LON];
}

function onSquare(m: number): LatLon {
  const s = ((m % 2000) + 2000) % 2000;
  if (s <= 500) return onPlane(s, 0);
  if (s <= 1000) return onPlane(500, s - 500);
  if (s <= 1500) return onPlane(1500 - s, 500);
  return onPlane(0, 2000 - s);
}

function squareDirection(
  turn: Direction["turn"],
  distance_m: number,
  street: string,
): Direction {
  return {
    node: distance_m,
    point: onSquare(distance_m),
    distance_m,
    turn,
    angle_deg: turn === "left" ? -90 : 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
  };
}

const SQUARE: Route = {
  name: "square",
  points: Array.from({ length: 41 }, (_, i) => onSquare(i * 50)),
  directions: [
    squareDirection("depart", 0, "Via Sud"),
    squareDirection("left", 500, "Via Est"),
    squareDirection("left", 1000, "Via Nord"),
    squareDirection("left", 1500, "Via Ovest"),
  ],
};

/** The open-water swim of the shared example: a closed loop on a lake,
 * with no directions. */
const SWIM: Route = {
  name: "swim",
  points: swimming.points as LatLon[],
  directions: swimming.directions as Direction[],
};

/** A closed route run from where the runner reaches it: on it half-way
 * along a side, near its start, just before its end, just before a corner
 * (the turn there read with the departure), at a bike's pace (a fix every
 * 25 m: joined after fewer fixes than JOIN_FIXES would take on foot), the
 * wrong way round, and after coming to it from off it; and the swim joined
 * half-way round. */
function loopScenarios(): Scenario[] {
  const loop = (route: Route, name: string, fixes: ScenarioFix[]): Scenario => {
    if (!startsAnywhere(route.points, {})) {
      throw new Error(`${route.name} is not a closed route`);
    }
    return {
      name: `${route.name}-${name}`,
      points: route.points,
      directions: route.directions,
      announceM: ANNOUNCE_M,
      anywhere: true,
      walks: [],
      word: null,
      activity: undefined,
      fixes,
    };
  };
  const square = () => new Run(SQUARE, cumulative(SQUARE.points), true);
  const swimAlong = cumulative(SWIM.points);
  const swimTotal = swimAlong[swimAlong.length - 1];
  const swim = () => new Run(SWIM, swimAlong, true, 5);
  return [
    loop(SQUARE, "join-side", square().round(650, 650 + 2000).fixes),
    loop(SQUARE, "join-start", square().round(10, 10 + 2000).fixes),
    loop(SQUARE, "join-near-end", square().round(1980, 1980 + 2000).fixes),
    loop(SQUARE, "join-corner", square().round(488, 488 + 2000).fixes),
    loop(
      SQUARE,
      "join-fast",
      new Run(SQUARE, cumulative(SQUARE.points), true, 25).round(650, 650 + 2000).fixes,
    ),
    loop(SQUARE, "join-against", square().round(800, 500).fixes),
    loop(
      SQUARE,
      "join-from-off",
      square()
        .line(onPlane(760, 200), onPlane(700, 200))
        .line(onPlane(700, 200), onPlane(500, 200))
        .round(700, 700 + 2000).fixes,
    ),
    loop(SWIM, "join-half", swim().round(swimTotal / 2, swimTotal * 1.5).fixes),
  ];
}

/** The word «IO» of the shared example, with the pen up from the end of
 * the I to the start of the O: on foot, without the word (a shape in two
 * pieces), by bike and on the water. A fix every 25 m: the route is 5.5 km. */
function penScenarios(): Scenario[] {
  const route: Route = {
    name: "pen",
    points: penUp.points as LatLon[],
    directions: penUp.directions as Direction[],
  };
  const along = cumulative(route.points);
  const total = along[along.length - 1];
  const walks = penUp.walks as Walk[];
  const pen = (name: string, word: string | null, activity?: Activity): Scenario => ({
    name: `pen-${name}`,
    points: route.points,
    directions: route.directions,
    announceM: announceMOf(activity),
    anywhere: false,
    walks,
    word,
    activity,
    fixes: new Run(route, along, true, 25).on(0, total).on(total, total).fixes,
  });
  return [
    pen("word", penUp.word),
    pen("parts", null),
    pen("ride", penUp.word, "cycling"),
    pen("paddle", null, "paddling"),
  ];
}
