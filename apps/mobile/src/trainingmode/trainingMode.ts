import { NUTRITION_ON } from "../nutrition/nutritionOn";
import type { Sport } from "../settings/sport";
import {
  APP_PAGES,
  type BarPage as SkiBarPage,
  isSkiMode,
  SKI_PAGES,
} from "../skimode/skiMode";

/**
 * The training mode (TASK-490, ADR-0398): with «Gym» chosen, MuW is an app
 * for training, as it is an app for skiing with «Ski» (TASK-429, ADR-0357).
 * Nothing new is kept for it: the mode is the sport already saved, so
 * choosing another sport brings the app back as always. «Stretching» stays
 * a sport like the others (the user's choice of 2026-11-22).
 */
export function isTrainingMode(sport: Sport): boolean {
  return sport === "gym";
}

/** The three ways the app can be: as always, for skiing, for training. */
export type AppMode = "app" | "ski" | "training";

export function modeOf(sport: Sport): AppMode {
  if (isSkiMode(sport)) {
    return "ski";
  }
  return isTrainingMode(sport) ? "training" : "app";
}

/** A page of the tab bar, as the app names its screens. */
export type BarPage = SkiBarPage | "trainingWorkouts" | "trainingFood";

/**
 * The pages of the training mode: Feed, Today, Workouts, Food, Profile. As
 * in every mode, «Feed» stays first and «Profile» last, the mode's own
 * pages in between (the user's choice of 2026-11-24, part E). «Today» is
 * the page «choose» of the app, as in the ski mode: every way back to
 * «Draw» (the end of a workout, «Discard») lands on it. «Messages» has no
 * tab here: it opens from its button in the header. «Food» is the
 * «Nutrition» page of TASK-489 (part D): only while «Nutrition» is on,
 * else the bar has four tabs.
 */
export function trainingPagesOf(nutritionOn: boolean): readonly BarPage[] {
  return nutritionOn
    ? ["feed", "choose", "trainingWorkouts", "trainingFood", "profile"]
    : ["feed", "choose", "trainingWorkouts", "profile"];
}

export const TRAINING_PAGES: readonly BarPage[] = trainingPagesOf(NUTRITION_ON);

/** The pages of the tab bar in `mode`. */
export function pagesOfMode(mode: AppMode): readonly BarPage[] {
  switch (mode) {
    case "ski":
      return SKI_PAGES;
    case "training":
      return TRAINING_PAGES;
    default:
      return APP_PAGES;
  }
}

/** The pages of the tab bar for `sport`. */
export function barPagesOf(sport: Sport): readonly BarPage[] {
  return pagesOfMode(modeOf(sport));
}

/** The pages only a mode has: what the app has no more when it leaves it. */
const OWN_PAGES: Readonly<Record<AppMode, readonly string[]>> = {
  app: [],
  ski: ["skiDays", "skiResorts"],
  training: ["trainingWorkouts", "trainingFood"],
};

/**
 * Where the app goes when the mode changes under it: entering the ski or
 * the training mode opens «Today»; going back to the app as always, a page
 * it has no more («Days», «Resorts», «Workouts», «Food») goes to «Draw». Any other
 * page stays where it is. Null: nothing to do.
 */
export function pageAfterModeChange(
  page: string,
  was: AppMode,
  is: AppMode,
): BarPage | null {
  if (was === is) {
    return null;
  }
  if (is !== "app") {
    return page === "choose" ? null : "choose";
  }
  return OWN_PAGES[was].includes(page) ? "choose" : null;
}

/** The pages each mode draws itself; «Feed» and «Profile» are the app's. */
export type ModePages<P> = {
  ski: { choose: P; skiDays: P; skiResorts: P };
  /** «Food» only where the bar has it (`NUTRITION_ON`). */
  training: { choose: P; trainingWorkouts: P; trainingFood?: P };
};

/**
 * The pages of the tab bar for `sport`, built from the app's own five (in
 * APP_PAGES' order) and the mode's own. In a mode the others («Feed» and
 * «Profile») are the app's as they are.
 */
export function shellPagesOf<P>(
  sport: Sport,
  appPages: readonly P[],
  own: ModePages<P>,
): readonly P[] {
  const mode = modeOf(sport);
  if (mode === "app") {
    return appPages;
  }
  const mine: Partial<Record<BarPage, P>> = own[mode];
  // A page the mode does not draw is one of the app's (APP_PAGES).
  const appPage = (page: BarPage): P =>
    appPages[(APP_PAGES as readonly BarPage[]).indexOf(page)];
  return barPagesOf(sport).map((page) => mine[page] ?? appPage(page));
}
