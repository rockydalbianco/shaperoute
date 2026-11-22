import { t } from "../i18n";

/**
 * The entries of the Feed's «+» (TASK-481, ADR-0390), in the user's order:
 * «Record now», «Photos only», «From a file», then «Sleep» (TASK-467 E),
 * «Gym workout» (TASK-484) and «Workout plan» (TASK-485). Only the ready
 * ones are listed, with no «Soon»: each of the last three adds its own line
 * here, at its place in the order, when its flow is in the app. «Workout
 * plan» is always ready: the «+» is there only with an account, and with
 * no plans its flow says how to make one.
 */
export type AddToFeedEntryId = "record" | "photos" | "file" | "sleep" | "plan";

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
        detail: t("GPX, TCX or FIT from Strava, Garmin, Komoot…"),
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
        id: "plan",
        title: t("Workout plan"),
        detail: t("Share one of your gym plans"),
      },
    ],
  ];
  return all.filter(([ready]) => ready).map(([, entry]) => entry);
}
