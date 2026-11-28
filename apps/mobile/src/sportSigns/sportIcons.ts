import type { RunActivity } from "@shaperoute/shared-types";
import type { ImageSourcePropType } from "react-native";

/**
 * The line sign of each sport (TASK-510, the second round of TASK-444): white
 * PNGs in `assets/ui/sports/`, coloured by `tintColor` with a token, as the
 * bar's icons. Eleven from Lucide (ISC, `assets/ui/sports/LICENSE-lucide.txt`);
 * gravel, MTB, roller, ski, cross-country ski, snowshoes and paraglider drawn
 * for MuW on Lucide's grid, as Lucide has none (the user's choice,
 * 2026-11-28). The sources are in `out/TASK-510/icons/`.
 *
 * The profiles' `emoji` stays for plain text: the watch, a post's lines,
 * a group's sports.
 */
export const SPORT_ICONS: Record<RunActivity, ImageSourcePropType> = {
  walking: require("../../assets/ui/sports/footprints.png"),
  running: require("../../assets/ui/sports/sport-shoe.png"),
  hiking: require("../../assets/ui/sports/backpack.png"),
  cycling: require("../../assets/ui/sports/bike.png"),
  gravel_biking: require("../../assets/ui/sports/gravel-bike.png"),
  mountain_biking: require("../../assets/ui/sports/mountain-bike.png"),
  inline_skating: require("../../assets/ui/sports/inline-skate.png"),
  wheelchair: require("../../assets/ui/sports/accessibility.png"),
  paddling: require("../../assets/ui/sports/kayak.png"),
  swimming: require("../../assets/ui/sports/waves-horizontal.png"),
  skiing: require("../../assets/ui/sports/skiing.png"),
  xc_skiing: require("../../assets/ui/sports/xc-skiing.png"),
  ski_touring: require("../../assets/ui/sports/mountain-snow.png"),
  snowshoeing: require("../../assets/ui/sports/snowshoe.png"),
  alpinism: require("../../assets/ui/sports/pickaxe.png"),
  gym: require("../../assets/ui/sports/dumbbell.png"),
  paragliding: require("../../assets/ui/sports/paraglider.png"),
  stretching: require("../../assets/ui/sports/person-standing.png"),
};

/** A swim in a pool (TASK-400): the ladder, not the open water's waves. */
export const POOL_ICON: ImageSourcePropType = require("../../assets/ui/sports/waves-ladder.png");

/** The sign of `activity`; a run's for one the app does not know. */
export function sportIconOf(activity: string | undefined): ImageSourcePropType {
  return (
    (SPORT_ICONS as Partial<Record<string, ImageSourcePropType>>)[activity ?? ""] ??
    SPORT_ICONS.running
  );
}
