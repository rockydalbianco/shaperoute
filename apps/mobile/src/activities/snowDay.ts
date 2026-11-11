import { stepAt, type Track } from "../navigation/trackRecorder";

/**
 * A day of alpine skiing, read from its track on the phone (TASK-375 part
 * C, ADR-0319): the descents, the kilometres and the metres skied down, the
 * top and the average speed, and the lifts. A lift is a stretch that climbs
 * at a steady speed for more than a minute; what lies between two lifts is
 * skied, and it is a descent when it drops enough. Nothing leaves the
 * phone: the names of the lifts and the pistes are the server's (part D).
 * The thresholds are a first guess, to tune on real tracks before the
 * season.
 */

/** A height must move this much before the way it goes turns. */
export const TURN_M = 10;
/** A lift climbs for at least a minute, */
export const LIFT_MIN_MS = 60_000;
/** at least this fast, in metres up a second: faster than a skier walking
 * or skinning up, slower than any chairlift, */
export const LIFT_MIN_RISE_MPS = 0.3;
/** and steady: this share of its steps at a speed near its usual one. */
export const LIFT_STEADY_SHARE = 0.6;
/** What is skied between two lifts is a descent when it drops this much. */
export const DESCENT_MIN_DROP_M = 30;
/** The top speed is held at least this long, so one jump of the GPS does
 * not make it, */
export const TOP_SPEED_MS = 5_000;
/** and a speed over this one is the GPS, not a skier. */
export const MAX_SKI_MPS = 200 / 3.6;

/** A stretch of the track, from the fix `from` to the fix `to`. */
export type Leg = { from: number; to: number };

export type SnowDay = {
  /** How many descents; null when the phone gave no height. */
  descents: number | null;
  /** The metres of the descents, or of the whole day without heights. */
  skiedM: number;
  /** Their milliseconds: the time the calories count (TASK-424 part C2). */
  skiedMs: number;
  /** The metres skied down; null without heights. */
  verticalM: number | null;
  /** In metres a second; null before any descent has its seconds. */
  topMps: number | null;
  averageMps: number | null;
  /** The lifts, fix to fix: dashed on the map. Null without heights. */
  lifts: Leg[] | null;
};

function heightOf(track: Track, index: number): number | null {
  const height = track.fixes[index]?.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height)
    ? null
    : height;
}

/** The track as it climbs and drops, from turn to turn: a turn is where
 * the height, after going one way, has gone back the other by `TURN_M`.
 * Fixes without a height belong to the stretch they are in. */
function legs(track: Track): { leg: Leg; up: boolean }[] {
  const found: { leg: Leg; up: boolean }[] = [];
  let start = -1;
  let extreme = -1;
  let up: boolean | null = null;
  track.fixes.forEach((_, index) => {
    const height = heightOf(track, index);
    if (height === null) {
      return;
    }
    if (start === -1) {
      start = index;
      extreme = index;
      return;
    }
    const top = heightOf(track, extreme) as number;
    if (up === null) {
      // The first way the day goes, once it has gone far enough.
      if (Math.abs(height - top) >= TURN_M) {
        up = height > top;
        extreme = index;
      }
      return;
    }
    if (up ? height >= top : height <= top) {
      extreme = index;
    } else if (Math.abs(height - top) >= TURN_M) {
      found.push({ leg: { from: start, to: extreme }, up });
      start = extreme;
      extreme = index;
      up = !up;
    }
  });
  if (start !== -1) {
    found.push({ leg: { from: start, to: extreme }, up: up ?? false });
  }
  return found;
}

/** The metres and the time of a stretch, pauses left out. */
function metresAndMs(track: Track, leg: Leg): { metres: number; ms: number } {
  let metres = 0;
  let ms = 0;
  for (let index = leg.from + 1; index <= leg.to; index += 1) {
    const step = stepAt(track, index);
    metres += step.metres;
    ms += step.ms;
  }
  return { metres, ms };
}

/** Whether a climbing stretch is a lift: long, fast up and steady. */
function isLift(track: Track, leg: Leg): boolean {
  const { ms } = metresAndMs(track, leg);
  const rise = (heightOf(track, leg.to) ?? 0) - (heightOf(track, leg.from) ?? 0);
  if (ms < LIFT_MIN_MS || rise / (ms / 1000) < LIFT_MIN_RISE_MPS) {
    return false;
  }
  const speeds: number[] = [];
  for (let index = leg.from + 1; index <= leg.to; index += 1) {
    const step = stepAt(track, index);
    if (step.ms > 0) {
      speeds.push(step.metres / (step.ms / 1000));
    }
  }
  if (speeds.length === 0) {
    return false;
  }
  const usual = [...speeds].sort((a, b) => a - b)[Math.floor(speeds.length / 2)];
  const near = speeds.filter((speed) => speed >= usual * 0.5 && speed <= usual * 1.5);
  return near.length / speeds.length >= LIFT_STEADY_SHARE;
}

/** The metres dropped along a stretch, from turn to turn as `legs` reads
 * them: the climbs between take nothing away. */
