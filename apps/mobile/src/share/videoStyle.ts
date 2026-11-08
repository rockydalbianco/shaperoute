import { t } from "../i18n";
import { BRIGHTNESS_STEPS } from "../theme/tone";
import { type Palette, paletteOf } from "../theme/tokens";

/**
 * The styles of a run's video (TASK-351, ADR-0303), chosen in «Share your
 * run» before «Export video»: «Night», the app's dark map at its darkest;
 * «Day», the light one at its brightest; «3D», the dark map leaning on its
 * hills, the camera turning around the run when the phone can afford it
 * (part D); «2D», the drawing alone on the night's dark ground, no map
 * under it (TASK-408, the user's choice of 2026-11-06). Each is a palette of
 * the tokens at one of its ends, whatever tone the app is shown in, because
 * the video is for whoever watches it.
 */
export type VideoStyle = "2d" | "night" | "day" | "3d";

/** In the order the row offers them, as the proposal's board; «Night» is on
 * when the post opens (`FIRST_EDIT`). */
export const VIDEO_STYLES: readonly VideoStyle[] = ["2d", "night", "day", "3d"];

/** The dark tone at its darkest. */
export const NIGHT: Palette = paletteOf({
  tone: "dark",
  dark: 0,
  light: BRIGHTNESS_STEPS - 1,
});

/** The light tone at its brightest. */
export const DAY: Palette = paletteOf({
  tone: "light",
  dark: 0,
  light: BRIGHTNESS_STEPS - 1,
});

/** The colours a style draws the map and the words with: «3D» is the
 * night's, on the hills; «2D» the night's, with no map. */
export function stylePalette(style: VideoStyle): Palette {
  return style === "day" ? DAY : NIGHT;
}

/** Whether the style's map leans on its hills (the 3D map of TASK-264). */
export function styleRelief(style: VideoStyle): boolean {
  return style === "3d";
}

/** Whether the style has the map under the line: all but «2D». */
export function styleMap(style: VideoStyle): boolean {
  return style !== "2d";
}

/** The style's name, as the row shows it. */
export function styleName(style: VideoStyle): string {
  switch (style) {
    case "day":
      return t("Day");
    case "3d":
      return t("3D");
    case "2d":
      return t("2D");
    default:
      return t("Night");
  }
}
