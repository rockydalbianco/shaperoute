import type { ImageSourcePropType } from "react-native";

import { t } from "../i18n";

/**
 * The entries of the Feed's «+» (TASK-481, ADR-0390), in the user's order:
 * «Record now», «Already recorded» (TASK-481 part F), «Photos only», «From
 * a file», then «Sleep» (TASK-467 E),
 * «Gym workout» (TASK-484) and «Workout plan» (TASK-485). Only the ready
 * ones are listed, with no «Soon»: each of the last three adds its own line
 * here, at its place in the order, when its flow is in the app. «Gym
 * workout» and «Workout plan» are always ready: the «+» is there only with
 * an account; with no plans the second says how to make one. «Already
 * recorded» is always ready too: with no activity left to post, its flow
 * says so. Each has its line sign (TASK-509, `ADD_TO_FEED_ICONS`), left
 * of its words: an entry added here without one does not compile.
 */
export type AddToFeedEntryId =
  "record" | "done" | "photos" | "file" | "sleep" | "gym" | "plan";

/**
 * The entries' signs: Lucide's icons (ISC, `assets/ui/icons/`), white and
 * coloured by `tintColor`, as the ones under a post (TASK-444). The
 * dumbbell is the gym's of the tab bar, at the size of these. Beside the
 * entries and not in them: an entry stays its id and its words.
 */
export const ADD_TO_FEED_ICONS = {
  record: require("../../assets/ui/icons/circle-dot.png"),
  done: require("../../assets/ui/icons/history.png"),
  photos: require("../../assets/ui/icons/images.png"),
  file: require("../../assets/ui/icons/file-up.png"),
  sleep: require("../../assets/ui/icons/moon.png"),
  gym: require("../../assets/ui/icons/dumbbell.png"),
  plan: require("../../assets/ui/icons/clipboard-list.png"),
} satisfies Record<AddToFeedEntryId, ImageSourcePropType>;

export type AddToFeedEntry = {
  id: AddToFeedEntryId;
  title: string;
  detail: string;
};

type Ready = {
  /** The Feed knows how to start a recording (App.tsx gives it). */
  record: boolean;
  /** The app was built with the file picker (`filePickerAvailable()`). */
  filePicker: boolean;
  /** The sleep is on and the phone can read it (TASK-467 part E): false
   * when left out, as in every build until part C. */
  sleep?: boolean;
};

/** The entries the sheet lists, in order, with their texts. */
export function addToFeedEntries({
  record,
  filePicker,
  sleep = false,
}: Ready): AddToFeedEntry[] {
  const all: [boolean, AddToFeedEntry][] = [
    [
      record,
      { id: "record", title: t("Record now"), detail: t("Start an activity now") },
    ],
    [
      true,
      {
        id: "done",
        title: t("Already recorded"),
        detail: t("Post an activity from My activities"),
      },
    ],
    [
      true,
      {
        id: "photos",
        title: t("Photos only"),
        detail: t("Up to 10 photos, also from Instagram"),
      },
    ],
    [
      filePicker,
      {
        id: "file",
        title: t("From a file"),
        detail: t("GPX, TCX, FIT or IGC from Strava, Garmin, Komoot…"),
      },
    ],
    [
      sleep,
      {
        id: "sleep",
        title: t("Sleep"),
        detail: t("Last night's sleep score, from Apple Health"),
      },
    ],
    [
      true,
      {
        id: "gym",
        title: t("Gym workout"),
        detail: t("A workout you already did, written by hand"),
      },
    ],
    [
      true,
      {
        id: "plan",
        title: t("Workout plan"),
        detail: t("Share one of your gym plans"),
      },
    ],
  ];
  return all.filter(([ready]) => ready).map(([, entry]) => entry);
}
