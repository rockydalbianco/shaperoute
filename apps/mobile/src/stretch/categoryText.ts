import { t, tLater } from "../i18n";
import { CATEGORIES, type Category, type CategoryGroup } from "./categories";

/**
 * The words of the stretching categories (TASK-520, ADR-0415), approved by
 * the user on 2026-11-27 with their four translations: the names of the
 * categories and of the groups, and the line «Today» says under its
 * proposal. A sport is written «Running · Before», its name and when: no
 * «After {sport}» to write in every language with its own article.
 *
 * «Football» and «Splits» are already the name of a shape and the splits of
 * a run: here they carry a mark, so that each meaning has its translation.
 */

/** The sports that have stretches, by the first half of their categories' keys. */
export const SPORT_NAMES: Readonly<Record<string, string>> = {
  running: tLater("Running"),
  cycling: tLater("Cycling"),
  swimming: tLater("Swimming"),
  skiing: tLater("Skiing"),
  snowboarding: tLater("Snowboarding"),
  skiTouring: tLater("Ski touring"),
  gym: tLater("Gym"),
  motorbike: tLater("Motorbike"),
  hiking: tLater("Hiking"),
  climbing: tLater("Climbing"),
  paddling: tLater("Paddling"),
  football: tLater("Football@@sport"),
  racket: tLater("Racket sports"),
  golf: tLater("Golf"),
};

const NAMES: Readonly<Record<string, string>> = {
  neck: tLater("Neck"),
  shoulders: tLater("Shoulders"),
  arms: tLater("Arms & wrists"),
  chest: tLater("Chest"),
  upperBack: tLater("Upper back"),
  lowerBack: tLater("Lower back"),
  hips: tLater("Hips & pelvis"),
  glutes: tLater("Glutes"),
  legs: tLater("Legs"),
  calves: tLater("Calves"),
  feet: tLater("Ankles & feet"),
  fullBody: tLater("Full body"),
  morning: tLater("Morning"),
  bedtime: tLater("Bedtime"),
  desk: tLater("Desk break"),
  afterSitting: tLater("After sitting"),
  afterTravel: tLater("After travel"),
  posture: tLater("Posture"),
  relax: tLater("Relax & breathe"),
  intimacy_before: tLater("Before intimacy"),
  intimacy_after: tLater("After intimacy"),
  beginners: tLater("Beginners"),
  joints: tLater("Joint mobility"),
  backCare: tLater("Back care"),
  toes: tLater("Touch your toes"),
  splits: tLater("Splits@@stretch"),
};

export type When = "before" | "after";

/** The two halves of a key with a «before» and an «after»: a sport's, or
 * intimacy's; none for a category that is one thing. */
export function pairOf(key: string): { of: string; when: When } | null {
  const cut = key.lastIndexOf("_");
  const when = key.slice(cut + 1);
  if (cut < 1 || (when !== "before" && when !== "after")) {
    return null;
  }
  return { of: key.slice(0, cut), when };
}

/** The sport of a category's key and when; none for the others. */
export function sportOf(key: string): { sport: string; when: When } | null {
  const pair = pairOf(key);
  return pair !== null && SPORT_NAMES[pair.of] !== undefined
    ? { sport: pair.of, when: pair.when }
    : null;
}

/** A category's name, in the app's language: «Neck», «Running · After». */
export function categoryName(key: string): string {
  const sport = sportOf(key);
  if (sport !== null) {
    const when = sport.when === "before" ? t("Before") : t("After");
    return `${t(SPORT_NAMES[sport.sport])} · ${when}`;
  }
  const name = NAMES[key];
  if (name === undefined) {
    throw new Error(`no name for the stretching category ${key}`);
  }
  return t(name);
}

/** The groups of the home, in its order, each with what it holds. */
export const GROUPS: readonly {
  key: CategoryGroup;
  title: string;
  hint: string;
}[] = [
  { key: "body", title: tLater("Body"), hint: tLater("12 areas") },
  { key: "moments", title: tLater("Moments"), hint: tLater("7 moments") },
  { key: "sports", title: tLater("Sports"), hint: tLater("Before and after") },
  {
    key: "intimacy",
    title: tLater("Intimacy"),
    hint: tLater("Hips, pelvis, lower back and breath"),
  },
  { key: "more", title: tLater("More"), hint: tLater("Goals and gentle starts") },
];

/** The categories of a group, in the catalog's order. */
export function categoriesOf(group: CategoryGroup): Category[] {
  return CATEGORIES.filter((category) => category.group === group);
}

/** The lengths a category comes in: «3 · 5 · 10 min». */
export function lengthsLine(of: Category): string {
  return t("{minutes} min", { minutes: of.minutes.join(" · ") });
}

/** What «Today» says under its proposal, by the category proposed. */
const TODAY_LINES: Readonly<Record<string, string>> = {
  morning: tLater("A good start to the day"),
  bedtime: tLater("Wind down before sleep"),
  desk: tLater("A break from sitting"),
  fullBody: tLater("A little of everything"),
};

/** The line under «Today»'s proposal; none for a category it has no line for. */
export function todayLine(key: string): string | null {
  const line = TODAY_LINES[key];
  return line === undefined ? null : t(line);
}

/** The categories whose page says it is not medical advice. */
export const BACK_CATEGORIES: readonly string[] = ["lowerBack", "backCare"];
