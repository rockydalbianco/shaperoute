import type { ImageSourcePropType } from "react-native";

/**
 * The signs of the stretching tiles (TASK-520, ADR-0415): Lucide's icons
 * (ISC, `assets/ui/icons/`), white and coloured by `tintColor` with the
 * group's colour, as the ones of the Feed. The moments of the day and the
 * sports have one, beside the figure; the areas of the body do not, the
 * figure is their sign (Lucide draws no parts of the body). Racket sports
 * have none either: Lucide has no racket, and a wrong sign is worse than
 * none. An icon is never the only sign: every tile has its name.
 */

/** A moment's icon, by its category's key. */
export const MOMENT_ICONS: Readonly<Record<string, ImageSourcePropType>> = {
  morning: require("../../assets/ui/icons/sunrise.png"),
  bedtime: require("../../assets/ui/icons/moon.png"),
  desk: require("../../assets/ui/icons/laptop.png"),
  afterSitting: require("../../assets/ui/icons/armchair.png"),
  afterTravel: require("../../assets/ui/icons/plane.png"),
  posture: require("../../assets/ui/icons/person-standing.png"),
  relax: require("../../assets/ui/icons/wind.png"),
};

/** A sport's icon, by the first half of its categories' keys. */
export const SPORT_ICONS: Readonly<Record<string, ImageSourcePropType>> = {
  running: require("../../assets/ui/icons/footprints.png"),
  cycling: require("../../assets/ui/icons/bike.png"),
  swimming: require("../../assets/ui/icons/waves-ladder.png"),
  skiing: require("../../assets/ui/icons/mountain-snow.png"),
  snowboarding: require("../../assets/ui/icons/snowflake.png"),
  skiTouring: require("../../assets/ui/icons/mountain.png"),
  gym: require("../../assets/ui/icons/dumbbell.png"),
  motorbike: require("../../assets/ui/icons/motorbike.png"),
  hiking: require("../../assets/ui/icons/backpack.png"),
  climbing: require("../../assets/ui/icons/pickaxe.png"),
  paddling: require("../../assets/ui/icons/kayak.png"),
  football: require("../../assets/ui/icons/volleyball.png"),
  golf: require("../../assets/ui/icons/land-plot.png"),
};