function droppedM(track: Track, leg: Leg): number {
  let dropped = 0;
  let from: number | null = null;
  for (let index = leg.from; index <= leg.to; index += 1) {
    const height = heightOf(track, index);
    if (height === null) {
      continue;
    }
    if (from === null || height > from) {
      from = height;
    } else if (from - height >= TURN_M) {
      dropped += from - height;
      from = height;
    }
  }
  return dropped;
}

/** The fastest `TOP_SPEED_MS` of a stretch, in metres a second. */
function topOf(track: Track, leg: Leg): number | null {
  let top: number | null = null;
  let back = leg.from;
  let metres = 0;
  let ms = 0;
  for (let index = leg.from + 1; index <= leg.to; index += 1) {
    const step = stepAt(track, index);
    metres += step.metres;
    ms += step.ms;
    while (back + 1 < index) {
      const first = stepAt(track, back + 1);
      if (ms - first.ms < TOP_SPEED_MS) {
        break;
      }
      metres -= first.metres;
      ms -= first.ms;
      back += 1;
    }
    if (ms >= TOP_SPEED_MS) {
      const speed = metres / (ms / 1000);
      if (speed <= MAX_SKI_MPS && (top === null || speed > top)) {
        top = speed;
      }
    }
  }
  return top;
}

/** The lifts and the descents of `track`, in their order, and whether the
 * phone gave any height. */
function liftsAndDescents(track: Track): {
  heights: boolean;
  lifts: Leg[];
  descents: Leg[];
} {
  const last = track.fixes.length - 1;
  const read = legs(track);
  const heights = track.fixes.some((_, index) => heightOf(track, index) !== null);
  const lifts = read
    .filter(({ up, leg }) => up && isLift(track, leg))
    .map(({ leg }) => leg);
  // What lies between two lifts, and before the first and after the last.
  const skied: Leg[] = [];
  let from = 0;
  for (const lift of lifts) {
    if (lift.from > from) {
      skied.push({ from, to: lift.from });
    }
    from = lift.to;
  }
  if (last > from) {
    skied.push({ from, to: last });
  }
  const descents = heights
    ? skied.filter((leg) => droppedM(track, leg) >= DESCENT_MIN_DROP_M)
    : last > 0
      ? [{ from: 0, to: last }]
      : [];
  return { heights, lifts, descents };
}

/** The day of `track`: its descents, its lifts and its numbers. */
export function snowDay(track: Track): SnowDay {
  const { heights, lifts, descents } = liftsAndDescents(track);
  let skiedM = 0;
  let skiedMs = 0;
  let verticalM = 0;
  let topMps: number | null = null;
  for (const leg of descents) {
    const { metres, ms } = metresAndMs(track, leg);
    skiedM += metres;
    skiedMs += ms;
    verticalM += droppedM(track, leg);
    const top = topOf(track, leg);
    if (top !== null && (topMps === null || top > topMps)) {
      topMps = top;
    }
  }
  return {
    descents: heights ? descents.length : null,
    skiedM,
    skiedMs,
    verticalM: heights ? verticalM : null,
    topMps,
    averageMps: skiedMs > 0 ? skiedM / (skiedMs / 1000) : null,
    lifts: heights ? lifts : null,
  };
}

/**
 * A lift or a descent of the day, with its own numbers (TASK-429 part B,
 * ADR-0357): what «Runs» shows, one after the other, and what the map
 * numbers. `n` counts the lifts and the descents apart, from 1.
 */
export type SnowPart = {
  kind: "lift" | "descent";
  n: number;
  leg: Leg;
  /** When it began and ended, on the phone's clock. */
  startMs: number;
  endMs: number;
  /** Its time, pauses left out, and its metres. */
  ms: number;
  metres: number;
  /** The metres a lift climbed, or a descent dropped. */
  heightM: number;
  /** A descent's top speed, in metres a second; null for a lift, and for
   * a descent too short to say. */
  topMps: number | null;
};

/** The lifts and the descents of `track` in the order of the day; null
 * when the phone gave no height, and the day has none to tell apart. */
export function snowParts(track: Track): SnowPart[] | null {
  const { heights, lifts, descents } = liftsAndDescents(track);
  if (!heights) {
    return null;
  }
  const parts: SnowPart[] = [
    ...lifts.map((leg, at) => {
      const { metres, ms } = metresAndMs(track, leg);
      const rise = (heightOf(track, leg.to) ?? 0) - (heightOf(track, leg.from) ?? 0);
      return {
        kind: "lift" as const,
        n: at + 1,
        leg,
        startMs: track.fixes[leg.from].timeMs,
        endMs: track.fixes[leg.to].timeMs,
        ms,
        metres,
        heightM: Math.max(0, rise),
        topMps: null,
      };
    }),
    ...descents.map((leg, at) => {
      const { metres, ms } = metresAndMs(track, leg);
      return {
        kind: "descent" as const,
        n: at + 1,
        leg,
        startMs: track.fixes[leg.from].timeMs,
        endMs: track.fixes[leg.to].timeMs,
        ms,
        metres,
        heightM: droppedM(track, leg),
        topMps: topOf(track, leg),
      };
    }),
  ];
  return parts.sort((a, b) => a.leg.from - b.leg.from);
}
