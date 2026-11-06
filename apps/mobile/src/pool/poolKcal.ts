import type { BodyProfile } from "../body/bodyProfile";
import { DEFAULT_WEIGHT_KG, restKcalPerMin } from "../body/energy";
import { pacePer100S } from "./poolSwim";

/**
 * About how much energy a swim in a pool took, in kilocalories (TASK-409
 * part A, ADR-0318 «il nuoto in piscina»): the MET of the Compendium of
 * Physical Activities (2024) for the crawl at the swim's average pace /100
 * m, less what the body spends at rest in the same time, as a ride or a
 * paddle (body/energy.ts). The user's choice, «MET per passo»
 * (2026-11-06). A swim in open water has none (its sport has no energy).
 */

/** A pace band: slower than `slowerThanS` seconds /100 m, `met`. */
type PaceBand = { slowerThanS: number; met: number };

/** From the slowest: crawl slow, 30–45 yd/min (18292); medium, ~50 yd/min
 * (18290); fast, ~75 yd/min (18280); elite, > 90 yd/min (18294). The
 * edges are 2:18, 1:45 and 1:13 /100 m. */
const BANDS: readonly PaceBand[] = [
  { slowerThanS: 138, met: 5.8 },
  { slowerThanS: 105, met: 8.0 },
  { slowerThanS: 73, met: 10.5 },
  { slowerThanS: 0, met: 14.5 },
];

/** Kilocalories in a litre of oxygen. */
const KCAL_PER_L_O2 = 5;
/** One MET: 3.5 ml of oxygen for each kilogram and minute. */
const MET_ML_KG_MIN = 3.5;

/** The MET of a swim at `paceS` seconds /100 m. */
export function poolMet(paceS: number): number {
  return (BANDS.find((band) => paceS > band.slowerThanS) ?? BANDS[BANDS.length - 1])
    .met;
}

/**
 * The active energy of `metres` swum in `activeS` (pauses left out) for
 * `body` in `year`, whole kilocalories; never below zero, and none without
 * metres or time.
 */
export function poolKcal(
  metres: number,
  activeS: number,
  body: BodyProfile,
  year: number,
): number {
  const pace = pacePer100S(activeS, metres);
  if (pace === null) {
    return 0;
  }
  const weight = body.weightKg ?? DEFAULT_WEIGHT_KG;
  const minutes = activeS / 60;
  const total =
    (poolMet(pace) * MET_ML_KG_MIN * minutes * KCAL_PER_L_O2 * weight) / 1000;
  const rest = restKcalPerMin(body, year) * minutes;
  return Math.max(0, Math.round(total - rest));
}

/** "206 kcal"; none for zero. */
export function poolKcalLabel(kcal: number): string | null {
  return kcal > 0 ? `${kcal} kcal` : null;
}
