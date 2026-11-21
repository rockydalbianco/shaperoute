import type { PlannedLiveAudience } from "@shaperoute/shared-types";
import { Alert } from "react-native";

import { t } from "../i18n";
import { type LiveApiOptions, tiePlannedLivePost } from "./liveShareApi";

/**
 * The live becomes the post (TASK-468 part B2b2, the user's choice 5): the
 * planned live this recording started (`rememberPlannedLive`, from
 * `startPlannedLive`), asked about once at its end («Post it in the
 * Feed?»), and tied to the post once the API has it (`tiePlannedPost`, from
 * the drawings' door). «Don't post» ties nothing. Outside React: the store
 * of the live share and the door of the drawings both reach it.
 */

export type PlannedRun = {
  plannedLiveId: string;
  title: string;
  audience: PlannedLiveAudience;
};

/** The planned live of the recording under way or just ended. */
let started: PlannedRun | null = null;
/** «Post» said: the next post the API keeps, while others see it, is its. */
let toTie: string | null = null;

export function rememberPlannedLive(run: PlannedRun): void {
  started = run;
  toTie = null;
}

/** The planned live of the run that ended, once: asked about once. */
export function takePlannedRun(): PlannedRun | null {
  const run = started;
  started = null;
  return run;
}

/** «Post it in the Feed?» (texts approved by the user on 2026-11-12):
 * `onPost` with a yes; a no ties nothing. */
export function askToPost(run: PlannedRun, onPost: () => void): void {
  Alert.alert(
    t("Post it in the Feed?"),
    t("Your live becomes the post of this activity."),
    [
      {
        text: t("Don't post"),
        style: "cancel",
        onPress: () => {
          toTie = null;
        },
      },
      {
        text: t("Post"),
        onPress: () => {
          toTie = run.plannedLiveId;
          onPost();
        },
      },
    ],
  );
}

/** After a post kept by the API: tied to the planned live when «Post» was
 * said and others see it. Once, whatever comes of it; never throws. */
export async function tiePlannedPost(
  api: LiveApiOptions,
  drawingId: string | null,
  seen: boolean,
): Promise<void> {
  const planned = toTie;
  toTie = null;
  if (planned === null || drawingId === null || !seen) {
    return;
  }
  await tiePlannedLivePost(api, planned, drawingId).catch(() => undefined);
}

/** For the tests: as when the app opens. */
export function resetPlannedPost(): void {
  started = null;
  toTie = null;
}
