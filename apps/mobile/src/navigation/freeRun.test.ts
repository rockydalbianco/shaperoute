import type { LatLon } from "@shaperoute/shared-types";

import {
  canResume,
  clockLabel,
  elapsedMs,
  endFreeRun,
  FREE_ROUTE,
  kmAnnouncement,
  kmLabel,
  paceLabel,
  pendingFreeRun,
  wholeKm,
} from "./freeRun";
import { emptyTrack, type TrackFix } from "./trackRecorder";
import { clearRun, loadRun, RESUME_WITHIN_MS, saveRun, startRun } from "./trackStore";

// The phone's documents folder, in memory, as after closing the app.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

/** A fix `northM` metres north of the start, `seconds` into the run. */
function fix(northM: number, seconds: number): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: seconds * 1000,
    accuracyM: 5,
  };
}

beforeEach(() => {
  clearRun();
});

test("the distance reads in km with two decimals", () => {
  expect(kmLabel(0)).toBe("0.00 km");
  expect(kmLabel(1234)).toBe("1.23 km");
  expect(kmLabel(12_345)).toBe("12.35 km");
});

test("the clock shows minutes and seconds, and hours once there are some", () => {
  expect(clockLabel(0)).toBe("0:00");
  expect(clockLabel(7_400)).toBe("0:07");
  expect(clockLabel(754_000)).toBe("12:34");
  expect(clockLabel(3_723_000)).toBe("1:02:03");
  expect(clockLabel(-5_000)).toBe("0:00");
});

test("the pace is minutes per km, and nothing over the first 100 m", () => {
  // 1 km in 5 min 42 s.
  expect(paceLabel(1000, 342_000)).toBe("5:42 /km");
  // 2.5 km in 15 min: 6 min per km.
  expect(paceLabel(2500, 900_000)).toBe("6:00 /km");
  expect(paceLabel(99, 60_000)).toBeNull();
  expect(paceLabel(500, 0)).toBeNull();
});

test("the time runs from the first fix", () => {
  expect(elapsedMs(emptyTrack(), 10_000)).toBe(0);
  const track = { fixes: [fix(0, 100)], distanceM: 0 };
  expect(elapsedMs(track, 160_000)).toBe(60_000);
  // The phone's clock behind the GPS's: never below zero.
  expect(elapsedMs(track, 90_000)).toBe(0);
});

test("a free run is kept with no route, and comes back once stopped", () => {
  const run = startRun(FREE_ROUTE, 0);
  run.onFix(fix(0, 0), false);
  run.onFix(fix(20, 8), false);
  run.onFix(fix(40, 16), false);

  const ended = endFreeRun();
  expect(ended?.route).toEqual([]);
  expect(ended?.status).toBe("stopped");
  expect(ended?.track.fixes).toHaveLength(3);
  expect(ended?.track.distanceM).toBeCloseTo(40, 0);
  // Still in the file, for the next opening of the app.
  expect(pendingFreeRun()).toEqual(ended);
});

test("a run along a route, or one fix only, is not a free run to show", () => {
  saveRun({
    version: 1,
    route: [START, fix(100, 0).point],
    similarity: 0.9,
    track: { fixes: [fix(0, 0), fix(20, 8)], distanceM: 20 },
    status: "stopped",
  });
  expect(pendingFreeRun()).toBeNull();

  const run = startRun(FREE_ROUTE, 0);
  run.onFix(fix(0, 0), false);
  expect(endFreeRun()).toBeNull();
  // The route's run was replaced at the first fix: one run at a time.
  expect(loadRun()?.route).toEqual([]);
});

test("Run again goes on with a free run stopped lately, and not with an old one", () => {
  const first = startRun(FREE_ROUTE, 0);
  first.onFix(fix(0, 0), false);
  first.onFix(fix(20, 8), false);
  const stopped = endFreeRun();
  expect(stopped).not.toBeNull();
  if (stopped === null) {
    return;
  }
  expect(canResume(stopped, 8_000 + RESUME_WITHIN_MS)).toBe(true);
  expect(canResume(stopped, 8_001 + RESUME_WITHIN_MS)).toBe(false);

  const again = startRun(FREE_ROUTE, 60_000);
  again.onFix(fix(40, 60), false);
  expect(again.track().fixes).toHaveLength(3);
});

test("each kilometre is said with the time and the average pace", () => {
  // 1 km in 5 min 42 s.
  const first = { fixes: [fix(0, 0), fix(1000, 342)], distanceM: 1000 };
  expect(wholeKm(first)).toBe(1);
  expect(kmAnnouncement(1, first)).toBe(
    "1 kilometre. Time: 5 minutes 42 seconds. " +
      "Average pace: 5 minutes 42 seconds per kilometre.",
  );
  // 2.01 km in 12 min 3 s: 6 min per km.
  const second = { fixes: [fix(0, 0), fix(2010, 723)], distanceM: 2010 };
  expect(wholeKm(second)).toBe(2);
  expect(kmAnnouncement(2, second)).toBe(
    "2 kilometres. Time: 12 minutes 3 seconds. " +
      "Average pace: 6 minutes per kilometre.",
  );
  expect(wholeKm({ fixes: [], distanceM: 999 })).toBe(0);
});
