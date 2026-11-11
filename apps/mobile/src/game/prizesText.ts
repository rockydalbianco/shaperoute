import type { GameEdition, GamePrizeState } from "@shaperoute/shared-types";

import { t, tPlural } from "../i18n";
import { appUnits, type Units } from "../units/units";
import { goalDistanceLabel } from "./goalText";

/**
 * The prizes of the shape game in words (TASK-423 part E, docs/GIOCO.md
 * §5.4): the names of the titles and badges, what each asks, and how far
 * along the account is. The numbers are the API's (`target`, `value`); a
 * title is a name without its number, so it does not change with miles.
 */

/** "Explorer": a title's name; its id for one the app does not know yet. */
export function titleName(id: string): string {
  switch (id) {
    case "runner":
      return t("Runner");
    case "explorer":
      return t("Explorer");
    case "traveller":
      return t("Traveller");
    case "globetrotter":
      return t("Globetrotter");
    case "marathoner":
      return t("Marathoner");
    case "ultra":
      return t("Ultrarunner");
    case "steady":
      return t("Steady");
    case "collector":
      return t("Collector");
    default:
      return id;
  }
}

/** "4-week streak": a badge's name; its id for one the app does not know. */
export function badgeName(id: string): string {
  switch (id) {
    case "streak_4":
      return t("4-week streak");
    case "streak_12":
      return t("12-week streak");
    case "streak_52":
      return t("52-week streak");
    case "medals_10":
      return t("10 medals");
    case "medals_50":
      return t("50 medals");
    case "gold_10":
      return t("10 gold editions");
    case "team_1":
      return t("Team shape");
    case "team_10":
      return t("10 team shapes");
    default:
      return id;
  }
}

/** What a title or a badge asks, in the app's units: "1000 km in total",
 * "26 weeks in a row with an outing". */
export function prizeNeed(state: GamePrizeState, units: Units = appUnits()): string {
  switch (state.id) {
    case "runner":
    case "explorer":
    case "traveller":
    case "globetrotter":
      return t("{distance} in total", {
        distance: goalDistanceLabel(state.target, units),
      });
    case "marathoner":
      return t("Run a marathon");
    case "ultra":
      return t("Run 50 km in one go");
    case "steady":
    case "streak_4":
    case "streak_12":
    case "streak_52":
      return tPlural(
        state.target,
        "{count} week in a row with an outing",
        "{count} weeks in a row with an outing",
      );
    case "collector":
      return t("Complete every collection");
    case "medals_10":
    case "medals_50":
      return tPlural(
        state.target,
        "{count} medal in the personal challenges",
        "{count} medals in the personal challenges",
      );
    case "gold_10":
      return tPlural(
        state.target,
        "{count} shape in its gold edition",
        "{count} shapes in their gold edition",
      );
    case "team_1":
    case "team_10":
      return tPlural(
        state.target,
        "{count} team challenge completed",
        "{count} team challenges completed",
      );
    default:
      return "";
  }
}

/** "420 / 1000 km", "4 / 26": how far along a prize not reached yet; "" for
 * one reached at once (a marathon). */
export function prizeAlong(state: GamePrizeState, units: Units = appUnits()): string {
  if (state.target <= 1) {
    return "";
  }
  if (["runner", "explorer", "traveller", "globetrotter"].includes(state.id)) {
    const done = goalDistanceLabel(state.value, units).slice(0, -(units.length + 1));
    return `${done} / ${goalDistanceLabel(state.target, units)}`;
  }
  return `${Math.floor(state.value)} / ${Math.round(state.target)}`;
}

/** "Silver edition", "Gold edition", "Bronze edition". */
export function editionName(edition: GameEdition): string {
  switch (edition) {
    case "gold":
      return t("Gold edition");
    case "silver":
      return t("Silver edition");
    default:
      return t("Bronze edition");
  }
}

/** "2 of 3 runs for silver": how far an unlocked shape is from its next
 * edition; null once gold. */
export function editionAlong(edition: GameEdition, runs: number): string | null {
  if (edition === "gold") {
    return null;
  }
  return edition === "silver"
    ? t("{runs} of {need} runs for gold", { runs, need: 10 })
    : t("{runs} of {need} runs for silver", { runs, need: 3 });
}

/** "Animals frame". */
export function frameName(collection: string): string {
  return t("{collection} frame", { collection });
}
