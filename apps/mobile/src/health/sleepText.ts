import type { SleepFigures } from "@shaperoute/shared-types";

import { t } from "../i18n";
import { durationText } from "../route/runTime";
import { type SleepBand, sleepBand } from "./sleepScore";

/**
 * The words of a night of sleep in a post (TASK-467 part B2), in the texts
 * the user approved (2026-11-11): the score, one of five words, the hours
 * slept and the stages. «Light» is Apple Health's «Core». Never an hour of
 * going to bed or of waking, never a piece of advice.
 */

/** The word beside the score. */
export function sleepBandName(band: SleepBand): string {
  switch (band) {
    case "poor":
      return t("Poor@@sleep");
    case "fair":
      return t("Fair@@sleep");
    case "good":
      return t("Good@@sleep");
    case "veryGood":
      return t("Very good@@sleep");
    case "excellent":
      return t("Excellent@@sleep");
  }
}

/** "7 h 40 min", "45 min". */
export function sleepTimeText(minutes: number): string {
  return durationText(minutes * 60);
}

/** "82 · Very good": the score and its word. */
export function sleepScoreText(score: number): string {
  return `${score} · ${sleepBandName(sleepBand(score))}`;
}

/** "82 · Very good · 7 h 40 min": a night in a line. */
export function sleepLineText(sleep: SleepFigures): string {
  return `${sleepScoreText(sleep.score)} · ${sleepTimeText(sleep.asleep_min)}`;
}

/** One stage of the night: its name and how long. */
export type SleepStageRow = { key: string; label: string; value: string };

/** The stages as the post lists them: «Awake», then «REM», «Light» and
 * «Deep» when a watch told them. None for a night with neither. */
export function sleepStageRows(sleep: SleepFigures): SleepStageRow[] {
  const { stages } = sleep;
  if (stages === undefined) {
    return [];
  }
  return [
    {
      key: "awake",
      label: t("Awake@@sleep"),
      value: sleepTimeText(sleep.awake_min),
    },
    { key: "rem", label: t("REM@@sleep"), value: sleepTimeText(stages.rem_min) },
    {
      key: "light",
      label: t("Light@@sleep"),
      value: sleepTimeText(stages.light_min),
    },
    { key: "deep", label: t("Deep@@sleep"), value: sleepTimeText(stages.deep_min) },
  ];
}
