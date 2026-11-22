import { GEAR_KINDS, type Gear, type GearKind } from "@shaperoute/shared-types";

import { decimal, t, tLater, tPlural } from "../i18n";
import { distanceLabel } from "../units/format";
import type { Units } from "../units/units";

/**
 * The kinds of gear as the app shows them (TASK-486, ADR-0393): a name, an
 * emoji, and what its totals say first. Shoes, a bike, skis and the like
 * go far: kilometres. A helmet, a harness, a sail are worn or used: hours.
 * Every kind counts its activities.
 */

export type GearMeasure = "distance" | "time";

type KindLook = { name: string; emoji: string; measure: GearMeasure };

// In English; shown with t() in the app's language (TASK-210).
export const GEAR_LOOKS: Readonly<Record<GearKind, KindLook>> = {
  shoes: { name: tLater("Shoes"), emoji: "👟", measure: "distance" },
  bike: { name: tLater("Bike"), emoji: "🚲", measure: "distance" },
  skis: { name: tLater("Skis"), emoji: "🎿", measure: "distance" },
  ski_boots: { name: tLater("Ski boots"), emoji: "🥾", measure: "distance" },
  snowboard: { name: tLater("Snowboard"), emoji: "🏂", measure: "distance" },
  poles: { name: tLater("Poles"), emoji: "🦯", measure: "distance" },
  boots: { name: tLater("Boots"), emoji: "🥾", measure: "distance" },
  climbing_shoes: { name: tLater("Climbing shoes"), emoji: "🧗", measure: "time" },
  harness: { name: tLater("Harness"), emoji: "🧗", measure: "time" },
  helmet: { name: tLater("Helmet"), emoji: "⛑️", measure: "time" },
  rope: { name: tLater("Rope"), emoji: "🪢", measure: "time" },
  crampons: { name: tLater("Crampons"), emoji: "🏔️", measure: "time" },
  ice_axe: { name: tLater("Ice axe"), emoji: "⛏️", measure: "time" },
  snowshoes: { name: tLater("Snowshoes"), emoji: "❄️", measure: "distance" },
  inline_skates: { name: tLater("Inline skates"), emoji: "🛼", measure: "distance" },
  sail: { name: tLater("Sail"), emoji: "⛵", measure: "time" },
  board: { name: tLater("Board"), emoji: "🏄", measure: "time" },
  paddle: { name: tLater("Paddle"), emoji: "🛶", measure: "distance" },
  boat: { name: tLater("Boat"), emoji: "🚣", measure: "distance" },
  wetsuit: { name: tLater("Wetsuit"), emoji: "🤿", measure: "time" },
  paraglider: { name: tLater("Paraglider"), emoji: "🪂", measure: "time" },
  wheelchair: { name: tLater("Wheelchair"), emoji: "🦽", measure: "distance" },
  clothing: { name: tLater("Clothing"), emoji: "👕", measure: "time" },
  backpack: { name: tLater("Backpack"), emoji: "🎒", measure: "distance" },
  watch: { name: tLater("Watch"), emoji: "⌚", measure: "time" },
  other: { name: tLater("Other"), emoji: "🧰", measure: "time" },
};

/** The look of a kind; one of a newer API is «Other». */
export function lookOf(kind: string): KindLook {
  return (GEAR_KINDS as readonly string[]).includes(kind)
    ? GEAR_LOOKS[kind as GearKind]
    : GEAR_LOOKS.other;
}

/** The name the list shows: the owner's name, or brand and model. */
export function gearTitle(item: Pick<Gear, "name" | "brand" | "model">): string {
  return item.name ?? [item.brand, item.model].filter(Boolean).join(" ");
}

/** "Nike Pegasus 41" under a name of its own, or the kind's name. */
export function gearSubtitle(
  item: Pick<Gear, "kind" | "name" | "brand" | "model">,
): string {
  const kind = t(lookOf(item.kind).name);
  if (item.name === undefined) {
    return kind;
  }
  return `${kind} · ${[item.brand, item.model].filter(Boolean).join(" ")}`;
}

/** "12.5 h", "40 min": the time of an item's activities. */
export function hoursLabel(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }
  const hours = seconds / 3600;
  const whole = Math.round(hours * 10) % 10 === 0 || hours >= 10;
  return `${whole ? Math.round(hours) : decimal(hours, 1)} h`;
}

/** "412.3 km · 38 activities", "12 h · 2 activities": the totals, the
 * kind's measure first. */
export function totalsLabel(item: Pick<Gear, "kind" | "totals">, units: Units): string {
  const { distance_m, duration_s, activities } = item.totals;
  const first =
    lookOf(item.kind).measure === "distance"
      ? distanceLabel(distance_m, units)
      : hoursLabel(duration_s);
  return `${first} · ${tPlural(activities, "{count} activity", "{count} activities")}`;
}

/** Past the limit its owner gave: only a kind that goes far has one. */
export function pastLimit(item: Pick<Gear, "kind" | "totals" | "limit_m">): boolean {
  return (
    item.limit_m !== undefined &&
    lookOf(item.kind).measure === "distance" &&
    item.totals.distance_m >= item.limit_m
  );
}
