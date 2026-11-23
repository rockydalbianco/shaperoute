import type { GymSet } from "@shaperoute/shared-types";

import type { BodyProfile } from "../body/bodyProfile";
import { DEFAULT_WEIGHT_KG, restKcalPerMin } from "../body/energy";
import { profileOf } from "../sports";

/**
 * About how much energy a workout at the gym took, in kilocalories
 * (TASK-385 part C, ADR-0327; the user's «Stima MET sempre»): the same
 * «active energy» as every other sport (body/energy.ts, ADR-0318), what the
 * body spent above what it spends at rest in the same time.
 *
 * - A cardio block on a treadmill: the ACSM equation of a walk below
 *   7 km/h, of a run from 7 km/h, with its speed (or its metres over its
 *   time) and its incline.
 * - A cardio block on another machine: the MET of the Compendium of
 *   Physical Activities (2024) for the machine, by band of its level, or
 *   for a rower by the watts of its pace.
 * - The rest of the workout: the MET of resistance training with several
 *   exercises (02054). It is the mean of a session with its rests, so the
 *   rests are not taken out a second time.
 *
 * A block the formula knows nothing of (a treadmill with neither speed
 * nor metres, a machine the runner named) is left to the rest.
 */

/** Resistance (weight) training, multiple exercises, 8–15 reps at varied
 * resistance (Compendium 2024, 02054). */
export const WEIGHTS_MET = 3.5;

/** Kilocalories in a litre of oxygen, as body/energy.ts. */
const KCAL_PER_L_O2 = 5;
/** One MET: 3.5 ml of oxygen for each kilogram and minute. */
const MET_ML_KG_MIN = 3.5;

/** A treadmill from this speed is a run, below it a walk: the middle of
 * ACSM's 3.7–5 mph, where either equation may hold. */
export const RUN_FROM_KMH = 7;

/** A machine's level, on the common 1–20 of a gym: up to 7 light, up to 14
 * moderate, above vigorous. */
const LIGHT_UP_TO = 7;
const MODERATE_UP_TO = 14;

/** The MET of a machine: with no level, then light, moderate, vigorous. */
type Mets = { general: number; light: number; moderate: number; vigorous: number };

function flat(met: number): Mets {
  return { general: met, light: met, moderate: met, vigorous: met };
}

/** Bicycling, stationary (Compendium 2024): 50 W 4.0 (01214), 101–125 W
 * 6.8 (01224), 151–199 W 10.3 (01232); general 6.8 (01200). */
const BIKE: Mets = { general: 6.8, light: 4.0, moderate: 6.8, vigorous: 10.3 };

/** The MET of each machine of the catalog, by its key (gym/catalog.ts). */
const MACHINE_METS: Readonly<Record<string, Mets>> = {
  exercise_bike: BIKE,
  recumbent_bike: BIKE,
  // RPM/Spin bike class (01270) with no level.
  spin_bike: { ...BIKE, general: 9.0 },
  air_bike: flat(6.8),
  // Elliptical trainer, moderate 5.0 (02048), vigorous 9.0 (02049).
  elliptical: { general: 5.0, light: 5.0, moderate: 5.0, vigorous: 9.0 },
  // Rowing, stationary ergometer, general, vigorous 7.3 (02070), <100 W
  // 5.0 (02071); with its metres, by its watts (rowerMet).
  rowing_machine: { general: 7.3, light: 5.0, moderate: 7.3, vigorous: 7.3 },
  // Ski machine, general (02080).
  ski_machine: flat(6.8),
  // Stair treadmill ergometer, general (02065): the nearest for all three.
  stair_climber: flat(9.3),
  stepper: flat(9.3),
  vertical_climber: flat(9.3),
  // Arm ergometer, 15 W 2.0 (02116), general light 2.8 (02115), 45 W 3.5
  // (02118).
  arm_ergometer: { general: 2.8, light: 2.0, moderate: 2.8, vigorous: 3.5 },
  // Rope skipping exercise, general (02068).
  jump_rope: flat(11.0),
};

/** Rowing, stationary (Compendium 2024): <100 W 5.0 (02071), 100–149 W
 * 7.5 (02072), 150–199 W 11.0 (02073), ≥200 W 14.0 (02074). */
