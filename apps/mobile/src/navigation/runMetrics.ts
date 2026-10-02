import { stepAt, type Track } from "./trackRecorder";

/**
 * What a run adds up to besides its distance and its time (TASK-169,
 * ADR-0137): each kilometre's time, the metres climbed and the energy spent.
 * Pure functions from the track; nothing here knows about the route.
 */

/**
 * The time of the run at the end of each whole kilometre, in milliseconds
 * from the first fix, pauses left out. A kilometre that ends between two
 * fixes ends in proportion.
 */
export function kmTimesMs(track: Track): number[] {
  const times: number[] = [];
  let metres = 0;
  let ms = 0;
  for (let i = 1; i < track.fixes.length; i += 1) {
    const step = stepAt(track, i);
    while (step.metres > 0 && metres + step.metres >= (times.length + 1) * 1000) {
      const share = ((times.length + 1) * 1000 - metres) / step.metres;
      times.push(ms + share * step.ms);
    }
    metres += step.metres;
    ms += step.ms;
  }
  return times;
}

export type Split = {
  /** Which kilometre of the run: 1, 2, … */
  km: number;
  /** How long it took, in seconds. */
  seconds: number;
  /** Seconds more (slower) or fewer (faster) than the kilometre before;
   * null for the first. */
  change: number | null;
};

/** The whole kilometres of the run, each with its time. */
export function splits(track: Track): Split[] {
  const times = kmTimesMs(track);
  return times.map((time, index) => {
    const seconds = (time - (index === 0 ? 0 : times[index - 1])) / 1000;
    const before =
      index === 0
        ? null
        : (times[index - 1] - (index === 1 ? 0 : times[index - 2])) / 1000;
    return {
      km: index + 1,
      seconds,
      change: before === null ? null : seconds - before,
    };
  });
}

/** "+0:12" slower, "-0:05" faster, "0:00" the same: a split against the
 * one before, to the second. */
export function changeLabel(seconds: number): string {
  const whole = Math.round(Math.abs(seconds));
  const sign = whole === 0 ? "" : seconds > 0 ? "+" : "-";
  return `${sign}${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The GPS's height wanders by a few metres standing still: a climb counts
 * only once it is this much above the last height that counted. */
export const CLIMB_STEP_M = 3;

/**
 * The metres climbed, from the heights of the fixes: the sum of the rises,
 * each at least CLIMB_STEP_M. Descents take nothing away. Null when the
 * phone gave no height.
 */
export function climbM(track: Track): number | null {
  let from: number | null = null;
  let climbed = 0;
  for (const fix of track.fixes) {
    const height = fix.altitudeM;
    if (height === undefined || height === null || !Number.isFinite(height)) {
      continue;
    }
    if (from === null) {
      from = height;
    } else if (height - from >= CLIMB_STEP_M) {
      climbed += height - from;
      from = height;
    } else if (from - height >= CLIMB_STEP_M) {
      from = height;
    }
  }
  return from === null ? null : climbed;
}

/** The weight the energy is worked out for until the profile has the
 * runner's own, in kilograms. */
export const DEFAULT_WEIGHT_KG = 70;
/** Kilocalories for each kilogram carried one kilometre, running. */
export const KCAL_PER_KG_KM = 1.036;

/** About how much energy `metres` of running take, in kilocalories. */
export function kcal(metres: number, weightKg: number = DEFAULT_WEIGHT_KG): number {
  return Math.round((Math.max(0, metres) / 1000) * weightKg * KCAL_PER_KG_KM);
}
