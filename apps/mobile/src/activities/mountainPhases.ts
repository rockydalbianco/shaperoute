import { metresBetween } from "../map/coordinates";
import { CLIMB_STEP_M } from "../navigation/runMetrics";
import { stepAt, type Track } from "../navigation/trackRecorder";
import { DESCENT_MIN_DROP_M, droppedM, isLift, type Leg, legs } from "./snowDay";

/**
 * A day in the mountains read as its phases (TASK-415 part B, ADR-0344):
 * the climbs on skins, the descents on skis, the lifts, and the changeovers
 * between them, when the skins come off at the top and go on again at the
 * bottom. With each climb its VAM, the metres climbed in an hour of moving.
 * Built over the stretches of a day on the snow (`snowDay.ts`), with a
 * wider turn, so the bumps of a climb make no phases. Not of ski touring
 * alone: snowshoes and hikes can read their days the same way. Nothing
 * leaves the phone. The thresholds are a first guess, to tune on a real
 * tour (part E).
 */

/** A height must move this much before the way a tour goes turns: wider
 * than a ski day's, so a climb's bumps stay inside it. */
export const TOUR_TURN_M = 20;
/** A changeover: at least this long, */
export const CHANGE_MIN_MS = 90_000;
/** slower than this, in metres a second, */
export const CHANGE_MAX_MPS = 0.5;
/** and within this many metres of height from the turn it sits on. */
export const CHANGE_NEAR_M = 50;
/** A step slower than this is standing, not moving: the VAM leaves it out. */
export const MOVING_MIN_MPS = 0.2;
/** The VAM of the moment: the metres climbed over this much of the climb, */
export const LIVE_VAM_MS = 300_000;
/** once the climb has gone on at least this long. */
export const LIVE_VAM_MIN_MS = 120_000;

export type PhaseKind = "climb" | "descent" | "lift";

export type MountainPhase = {
  kind: PhaseKind;
  /** Counts the climbs, the descents and the lifts apart, from 1. */
  n: number;
  leg: Leg;
  /** When it began and ended, on the phone's clock. */
  startMs: number;
  endMs: number;
  /** Its time on the move: pauses and standing left out. */
  ms: number;
  metres: number;
  /** The metres a climb or a lift went up, or a descent came down. */
  heightM: number;
  /** A climb's metres up an hour of moving; null for the others, and for
   * a climb too short to say. */
  vamMph: number | null;
};

/** A changeover: the skins come off after a climb, go on before one. */
export type Changeover = {
  kind: "off" | "on";
  /** When it began, on the phone's clock, and how long it took. */
  atMs: number;
  ms: number;
};

export type MountainTour = {
  phases: MountainPhase[];
  changes: Changeover[];
  /** The metres climbed and come down on the climbs and the descents. */
  climbM: number;
  lossM: number;
  /** The time on the move of the climbs and of the descents. */
  climbMs: number;
  descentMs: number;
  /** The VAM of all the climbs together; null without a climb. */
  vamMph: number | null;
  /** The highest the tour went. */
  topM: number;
};

/** A climb shorter than this on the move gives no VAM. */
const VAM_MIN_MS = 60_000;

function heightOf(track: Track, index: number): number | null {
  const height = track.fixes[index]?.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height)
    ? null
    : height;
}

/** Metres up an hour, from metres and milliseconds. */
function perHour(metres: number, ms: number): number {
  return (metres / ms) * 3_600_000;
}

/** The metres a stretch went up (`up`) or down, in steps of at least
 * CLIMB_STEP_M, as `runMetrics.climbM` counts them. */
function steppedM(track: Track, leg: Leg, up: boolean): number {
  let from: number | null = null;
  let total = 0;
  for (let index = leg.from; index <= leg.to; index += 1) {
    const height = heightOf(track, index);
    if (height === null) {
      continue;
    }
    if (from === null) {
      from = height;
      continue;
    }
    const rise = height - from;
    if (Math.abs(rise) >= CLIMB_STEP_M) {
      if (up ? rise > 0 : rise < 0) {
        total += Math.abs(rise);
      }
      from = height;
    }
  }
  return total;
}

