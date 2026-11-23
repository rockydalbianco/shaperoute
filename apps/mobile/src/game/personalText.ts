import type {
  GamePersonalChallenge,
  GamePersonalStanding,
  GameStreak,
} from "@shaperoute/shared-types";

import { dayLabel } from "../activities/activityText";
import { t, tPlural } from "../i18n";
import { appUnits, type Units } from "../units/units";
import { goalDistanceLabel, goalPaceLabel } from "./goalText";

/**
 * The personal challenges and the streak in words (TASK-423 part D,
 * docs/GIOCO.md §6.6–6.7), in the app's units: the API speaks in metres,
 * counts, days and seconds a kilometre, and names a challenge by its id.
 * The numbers of each challenge are the API's (`tiers`); only the words
 * around them are here.
 */

/** "Kilometres this week": the name of a challenge; its id for one the app
 * does not know yet (a newer API). */
export function challengeName(id: string): string {
  switch (id) {
    case "week_km":
      return t("Kilometres this week");
    case "week_days":
      return t("Active days");
    case "week_long_outings":
      return t("Long outings");
    case "early":
      return t("Early bird");
    case "weekend_km":
      return t("Weekend");
    case "evening":
      return t("Evening outings");
    case "pace_5k":
      return t("5 km pace");
    case "long_run":
      return t("Long run");
    case "fast_1k":
      return t("Fast kilometre");
    case "pace_10k":
      return t("10 km pace");
    case "double_5k":
      return t("Double");
    case "month_km":
      return t("Kilometres this month");
    case "month_long":
      return t("Long outings of the month");
    case "month_days":
      return t("Active days of the month");
    case "month_early":
      return t("Early riser");
    default:
      return id;
  }
}

/** The distance in one go of a pace challenge, in metres. */
const PACE_DISTANCE_M: Record<string, number> = {
  pace_5k: 5_000,
  fast_1k: 1_000,
  pace_10k: 10_000,
};

/** "Outings of 3 km or more": what counts for a challenge; "" for one the
 * app does not know. */
export function challengeWhat(id: string, units: Units = appUnits()): string {
  const of = (metres: number) => goalDistanceLabel(metres, units);
  switch (id) {
    case "week_km":
    case "month_km":
      return t("Kilometres counted");
    case "week_days":
    case "month_days":
      return t("Days with an outing");
    case "week_long_outings":
      return t("Outings of {distance} or more", { distance: of(3_000) });
    case "month_long":
      return t("Outings of {distance} or more", { distance: of(10_000) });
    case "early":
    case "month_early":
      return t("Outings started before 8 am");
    case "evening":
      return t("Outings started after 7 pm");
    case "weekend_km":
      return t("Kilometres on Saturday and Sunday");
    case "pace_5k":
    case "fast_1k":
    case "pace_10k":
      return t("{distance} in one run, under the pace", {
        distance: of(PACE_DISTANCE_M[id]),
      });
    case "long_run":
      return t("One outing of the distance");
    case "double_5k":
      return t("Runs of {distance} or more", { distance: of(5_000) });
    default:
      return "";
  }
}

/** One number of a challenge, in its unit: "20 km", "3", "5:00 /km". */
export function amountText(
  unit: GamePersonalChallenge["unit"],
  value: number,
  units: Units = appUnits(),
): string {
  switch (unit) {
    case "m":
      return goalDistanceLabel(value, units);
    case "pace_s":
      return goalPaceLabel(value, units);
    default:
      return String(Math.round(value));
  }
}

/** "10 km · 20 km · 40 km": bronze, silver and gold. */
export function tiersText(
  challenge: GamePersonalChallenge,
  units: Units = appUnits(),
): string {
  return challenge.tiers
    .map((tier) => amountText(challenge.unit, tier, units))
    .join(" · ");
}

/** "Bronze", "Silver", "Gold"; "" before the first step. */
export function medalName(tier: number): string {
  switch (tier) {
    case 1:
      return t("Bronze");
    case 2:
      return t("Silver");
    case 3:
      return t("Gold");
    default:
      return "";
  }
}

/** The step a standing is going for: the next one, or gold once all are. */
function aim(standing: GamePersonalStanding): number {
  return standing.tiers[Math.min(standing.tier, standing.tiers.length - 1)];
}

/**
 * Where the account is: "9 / 12 km", "2 / 3"; for a pace, the best against
 * the next step, or that there is no run of the distance yet.
 */
export function standingText(
  standing: GamePersonalStanding,
  units: Units = appUnits(),
): string {
  const target = aim(standing);
  if (standing.unit === "pace_s") {
    if (standing.value === null) {
      return t("No run of {distance} yet", {
        distance: goalDistanceLabel(PACE_DISTANCE_M[standing.id] ?? 0, units),
      });
    }
    return t("Best {best} · target {target}", {
      best: goalPaceLabel(standing.value, units),
      target: goalPaceLabel(target, units),
    });
  }
  const value = standing.value ?? 0;
  if (standing.unit === "m") {
    // "9 / 12 km": the unit once, after the target.
    const done = goalDistanceLabel(value, units).slice(0, -(units.length + 1));
    return `${done} / ${goalDistanceLabel(target, units)}`;
  }
  return `${Math.round(value)} / ${Math.round(target)}`;
}

/**
 * How full each of the three steps is, 0 to 1: the ones reached full, the
 * next one by how far along the way to it the account is (never for a pace,
 * where a step is beaten or not).
 */
export function stepShares(standing: GamePersonalStanding): number[] {
  return standing.tiers.map((tier, n) => {
    if (n < standing.tier) {
      return 1;
    }
    if (n > standing.tier || standing.unit === "pace_s" || standing.value === null) {
      return 0;
    }
    const from = n === 0 ? 0 : standing.tiers[n - 1];
    return tier > from
      ? Math.min(1, Math.max(0, (standing.value - from) / (tier - from)))
      : 0;
  });
}

/** The day of a period as the API says it ("2026-10-19"), at midnight on
 * the phone's clock; null for one that is not a day. */
function localDay(day: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "3 days left", "Ends today": what a week or a month has left; `end` is
 * the day after its last. */
export function periodLeftText(end: string, nowMs: number): string {
  const ends = localDay(end);
  if (ends === null) {
    return "";
  }
  const now = new Date(nowMs);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((ends.getTime() - today.getTime()) / DAY_MS);
  if (days <= 1) {
    return t("Ends today");
  }
  return tPlural(days, "{count} day left", "{count} days left");
}

/** "Week of Mon 12 Oct 2026", "Month of Thu 1 Oct 2026": when a medal was
 * won. */
export function periodText(period: "week" | "month", start: string): string {
  const day = localDay(start);
  const date = day === null ? start : dayLabel(day.toISOString());
  return period === "week"
    ? t("Week of {date}", { date })
    : t("Month of {date}", { date });
}

/** "1 outing a week", "2 outings a week": one line of the streak. */
export function streakRuleText(streak: GameStreak): string {
  return tPlural(streak.runs, "{count} outing a week", "{count} outings a week");
}

/** "14 weeks · best 20": how long the streak is, and its longest. */
export function streakText(streak: GameStreak): string {
  return `${tPlural(streak.current, "{count} week", "{count} weeks")} · ${t(
    "best {best}",
    { best: streak.best },
  )}`;
}
