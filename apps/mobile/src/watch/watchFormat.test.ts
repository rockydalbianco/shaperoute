import { readFileSync } from "fs";
import path from "path";

import { clockLabel } from "../navigation/freeRun";
import { paddlePaceLabel } from "../navigation/paddle";
import { swimPaceLabel } from "../navigation/swim";
import { paceLabel, runDistanceLabel } from "../units/format";
import type { Units } from "../units/units";

/**
 * The watch writes its numbers in Swift (WatchCore's WatchFormat, TASK-370
 * part A2). Its XCTest reads the same Fixtures/format.json: here the texts
 * are checked against the app's own functions, so the two write the same.
 */
type Format = {
  clock: { ms: number; text: string }[];
  distance: { metres: number; units: Units; text: string }[];
  pace: {
    metres: number;
    ms: number;
    pace: "km" | "paddle" | "swim";
    units: Units;
    text: string | null;
  }[];
};

const FORMAT = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "targets",
      "watch",
      "Core",
      "Fixtures",
      "format.json",
    ),
    "utf8",
  ),
) as Format;

describe("the watch's numbers", () => {
  it.each(FORMAT.clock)(
    "write the clock of $ms ms as the run screen",
    ({ ms, text }) => {
      expect(clockLabel(ms)).toBe(text);
    },
  );

  it.each(FORMAT.distance)(
    "write $metres m in $units as the run screen",
    ({ metres, units, text }) => {
      expect(runDistanceLabel(metres, units)).toBe(text);
    },
  );

  it.each(FORMAT.pace)(
    "write the $pace pace of $metres m in $ms ms as the app",
    ({ metres, ms, pace, units, text }) => {
      const written =
        pace === "paddle"
          ? paddlePaceLabel(metres, ms)
          : pace === "swim"
            ? swimPaceLabel(metres, ms)
            : paceLabel(metres, ms, units);
      expect(written).toBe(text);
    },
  );
});
