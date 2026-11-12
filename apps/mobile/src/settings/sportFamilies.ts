import { tLater } from "../i18n";
import type { Sport, SportOption } from "./sport";

/** The families of the sport menu, in the order they are shown: the order
 * of `ALL_SPORTS` (on foot, on wheels, on the water, on the snow, then the
 * rest). `title` is in English: where it is shown, `t(title)`. */
export const SPORT_FAMILIES = [
  { id: "foot", title: tLater("On foot") },
  { id: "wheels", title: tLater("On wheels") },
  { id: "water", title: tLater("On the water") },
  { id: "snow", title: tLater("On snow") },
  { id: "other", title: tLater("Other@@sport") },
] as const;

export type SportFamily = (typeof SPORT_FAMILIES)[number]["id"];

/** The family of every sport; a sport added later without one goes in
 * «Other» until it is given its own. */
export const FAMILY_OF: { readonly [S in Sport]: SportFamily } = {
  walk: "foot",
  run: "foot",
  hike: "foot",
  bike: "wheels",
  gravel: "wheels",
  mtb: "wheels",
  roller: "wheels",
  wheelchair: "wheels",
  paddle: "water",
  swim: "water",
  ski: "snow",
  xc_ski: "snow",
  skimo: "snow",
  // A day of mountaineering (TASK-463), after ski touring.
  alpinism: "snow",
  gym: "other",
  paragliding: "other",
};

export function familyOf(sport: Sport): SportFamily {
  return FAMILY_OF[sport] ?? "other";
}

export type SportGroup = {
  family: SportFamily;
  /** In English, as `SPORT_FAMILIES`' titles. */
  title: string;
  sports: readonly SportOption[];
};

/** `sports` by family, in the families' order and, inside each, in their
 * own; a family with no sport is left out. */
export function groupSports(sports: readonly SportOption[]): readonly SportGroup[] {
  return SPORT_FAMILIES.map(({ id, title }) => ({
    family: id,
    title,
    sports: sports.filter((option) => familyOf(option.id) === id),
  })).filter((group) => group.sports.length > 0);
}
