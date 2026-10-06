/**
 * What changes on the water (TASK-251): a paddler's pace, the time of
 * 500 m, and what the voice says at each kilometre.
 */
import type { LatLon } from "@shaperoute/shared-types";

import { postOfTrack, resultValue } from "../share/postRun";
import {
  isPaddle,
  paddleAnnouncement,
  paddlePaceLabel,
  PADDLE_PACE_UNIT,
  per500S,
} from "./paddle";
import { addFix, emptyTrack, type Track } from "./trackRecorder";

jest.mock("expo-file-system");

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_194;

/** `metres` north at 5 km/h: 6 minutes each 500 m, a fix every 50 m. */
function paddled(metres: number): Track {
  let track = emptyTrack();
  for (let m = 0; m <= metres; m += 50) {
    track = addFix(track, {
      point: [START[0] + m * METRE, START[1]],
      timeMs: m * 720,
      accuracyM: 5,
    });
  }
  return track;
}

test("only a route on the water is paddled", () => {
  expect(isPaddle("paddling")).toBe(true);
  expect(isPaddle("running")).toBe(false);
  expect(isPaddle("cycling")).toBe(false);
  expect(isPaddle(undefined)).toBe(false);
});

test("a paddler's pace is the time of 500 m", () => {
  // 10:00 a kilometre is 5:00 each 500 m.
  expect(per500S(600)).toBe(300);
  expect(PADDLE_PACE_UNIT).toBe("/500 m");
  // 2 km in 24 minutes.
  expect(paddlePaceLabel(2000, 24 * 60_000)).toBe("6:00 /500 m");
  expect(paddlePaceLabel(1300, 876_000)).toBe("5:37 /500 m");
});

test("too short an outing has no pace", () => {
  expect(paddlePaceLabel(99, 60_000)).toBeNull();
  expect(paddlePaceLabel(500, 0)).toBeNull();
});

test("the voice says each kilometre with the pace of 500 m", () => {
  const track = paddled(1000);
  expect(paddleAnnouncement(1, track, "en", "km")).toBe(
    "1 kilometre. Time: 12 minutes. Average pace: 6 minutes per 500 metres.",
  );
  expect(paddleAnnouncement(1, track, "it", "km")).toBe(
    "Un chilometro. Tempo: 12 minuti. Passo medio: 6 minuti ogni 500 metri.",
  );
});

test("with miles the voice counts miles, the pace is of 500 m all the same", () => {
  const track = paddled(1650);
  expect(paddleAnnouncement(1, track, "en", "mi")).toBe(
    "1 mile. Time: 19 minutes 48 seconds. Average pace: 6 minutes per 500 metres.",
  );
});

test("the post of an outing on the water writes the pace of 500 m", () => {
  const track = paddled(2000);
  expect(resultValue(postOfTrack(track, "paddling"), "pace")).toBe("6:00 /500 m");
  // A run, and a post that does not know, as before.
  expect(resultValue(postOfTrack(track, "running"), "pace")).toBe("12:00 /km");
  expect(resultValue(postOfTrack(track), "pace")).toBe("12:00 /km");
  expect(postOfTrack(track)).not.toHaveProperty("activity");
});
