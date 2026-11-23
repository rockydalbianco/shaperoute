import { AUTO_PAUSE_AFTER_MS } from "./runControl";

/**
 * The map turned where the phone points (TASK-422, ADR-0350): the «Compass»
 * page of the run. Pure functions: which direction the map takes, from the
 * phone's compass or from the line run, and when a change is worth turning
 * the map for. Degrees are clockwise from north.
 */

/** A reading of the phone's compass, as expo-location gives it. */
export type CompassReading = {
  /** Degrees from true north; -1 when the phone cannot tell. */
  trueHeading: number;
  /** Degrees from magnetic north. */
  magHeading: number;
  /** How well the compass is calibrated, 0 (not at all) to 3 (well). */
  accuracy: number;
  /** When it was read, in milliseconds. */
  atMs: number;
};

/** A compass calibrated at least this much (medium, 0–3) is trusted while
 * running; under it the line run says better where the runner faces. */
export const COMPASS_OK_ACCURACY = 2;

/** A fix this recent means the runner is moving: the auto-pause's wait,
 * so the two agree on what standing still is. */
export const MOVING_FIX_MS = AUTO_PAUSE_AFTER_MS;

/** The map turns for a change of at least this much… */
export const TURN_MIN_DEG = 4;
/** …and not more often than this: a compass in a running hand jitters. */
export const TURN_EVERY_MS = 400;

/** A reading is kept when the needle moved this much since the kept one… */
export const COMPASS_STEP_DEG = 2;
/** …and not more often than this: the screen is not drawn for every tenth
 * of a degree. */
export const COMPASS_EVERY_MS = 250;

export type HeadingSource = "compass" | "track";

export type HeadingInput = {
  /** The compass's last reading, or null without one. */
  compass: CompassReading | null;
  /** Where the line run points (`headingDeg`), or null before 10 m. */
  trackDeg: number | null;
  /** When the last fix came, or null before the first. */
  lastFixMs: number | null;
  nowMs: number;
};

/** `deg` brought into [0, 360). */
export function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** The smallest angle between two headings, 0 to 180. */
export function degBetween(a: number, b: number): number {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return diff > 180 ? 360 - diff : diff;
}

/** Where the compass points: true north when the phone knows it, else
 * magnetic north. */
export function compassDeg(reading: CompassReading): number {
  const deg = reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading;
  return normalizeDeg(deg);
}

/** Whether a reading is calibrated enough to be trusted while running. */
export function compassReliable(reading: CompassReading): boolean {
  return reading.accuracy >= COMPASS_OK_ACCURACY;
}

/** Whether the runner is moving: a fix came lately. */
export function isMoving(lastFixMs: number | null, nowMs: number): boolean {
  return lastFixMs !== null && nowMs - lastFixMs <= MOVING_FIX_MS;
}

/**
 * The direction the map puts up, and where it comes from. The compass
 * standing still, always: the line run says where the runner came from,
 * not where they face. Running, the compass while it is calibrated; a poor
 * compass in a moving hand gives way to the line run, which is where the
 * runner is going. Null when neither says anything: the map stays as it is.
 */
export function mapHeading({
  compass,
  trackDeg,
  lastFixMs,
  nowMs,
}: HeadingInput): { deg: number; source: HeadingSource } | null {
  const moving = isMoving(lastFixMs, nowMs) && trackDeg !== null;
  if (compass !== null && (!moving || compassReliable(compass))) {
    return { deg: compassDeg(compass), source: "compass" };
  }
  if (moving && trackDeg !== null) {
    return { deg: normalizeDeg(trackDeg), source: "track" };
  }
  if (compass !== null) {
    return { deg: compassDeg(compass), source: "compass" };
  }
  return null;
}

/** A turn the map was asked, and when. */
export type Turned = { deg: number; atMs: number };

/**
 * Whether the map is turned to `deg` now: the first time always, then for
 * a change of TURN_MIN_DEG or more, once TURN_EVERY_MS have passed since
 * the last turn.
 */
export function shouldTurn(last: Turned | null, deg: number, nowMs: number): boolean {
  if (last === null) {
    return true;
  }
  return (
    degBetween(last.deg, deg) >= TURN_MIN_DEG && nowMs - last.atMs >= TURN_EVERY_MS
  );
}

/**
 * Whether a new reading replaces the kept one: the first always, then when
 * the needle moved COMPASS_STEP_DEG or the calibration changed, once
 * COMPASS_EVERY_MS have passed.
 */
export function keepReading(
  kept: CompassReading | null,
  next: CompassReading,
): boolean {
  if (kept === null) {
    return true;
  }
  if (next.atMs - kept.atMs < COMPASS_EVERY_MS) {
    return false;
  }
  return (
    kept.accuracy !== next.accuracy ||
    degBetween(compassDeg(kept), compassDeg(next)) >= COMPASS_STEP_DEG
  );
}