/** A step's metres a second on the phone's clock, pauses in: standing
 * through a pause is standing all the same. */
function wallSpeed(track: Track, index: number): number {
  const from = track.fixes[index - 1];
  const to = track.fixes[index];
  const ms = to.timeMs - from.timeMs;
  const metres = to.gap ? 0 : metresBetween(from.point, to.point);
  return ms > 0 ? metres / (ms / 1000) : Infinity;
}

/** The metres and the time on the move of a stretch: the steps slower than
 * MOVING_MIN_MPS, and the pauses, left out. */
function moving(track: Track, leg: Leg): { metres: number; ms: number } {
  let metres = 0;
  let ms = 0;
  for (let index = leg.from + 1; index <= leg.to; index += 1) {
    const step = stepAt(track, index);
    metres += step.metres;
    if (step.ms > 0 && step.metres / (step.ms / 1000) >= MOVING_MIN_MPS) {
      ms += step.ms;
    }
  }
  return { metres, ms };
}

type Read = { kind: PhaseKind | null; leg: Leg };

/** The stretches of `track` as phases, in their order: a stretch that is
 * none (a flat, a short drop) joins the phase before it, or the next one
 * at the start; phases of a kind side by side become one. */
function phaseLegs(track: Track): { kind: PhaseKind; leg: Leg }[] {
  const read: Read[] = legs(track, TOUR_TURN_M).map(({ leg, up }) => ({
    leg,
    kind: up
      ? isLift(track, leg)
        ? "lift"
        : "climb"
      : droppedM(track, leg, TOUR_TURN_M) >= DESCENT_MIN_DROP_M
        ? "descent"
        : null,
  }));
  const found: { kind: PhaseKind; leg: Leg }[] = [];
  // Where the first phase starts: the stretches before it are its own.
  let first: number | null = null;
  for (const { kind, leg } of read) {
    const last = found[found.length - 1];
    if (kind === null) {
      if (last !== undefined) {
        last.leg = { from: last.leg.from, to: leg.to };
      } else {
        first = first ?? leg.from;
      }
    } else if (last !== undefined && last.kind === kind) {
      last.leg = { from: last.leg.from, to: leg.to };
    } else {
      found.push({ kind, leg: { from: first ?? leg.from, to: leg.to } });
      first = null;
    }
  }
  return found;
}

/** The changeover at the turn `at`, between a climb and what is not: the
 * still fixes around it, near its height. Null when too short. */
function changeAt(track: Track, at: number, kind: "off" | "on"): Changeover | null {
  const turn = heightOf(track, at);
  const near = (index: number): boolean => {
    const height = heightOf(track, index);
    return turn === null || height === null || Math.abs(height - turn) <= CHANGE_NEAR_M;
  };
  let first = at;
  while (first > 0 && wallSpeed(track, first) < CHANGE_MAX_MPS && near(first - 1)) {
    first -= 1;
  }
  let last = at;
  while (
    last + 1 < track.fixes.length &&
    wallSpeed(track, last + 1) < CHANGE_MAX_MPS &&
    near(last + 1)
  ) {
    last += 1;
  }
  const ms = track.fixes[last].timeMs - track.fixes[first].timeMs;
  return ms >= CHANGE_MIN_MS ? { kind, atMs: track.fixes[first].timeMs, ms } : null;
}

/** The tour of `track`: its phases, its changeovers and its numbers. Null
 * when the phone gave no height, and there are no phases to tell. */
