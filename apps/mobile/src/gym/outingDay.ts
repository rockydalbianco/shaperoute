import type {
  GymOutingKind,
  GymOutingSport,
  GymPlanOuting,
} from "@shaperoute/shared-types";

import { decimal, t, tLater } from "../i18n";
import { savePlace } from "../pool/poolChoice";
import { saveSport } from "../settings/sport";
import { chooseDrawDistance } from "../units/useDrawDistance";

/**
 * A day out of a plan that is not a run (TASK-461 B and C, ADR-0371): its
 * name, how much it is, and «Draw» turned to its sport with its distance
 * (the user's approved words: «Oggi: lungo · 45 km», «Draw disegna al
 * massimo 30 km», «Registra libero», «Una pedalata di oggi segna il giorno
 * fatto, anche più corta»).
 */

type Names = Readonly<Record<GymOutingSport, string>>;

const LONG: Names = {
  walk: tLater("Long walk"),
  hike: tLater("Long hike"),
  bike: tLater("Long ride"),
  gravel: tLater("Long ride"),
  mtb: tLater("Long ride"),
  swim: tLater("Long swim"),
  paddle: tLater("Long paddle"),
};
const EASY: Names = {
  walk: tLater("Easy walk"),
  hike: tLater("Easy hike"),
  bike: tLater("Easy ride"),
  gravel: tLater("Easy ride"),
  mtb: tLater("Easy ride"),
  swim: tLater("Easy swim"),
  paddle: tLater("Easy paddle"),
};
const INTERVALS: Names = {
  walk: tLater("Intervals"),
  hike: tLater("Intervals"),
  bike: tLater("Bike intervals"),
  gravel: tLater("Bike intervals"),
  mtb: tLater("Bike intervals"),
  swim: tLater("Swim sets"),
  paddle: tLater("Paddle intervals"),
};

/** The English name of a day out, by its kind and sport. */
export function outingName(outing: GymPlanOuting): string {
  const byKind: Readonly<Record<GymOutingKind, string>> = {
    long: LONG[outing.sport],
    easy: EASY[outing.sport],
    intervals: INTERVALS[outing.sport],
    brisk:
      outing.climb_m !== undefined ? tLater("Brisk walk uphill") : tLater("Brisk walk"),
    climb: tLater("Climb outing"),
  };
  return byKind[outing.kind];
}

/** «45 km», «800 m», «45 min». */
function distanceText(metres: number): string {
  if (metres < 1000) {
    return `${metres} m`;
  }
  const km = metres / 1000;
  return `${Number.isInteger(km) ? String(km) : decimal(km)} km`;
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** How much: «45 km», «8 × 100 m», «5 × 3:00», «45 min», «600 m» of climb. */
export function outingAmount(outing: GymPlanOuting): string {
  if (outing.kind === "intervals") {
    const each =
      outing.rep_m !== undefined ? `${outing.rep_m} m` : clock(outing.rep_s ?? 0);
    return `${outing.reps ?? 1} × ${each}`;
  }
  if (outing.kind === "climb" && outing.climb_m !== undefined) {
    return `${outing.climb_m} m`;
  }
  if (outing.distance_m !== undefined) {
    return distanceText(outing.distance_m);
  }
  return `${Math.round((outing.duration_s ?? 0) / 60)} min`;
}

/** «Long ride · 45 km», in the app's language. */
export function outingTitle(outing: GymPlanOuting): string {
  return `${t(outingName(outing))} · ${outingAmount(outing)}`;
}

/** The longest route «Draw» draws for each sport of a day out. */
export const DRAW_MAX_M: Readonly<Record<GymOutingSport, number>> = {
  walk: 30_000,
  hike: 30_000,
  bike: 30_000,
  gravel: 30_000,
  mtb: 30_000,
  swim: 3000,
  paddle: 5000,
};

/** The distance of the day, when it has one (a climb's too). */
export function outingDistanceM(outing: GymPlanOuting): number | null {
  return outing.kind !== "intervals" && outing.distance_m !== undefined
    ? outing.distance_m
    : null;
}

/** Whether the day is longer than «Draw» draws: «Registra libero». */
export function beyondDraw(outing: GymPlanOuting): boolean {
  const metres = outingDistanceM(outing);
  return metres !== null && metres > DRAW_MAX_M[outing.sport];
}

/** The distance «Draw» is given for the day: the day's, at most its
 * sport's longest. */
export function drawDistanceM(outing: GymPlanOuting): number | null {
  const metres = outingDistanceM(outing);
  return metres === null ? null : Math.min(metres, DRAW_MAX_M[outing.sport]);
}

/** «Draw» turned to the day's sport (a swim to its water), its distance
 * written: the shape is chosen next, or recorded freely. */
export function goToOuting(outing: GymPlanOuting): void {
  saveSport(outing.sport);
  if (outing.sport === "swim") {
    savePlace(outing.pool === false ? "open_water" : "pool");
  }
  const metres = drawDistanceM(outing);
  if (metres !== null) {
    chooseDrawDistance(metres);
  }
}

/** The line under the day: an activity of its sport today marks it done. */
export function doneLine(outing: GymPlanOuting): string {
  switch (outing.sport) {
    case "bike":
    case "gravel":
    case "mtb":
      return t("A ride today marks the day done, even a shorter one.");
    case "swim":
      return t("A swim today marks the day done, even a shorter one.");
    case "paddle":
      return t("A paddle today marks the day done, even a shorter one.");
    case "hike":
      return outing.kind === "climb"
        ? t("A hike today marks the day done, even with less climb.")
        : t("A hike today marks the day done, even a shorter one.");
    case "walk":
      return t("A walk today marks the day done, even a shorter one.");
  }
}
