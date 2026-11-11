import type { LatLon } from "@shaperoute/shared-types";

import type { SnowPart } from "../activities/snowDay";
import { partName, skiDayLabels } from "./skiDayLabels";

// The numbers on the map of a day of skiing (TASK-429 part B): «1», «2»…
// on the descents and «L1», «L2»… on the lifts, each halfway along its line.

function part(kind: SnowPart["kind"], n: number, from: number, to: number): SnowPart {
  return {
    kind,
    n,
    leg: { from, to },
    startMs: 0,
    endMs: 0,
    ms: 0,
    metres: 0,
    heightM: 0,
    topMps: null,
  };
}

const points: LatLon[] = Array.from({ length: 11 }, (_, index) => [
  46 + index / 100,
  11,
]);

test("names a descent by its number and a lift with an L", () => {
  expect(partName(part("descent", 3, 0, 1))).toBe("3");
  expect(partName(part("lift", 2, 0, 1))).toBe("L2");
});

test("puts each number halfway along its part, in the day's order", () => {
  const labels = skiDayLabels(points, [
    part("descent", 1, 0, 4),
    part("lift", 1, 4, 6),
    part("descent", 2, 6, 10),
  ]);
  expect(labels).toEqual([
    { point: points[2], text: "1", kind: "descent" },
    { point: points[5], text: "L1", kind: "lift" },
    { point: points[8], text: "2", kind: "descent" },
  ]);
});

test("gives none without parts, or for a part off the track", () => {
  expect(skiDayLabels(points, null)).toEqual([]);
  expect(skiDayLabels(points, [part("lift", 1, 40, 60)])).toEqual([]);
});