const ROWER_BANDS: readonly { belowW: number; met: number }[] = [
  { belowW: 100, met: 5.0 },
  { belowW: 150, met: 7.5 },
  { belowW: 200, met: 11.0 },
  { belowW: Infinity, met: 14.0 },
];

/** The watts of a rower's pace, as the rowers' own monitors count them:
 * 2.80 / (seconds per metre)³. */
export function rowerWatts(metres: number, seconds: number): number {
  const pace = seconds / metres;
  return 2.8 / pace ** 3;
}

type Block = Pick<
  GymSet,
  | "exercise"
  | "kind"
  | "duration_s"
  | "distance_m"
  | "speed_kmh"
  | "incline_pct"
  | "level"
>;

function levelMet(mets: Mets, level: number | undefined): number {
  if (level === undefined) {
    return mets.general;
  }
  if (level <= LIGHT_UP_TO) {
    return mets.light;
  }
  return level <= MODERATE_UP_TO ? mets.moderate : mets.vigorous;
}

/** The oxygen of a treadmill block, ml for each kilogram; null with
 * neither its speed nor its metres. */
function treadmillMlKg(block: Block, minutes: number): number | null {
  const metres =
    block.speed_kmh !== undefined && block.speed_kmh > 0
      ? (block.speed_kmh / 60) * 1000 * minutes
      : (block.distance_m ?? 0);
  if (!(metres > 0)) {
    return null;
  }
  const kmh = metres / 1000 / (minutes / 60);
  const energy = profileOf(kmh < RUN_FROM_KMH ? "walking" : "running").energy;
  if (energy?.kind !== "oxygen") {
    return null;
  }
  // ACSM holds uphill only: a treadmill going down counts as flat.
  const up = (metres * Math.max(0, block.incline_pct ?? 0)) / 100;
  return MET_ML_KG_MIN * minutes + energy.mlKgPerM * metres + energy.mlKgPerMUp * up;
}

/** The oxygen of a cardio block, ml for each kilogram; null for one the
 * formula knows nothing of. */
export function blockMlKg(block: Block): number | null {
  const seconds = block.duration_s ?? 0;
  if (block.kind !== "cardio" || block.exercise === undefined || !(seconds > 0)) {
    return null;
  }
  const minutes = seconds / 60;
  if (block.exercise === "treadmill" || block.exercise === "curved_treadmill") {
    return treadmillMlKg(block, minutes);
  }
  const mets = MACHINE_METS[block.exercise];
  if (mets === undefined) {
    return null;
  }
  const metres = block.distance_m ?? 0;
  const met =
    block.exercise === "rowing_machine" && metres > 0
      ? (
          ROWER_BANDS.find((band) => rowerWatts(metres, seconds) < band.belowW) ??
          ROWER_BANDS[ROWER_BANDS.length - 1]
        ).met
      : levelMet(mets, block.level);
  return met * MET_ML_KG_MIN * minutes;
}

/**
 * The active energy of a workout of `durationS` (its time, the rests in
 * it, the pauses out) with `sets`, for `body` in `year`: whole
 * kilocalories, never below zero.
 */
export function gymKcal(
  sets: readonly Block[],
  durationS: number,
  body: BodyProfile,
  year: number,
): number {
  let oxygen = 0;
  let cardioMin = 0;
  for (const set of sets) {
    const ml = blockMlKg(set);
    if (ml !== null) {
      oxygen += ml;
      cardioMin += (set.duration_s ?? 0) / 60;
    }
  }
  const minutes = Math.max(0, durationS) / 60;
  oxygen += WEIGHTS_MET * MET_ML_KG_MIN * Math.max(0, minutes - cardioMin);
  const weight = body.weightKg ?? DEFAULT_WEIGHT_KG;
  const total = (oxygen / 1000) * KCAL_PER_L_O2 * weight;
  // Blocks logged as longer than the workout still have their own time.
  const rest = restKcalPerMin(body, year) * Math.max(minutes, cardioMin);
  return Math.max(0, Math.round(total - rest));
}

/** «355 kcal», or null for none. */
export function gymKcalLabel(kcal: number): string | null {
  return kcal > 0 ? `${kcal} kcal` : null;
}
