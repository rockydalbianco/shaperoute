import type { GymPlanRun, GymRunKind } from "@shaperoute/shared-types";

import { decimal, t, tLater } from "../i18n";
import { saveSport } from "../settings/sport";
import { chooseDrawDistance } from "../units/useDrawDistance";
import { RUN_NAMES } from "./proposal";

/**
 * A run day of a plan of the gym (TASK-433 C, the user's choices of
 * 2026-11-10): its words, and «Go to the run», which turns «Draw» to «Run»
 * with the day's distance written, so a shape is chosen or the run starts
 * without a route.
 */

/** The kinds, in the guide's order, with their short line. */
export const RUN_KINDS: readonly { kind: GymRunKind; title: string; line: string }[] = [
  { kind: "easy", title: tLater("Easy@@run"), line: tLater("easy, you can talk") },
  { kind: "intervals", title: tLater("Intervals"), line: tLater("fast + recovery") },
  { kind: "long", title: tLater("Long@@run"), line: tLater("more km, slowly") },
];

/** What the day's card says under its title, by kind. */
export const RUN_HINTS: Readonly<Record<GymRunKind, string>> = {
  easy: tLater("Easy, at a pace you can talk at."),
  intervals: tLater("Fast stretches with a slow jog between."),
  long: tLater("Longer than the others, slowly."),
};

/** «5.5 km», «5 km». */
export function kmText(metres: number): string {
  const km = metres / 1000;
  return `${Number.isInteger(km) ? String(km) : decimal(km)} km`;
}

/** «45 min». */
function minutesText(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** How much: «5.5 km», «45 min», «6 × 400 m», «8 × 1:30». */
export function runAmount(run: GymPlanRun): string {
  if (run.kind === "intervals") {
    const each =
      run.rep_m !== undefined
        ? `${run.rep_m} m`
        : `${Math.floor((run.rep_s ?? 0) / 60)}:${String((run.rep_s ?? 0) % 60).padStart(2, "0")}`;
    return `${run.reps ?? 1} × ${each}`;
  }
  return run.distance_m !== undefined
    ? kmText(run.distance_m)
    : minutesText(run.duration_s ?? 0);
}

/** «Easy run · 5.5 km». */
export function runTitle(run: GymPlanRun): string {
  return `${t(RUN_NAMES[run.kind])} · ${runAmount(run)}`;
}

/** The distance «Draw» is given: the run's, when it is one. */
export function runDistanceM(run: GymPlanRun): number | null {
  return run.kind !== "intervals" && run.distance_m !== undefined
    ? run.distance_m
    : null;
}

/** «Go to the run · 5.5 km»: «Draw» turns to «Run», the distance written. */
export function goToRun(run: GymPlanRun): void {
  saveSport("run");
  const metres = runDistanceM(run);
  if (metres !== null) {
    chooseDrawDistance(metres);
  }
}
