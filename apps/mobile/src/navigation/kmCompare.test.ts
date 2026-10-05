import type { LatLon } from "@shaperoute/shared-types";

import {
  comparisonOf,
  kmChangeS,
  kmComparison,
  rideChangeKmh,
  rideComparison,
  SAME_PACE_S,
  SAME_SPEED_KMH,
} from "./kmCompare";
import { changeLabel, splits } from "./runMetrics";
import {
  addFix,
  emptyTrack,
  pauseTrack,
  resumeTrack,
  type Track,
} from "./trackRecorder";

const START: LatLon = [46.067, 11.1215];
const METRE = 1 / 111_195;

/** `track` and a fix `northM` metres north of the start, at `seconds`. */
function fixAt(track: Track, northM: number, seconds: number): Track {
  return addFix(track, {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: Math.round(seconds * 1000),
    accuracyM: 5,
  });
}

/** A run with a fix every 50 m, each kilometre in its `kmSeconds`, and 100 m
 * more: the last kilometre has ended. */
function runOf(kmSeconds: number[], everyM = 50): Track {
  let track = fixAt(emptyTrack(), 0, 0);
  let seconds = 0;
  kmSeconds.forEach((time, index) => {
    for (let m = everyM; m <= 1000; m += everyM) {
      track = fixAt(track, index * 1000 + m, seconds + (time * m) / 1000);
    }
    seconds += time;
  });
  const last = kmSeconds[kmSeconds.length - 1] ?? 300;
  return fixAt(track, kmSeconds.length * 1000 + 100, seconds + last / 10);
}

test("the first kilometre has none before: nothing is said", () => {
  expect(kmComparison(1, emptyTrack())).toBeNull();
  expect(kmComparison(1, runOf([342]))).toBeNull();
  expect(kmChangeS(runOf([342]), 1)).toBeNull();
  // A kilometre the run has not ended yet.
  expect(kmComparison(2, runOf([342]))).toBeNull();
});

test("a faster kilometre says by how many seconds", () => {
  const track = runOf([342, 330]);
  expect(kmChangeS(track, 2)).toBe(-12);
  expect(kmComparison(2, track)).toBe("12 seconds faster than the last kilometre.");
  expect(kmComparison(2, track, "it")).toBe(
    "Questo chilometro: 12 secondi meglio del precedente.",
  );
});

test("a slower kilometre says by how many seconds", () => {
  const track = runOf([342, 330, 338]);
  expect(kmChangeS(track, 3)).toBe(8);
  expect(kmComparison(3, track)).toBe("8 seconds slower than the last kilometre.");
  expect(kmComparison(3, track, "it")).toBe(
    "Questo chilometro: 8 secondi peggio del precedente.",
  );
  // The second is still the second's.
  expect(kmComparison(2, track)).toBe("12 seconds faster than the last kilometre.");
});

test("within 2 seconds, these too, it is the same pace", () => {
  expect(SAME_PACE_S).toBe(2);
  for (const second of [300, 298, 302, 301.4, 297.6]) {
    expect(kmComparison(2, runOf([300, second]))).toBe(
      "Same pace as the last kilometre.",
    );
  }
  expect(kmComparison(2, runOf([300, 302]), "it")).toBe(
    "Stesso passo del chilometro precedente.",
  );
  expect(kmComparison(2, runOf([300, 303]))).toBe(
    "3 seconds slower than the last kilometre.",
  );
  expect(kmComparison(2, runOf([300, 297]))).toBe(
    "3 seconds faster than the last kilometre.",
  );
});

test("the voice and the end of the run say the same seconds", () => {
  const track = runOf([342, 330.4, 339.1]);
  const rows = splits(track);
  expect(changeLabel(rows[1].change ?? 0)).toBe("-0:12");
  expect(kmComparison(2, track)).toBe("12 seconds faster than the last kilometre.");
  expect(changeLabel(rows[2].change ?? 0)).toBe("+0:09");
  expect(kmComparison(3, track)).toBe("9 seconds slower than the last kilometre.");
});

