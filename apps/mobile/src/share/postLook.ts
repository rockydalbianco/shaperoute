import { t } from "../i18n";
import { color } from "../theme/tokens";
import { DAY, NIGHT } from "./videoStyle";

/**
 * The looks of the post's picture (TASK-450, the user's choice of
 * 2026-11-23): «Yellow», the logo's yellow with everything in its black, as
 * the post always was (ADR-0129); «Night», the app's dark ground with the
 * line in the route's yellow; «Day», the app's light ground with the line
 * in its dark. «Night» and «Day» are the video's palettes (videoStyle), at
 * one end of the tokens whatever tone the app is shown in: the picture is
 * for whoever sees it. Not kept with the post, as the video's style.
 */
export type PostLook = "yellow" | "night" | "day";

/** In the order the row offers them; «Yellow» is on when the post opens. */
export const POST_LOOKS: readonly PostLook[] = ["yellow", "night", "day"];

export const FIRST_LOOK: PostLook = "yellow";

/** What a look paints the picture with. */
export type LookColours = {
  /** The picture's ground. */
  ground: string;
  /** The words and the numbers. */
  ink: string;
  /** The drawing of the run. */
  line: string;
};

export function lookColours(look: PostLook): LookColours {
  switch (look) {
    case "night":
      return { ground: NIGHT.background, ink: NIGHT.text, line: NIGHT.accent };
    case "day":
      return { ground: DAY.background, ink: DAY.text, line: DAY.text };
    case "yellow":
      return { ground: color.accent, ink: color.onAccent, line: color.onAccent };
  }
}

/** The look's name, as the row shows it. */
export function lookName(look: PostLook): string {
  switch (look) {
    case "night":
      return t("Night");
    case "day":
      return t("Day");
    case "yellow":
      return t("Yellow");
  }
}
