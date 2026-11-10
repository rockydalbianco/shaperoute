import { t } from "../i18n";
import { type Palette, videoLine } from "../theme/tokens";
import type { Actor } from "./videoActor";
import {
  type Cut,
  type Ending,
  type Opening,
  type RouteCamera,
  SCENES,
  type SceneName,
} from "./videoScenes";
import type { VideoStyle } from "./videoStyle";

/**
 * What the runner chose in «Edit video» (TASK-408, ADR-0339, part C1): the
 * animal, the style, the line's colour and the emoji that pop along the
 * way and at the end. Only choices among the sheet's own: the line is
 * always the run's track.
 */
export type VideoEdit = {
  style: VideoStyle;
  /** The animal, or the runner's own image (TASK-417); null for none. */
  character: Actor | null;
  line: LineColour;
  /** The emoji that pops where the line passes; null for none. */
  along: string | null;
  /** The emoji that bursts once the drawing is whole; null for none. */
  end: string | null;
  /** The three scenes in the order the runner put them (part C2). */
  order: readonly SceneName[];
  /** The scenes turned off; never all three. */
  off: readonly SceneName[];
  opening: Opening;
  /** How the opening gives way to the next scene. */
  cut: Cut;
  /** How the route is seen on «3D» (part C2b). */
  camera: RouteCamera;
  ending: Ending;
};

/** The video as it was before the sheet: «Night», no animal, the yellow
 * line, no emoji of the video's own; the opening off, the route and the
 * whole drawing at the end (the user's choice 12). */
export const FIRST_EDIT: VideoEdit = {
  style: "night",
  character: null,
  line: "yellow",
  along: null,
  end: null,
  order: SCENES,
  off: ["opening"],
  opening: "drawing",
  cut: "fade",
  camera: "around",
  ending: "drawing",
};

/** The line's colours, in the order the sheet offers them. */
export const LINE_COLOURS = ["yellow", "light_blue", "pink", "green", "white"] as const;

export type LineColour = (typeof LINE_COLOURS)[number];

/** The colour the line is drawn in, in `palette`: the yellow is the
 * palette's own route yellow. */
export function lineColourOf(line: LineColour, palette: Palette): string {
  switch (line) {
    case "light_blue":
      return videoLine.lightBlue;
    case "pink":
      return videoLine.pink;
    case "green":
      return videoLine.green;
    case "white":
      return videoLine.white;
    default:
      return palette.accent;
  }
}

/** The colour's name, for VoiceOver (texts of TASK-408, choice 10). */
export function lineColourName(line: LineColour): string {
  switch (line) {
    case "light_blue":
      return t("Light blue");
    case "pink":
      return t("Pink");
    case "green":
      return t("Green");
    case "white":
      return t("White");
    default:
      return t("Yellow");
  }
}

/** The emoji the sheet offers for the video (the prompt's table, choice 9). */
export const VIDEO_EMOJI = ["🎆", "⭐", "❤️", "🔥", "⚡", "🎉", "🏆"] as const;

/** How many times the emoji of the way pops, evenly along the line. */
export const ALONG_COUNT = 3;