test("a pause does not count in the time of a kilometre", () => {
  // The first kilometre in 5:00.
  let track = fixAt(emptyTrack(), 0, 0);
  for (let m = 50; m <= 1000; m += 50) {
    track = fixAt(track, m, m * 0.3);
  }
  // 400 m of the second, four minutes still, then the rest: 5:00 moving.
  for (let m = 1050; m <= 1400; m += 50) {
    track = fixAt(track, m, m * 0.3);
  }
  track = resumeTrack(pauseTrack(track, 420_000), 660_000);
  // The first fix after a pause is not joined to the line: the run goes on
  // from it, a few steps on.
  for (let m = 1406; m <= 2156; m += 50) {
    track = fixAt(track, m, 660 + (m - 1406) * 0.3);
  }
  // With the pause in it, the kilometre would be four minutes slower.
  expect(kmChangeS(track, 2)).toBe(0);
  expect(kmComparison(2, track)).toBe("Same pace as the last kilometre.");
});

/** A ride with a fix every 100 m, each 10 km at its `speeds` in km/h, and
 * 100 m more. */
function rideOf(speeds: number[]): Track {
  let track = fixAt(emptyTrack(), 0, 0);
  let seconds = 0;
  speeds.forEach((speed, index) => {
    for (let m = 100; m <= 10_000; m += 100) {
      seconds += 100 / (speed / 3.6);
      track = fixAt(track, index * 10_000 + m, seconds);
    }
  });
  const last = speeds[speeds.length - 1] ?? 20;
  return fixAt(track, speeds.length * 10_000 + 100, seconds + 100 / (last / 3.6));
}

test("by bike the first 10 km have none before", () => {
  expect(rideComparison(10, rideOf([24]))).toBeNull();
  expect(rideChangeKmh(rideOf([24]), 10)).toBeNull();
  // 20 km the ride has not ended yet.
  expect(rideComparison(20, rideOf([24]))).toBeNull();
});

test("by bike the last 10 km are faster or slower than the 10 before, with no numbers", () => {
  const faster = rideOf([24, 26]);
  expect(rideChangeKmh(faster, 20)).toBeCloseTo(2, 1);
  expect(rideComparison(20, faster)).toBe(
    "The last 10 kilometres were faster than the 10 before.",
  );
  expect(rideComparison(20, faster, "it")).toBe(
    "Ultimi 10 chilometri più veloci dei 10 precedenti.",
  );
  // At 30 km, the 10 from 20 against the 10 from 10.
  const slower = rideOf([20, 26, 23]);
  expect(rideComparison(20, slower)).toBe(
    "The last 10 kilometres were faster than the 10 before.",
  );
  expect(rideChangeKmh(slower, 30)).toBeCloseTo(-3, 1);
  expect(rideComparison(30, slower)).toBe(
    "The last 10 kilometres were slower than the 10 before.",
  );
  expect(rideComparison(30, slower, "it")).toBe(
    "Ultimi 10 chilometri più lenti dei 10 precedenti.",
  );
});

test("by bike within half a km/h it is the same speed", () => {
  expect(SAME_SPEED_KMH).toBe(0.5);
  for (const second of [24, 24.4, 23.6]) {
    expect(rideComparison(20, rideOf([24, second]))).toBe(
      "The last 10 kilometres were at the same speed as the 10 before.",
    );
  }
  expect(rideComparison(20, rideOf([24, 24.4]), "it")).toBe(
    "Ultimi 10 chilometri alla stessa velocità dei 10 precedenti.",
  );
  expect(rideComparison(20, rideOf([24, 24.7]))).toBe(
    "The last 10 kilometres were faster than the 10 before.",
  );
  expect(rideComparison(20, rideOf([24, 23.3]))).toBe(
    "The last 10 kilometres were slower than the 10 before.",
  );
});

test("a route is compared as its activity is followed", () => {
  const run = runOf([342, 330]);
  expect(comparisonOf(2, run, undefined)).toBe(
    "12 seconds faster than the last kilometre.",
  );
  expect(comparisonOf(2, run, "running", "it")).toBe(
    "Questo chilometro: 12 secondi meglio del precedente.",
  );
  // A ride says nothing of a single kilometre.
  expect(comparisonOf(2, run, "cycling")).toBeNull();
  expect(comparisonOf(20, rideOf([24, 26]), "cycling")).toBe(
    "The last 10 kilometres were faster than the 10 before.",
  );
});
