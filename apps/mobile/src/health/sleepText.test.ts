import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";

import { translate } from "../i18n/translate";
import { SLEEP_BANDS } from "./sleepScore";
import {
  sleepBandName,
  sleepLineText,
  sleepScoreText,
  sleepStageRows,
  sleepTimeText,
} from "./sleepText";

// The words of a night in a post (TASK-467 part B2), as the user approved
// them on 2026-11-11.

test("the five words, in English as approved", () => {
  expect(SLEEP_BANDS.map(sleepBandName)).toEqual([
    "Poor",
    "Fair",
    "Good",
    "Very good",
    "Excellent",
  ]);
});

test("the example night in a line", () => {
  // 452 minutes.
  expect(sleepTimeText(summary.asleep_min)).toBe("7 h 32 min");
  expect(sleepTimeText(460)).toBe("7 h 40 min");
  expect(sleepTimeText(45)).toBe("45 min");
  expect(sleepScoreText(82)).toBe("82 · Very good");
  expect(sleepLineText({ ...summary, asleep_min: 460 })).toBe(
    "82 · Very good · 7 h 40 min",
  );
});

test("the stages: awake, REM, light for Apple's core, deep", () => {
  expect(sleepStageRows(summary)).toEqual([
    { key: "awake", label: "Awake", value: "18 min" },
    { key: "rem", label: "REM", value: "1 h 36 min" },
    { key: "light", label: "Light", value: "4 h 28 min" },
    { key: "deep", label: "Deep", value: "1 h 12 min" },
  ]);
  // A night no watch told the stages of lists none.
  expect(sleepStageRows(noStages)).toEqual([]);
});

test("the words of the other languages: Italian, and French's own REM", () => {
  const italian = [
    "Very good@@sleep",
    "Awake@@sleep",
    "REM@@sleep",
    "Light@@sleep",
    "Deep@@sleep",
  ].map((text) => translate("it", text));
  expect(italian).toEqual(["Molto buono", "Sveglio", "REM", "Leggero", "Profondo"]);
  expect(translate("it", "Sleep last night")).toBe("Il sonno della notte scorsa");
  // The Health app in French says «Paradoxal».
  expect(translate("fr", "REM@@sleep")).toBe("Paradoxal");
  // English shows what comes before the mark.
  expect(translate("en", "Light@@sleep")).toBe("Light");
});

test("no word of the night tells an hour of the clock or gives advice", () => {
  const said = [
    sleepLineText(summary),
    ...sleepStageRows(summary).flatMap((row) => [row.label, row.value]),
  ].join(" ");
  expect(said).not.toMatch(/\d{1,2}:\d{2}/);
  expect(said).not.toMatch(/should|try to|bed|woke/i);
});
