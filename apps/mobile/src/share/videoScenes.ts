import { t } from "../i18n";

/**
 * The scenes of the video (TASK-408, ADR-0339, part C2): the opening, the
 * route and the ending, in the order the runner put them, some of them
 * off. The video lasts 12 seconds whatever is on (the user's choice 8):
 * the route takes the seconds of a scene turned off, and without the route
 * the others share them. With the opening off, as when the post opens
 * (choice 12), the route has 9 seconds and the ending 3: the video of
 * before the scenes.
 */

/** The three scenes, in the order of the board (choice 8). */
export const SCENES = ["opening", "route", "ending"] as const;

export type SceneName = (typeof SCENES)[number];

/** What the opening shows: the line drawing itself from above, or the
 * title. «Nothing» is the opening turned off. */
export const OPENINGS = ["drawing", "title"] as const;

export type Opening = (typeof OPENINGS)[number];

/** How the opening gives way to the next scene. */
export const CUTS = ["cut", "fade"] as const;

export type Cut = (typeof CUTS)[number];

/** What the ending shows: the numbers, the whole drawing (as before the
 * scenes), the heart of MuW, or all three. */
export const ENDINGS = ["numbers", "drawing", "heart", "all"] as const;

export type Ending = (typeof ENDINGS)[number];

/** The seconds of each scene with all three on (choice 8). */
const SECONDS: Record<SceneName, number> = { opening: 3, route: 6, ending: 3 };

/** One scene of the video, from `from` to `to` seconds. */
export type SceneWindow = { scene: SceneName; from: number; to: number };

/** The scenes on, in `order`, with their seconds in a video of `total`
 * seconds; none when all are off, which the sheet does not allow. */
export function sceneWindows(
  order: readonly SceneName[],
  off: readonly SceneName[],
  total: number,
): SceneWindow[] {
  const on = order.filter((scene) => !off.includes(scene));
  if (on.length === 0) {
    return [];
  }
  const base = on.reduce((sum, scene) => sum + SECONDS[scene], 0);
  const spare = total - base;
  const seconds = (scene: SceneName): number => {
    if (on.includes("route")) {
      return SECONDS[scene] + (scene === "route" ? spare : 0);
    }
    return SECONDS[scene] + spare / on.length;
  };
  const windows: SceneWindow[] = [];
  let from = 0;
  on.forEach((scene, i) => {
    const to = i === on.length - 1 ? total : from + seconds(scene);
    windows.push({ scene, from, to });
    from = to;
  });
  return windows;
}

/** `order` with `scene` moved one place earlier (-1) or later (+1); the
 * same order at either end. */
export function moved(
  order: readonly SceneName[],
  scene: SceneName,
  by: -1 | 1,
): SceneName[] {
  const next = [...order];
  const at = next.indexOf(scene);
  const to = at + by;
  if (at < 0 || to < 0 || to >= next.length) {
    return next;
  }
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

/** `off` with `scene` turned on or off; unchanged when turning it off would
 * leave no scene on («At least one scene stays on.»). */
export function switched(
  off: readonly SceneName[],
  scene: SceneName,
  on: boolean,
): SceneName[] {
  if (on) {
    return off.filter((name) => name !== scene);
  }
  if (off.includes(scene) || off.length >= SCENES.length - 1) {
    return [...off];
  }
  return [...off, scene];
}

/** The scene's name in the sheet (texts of TASK-408, choice 10). */
export function sceneName(scene: SceneName): string {
  switch (scene) {
    case "opening":
      return t("Opening");
    case "route":
      return t("The route");
    default:
      return t("Ending");
  }
}

export function openingName(opening: Opening): string {
  return opening === "title" ? t("Title") : t("Drawing in 2D");
}

export function cutName(cut: Cut): string {
  return cut === "cut" ? t("Cut") : t("Fade");
}

export function endingName(ending: Ending): string {
  switch (ending) {
    case "numbers":
      return t("Numbers");
    case "heart":
      return t("Heart");
    case "all":
      return t("All three");
    default:
      return t("Whole drawing");
  }
}