export function mountainTour(track: Track): MountainTour | null {
  let topM: number | null = null;
  track.fixes.forEach((_, index) => {
    const height = heightOf(track, index);
    if (height !== null && (topM === null || height > topM)) {
      topM = height;
    }
  });
  if (topM === null) {
    return null;
  }
  const counts: Record<PhaseKind, number> = { climb: 0, descent: 0, lift: 0 };
  const phases: MountainPhase[] = phaseLegs(track).map(({ kind, leg }) => {
    counts[kind] += 1;
    const { metres, ms } = moving(track, leg);
    const heightM =
      kind === "descent"
        ? steppedM(track, leg, false)
        : kind === "climb"
          ? steppedM(track, leg, true)
          : Math.max(
              0,
              (heightOf(track, leg.to) ?? 0) - (heightOf(track, leg.from) ?? 0),
            );
    return {
      kind,
      n: counts[kind],
      leg,
      startMs: track.fixes[leg.from].timeMs,
      endMs: track.fixes[leg.to].timeMs,
      ms,
      metres,
      heightM,
      vamMph: kind === "climb" && ms >= VAM_MIN_MS ? perHour(heightM, ms) : null,
    };
  });
  const changes: Changeover[] = [];
  phases.slice(1).forEach((phase, at) => {
    const before = phases[at];
    const kind = before.kind === "climb" ? "off" : phase.kind === "climb" ? "on" : null;
    const change = kind === null ? null : changeAt(track, phase.leg.from, kind);
    if (change !== null) {
      changes.push(change);
    }
  });
  const climbs = phases.filter((phase) => phase.kind === "climb");
  const descents = phases.filter((phase) => phase.kind === "descent");
  const sum = (list: MountainPhase[], of: (phase: MountainPhase) => number) =>
    list.reduce((total, phase) => total + of(phase), 0);
  const climbM = sum(climbs, (phase) => phase.heightM);
  const climbMs = sum(climbs, (phase) => phase.ms);
  return {
    phases,
    changes,
    climbM,
    lossM: sum(descents, (phase) => phase.heightM),
    climbMs,
    descentMs: sum(descents, (phase) => phase.ms),
    vamMph: climbMs >= VAM_MIN_MS ? perHour(climbM, climbMs) : null,
    topM,
  };
}

/** Where the tour is now: the phase it is in, a changeover while it stands
 * at a turn, or null before it has gone up or down far enough. */
export type TourNow = PhaseKind | "change" | null;

/**
 * The phase of `tour` at `nowMs`: a changeover once the last fix is
 * CHANGE_MIN_MS old, or the track is paused, as the skins come off or go
 * on at a turn; the last phase otherwise.
 */
export function tourNow(
  track: Track,
  tour: MountainTour | null,
  nowMs: number,
  paused: boolean,
): TourNow {
  const last = tour?.phases[tour.phases.length - 1];
  if (tour === null || last === undefined) {
    return null;
  }
  const fix = track.fixes[track.fixes.length - 1];
  const still = paused || nowMs - fix.timeMs >= CHANGE_MIN_MS;
  if (still) {
    // At a turn: the last fix is the top of a climb, or the bottom of a
    // descent, within the height of a changeover.
    const height = heightOf(track, track.fixes.length - 1);
    const turn = heightOf(track, last.leg.to);
    if (height === null || turn === null || Math.abs(height - turn) <= CHANGE_NEAR_M) {
      return "change";
    }
  }
  return last.kind;
}

/**
 * The VAM of the moment: the metres climbed over the last LIVE_VAM_MS of
 * the track, in metres an hour of moving; null when the tour is not on a
 * climb, or has not climbed for LIVE_VAM_MIN_MS yet.
 */
export function liveVam(
  track: Track,
  tour: MountainTour | null,
  nowMs: number,
): number | null {
  const last = tour?.phases[tour.phases.length - 1];
  const lastFix = track.fixes[track.fixes.length - 1];
  if (last === undefined || last.kind !== "climb" || lastFix === undefined) {
    return null;
  }
  if (nowMs - last.startMs < LIVE_VAM_MIN_MS) {
    return null;
  }
  let from = track.fixes.length - 1;
  while (from > 0 && track.fixes[from - 1].timeMs >= lastFix.timeMs - LIVE_VAM_MS) {
    from -= 1;
  }
  const leg = { from, to: track.fixes.length - 1 };
  const { ms } = moving(track, leg);
  return ms >= VAM_MIN_MS ? perHour(steppedM(track, leg, true), ms) : null;
}
