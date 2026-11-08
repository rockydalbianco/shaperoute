import { NO_HEART, zonesOf } from "./heartZones";
import { MAX_GAP_MS, zoneSeconds } from "./zoneTime";

// TASK-409 part B (the time in zone of TASK-374 D): with a max of 200 the
// zones go 100–120, 120–140, 140–160, 160–180, 180–200.

const T0 = Date.UTC(2026, 10, 8, 7);
const S = 1000;
const ZONES = zonesOf(200, NO_HEART);
const at = (s: number, bpm: number) => ({ fromMs: T0 + s * S, toMs: T0 + s * S, bpm });

test("each reading lasts until the next one, in its zone", () => {
  const samples = [at(0, 110), at(10, 130), at(20, 150), at(30, 170), at(40, 190)];
  expect(zoneSeconds(samples, ZONES, T0 + 50 * S)).toEqual([10, 10, 10, 10, 10]);
});

test("a limit belongs to the zone above; over the max is zone 5, under zone 1 none", () => {
  const samples = [at(0, 120), at(10, 210), at(20, 90)];
  expect(zoneSeconds(samples, ZONES, T0 + 30 * S)).toEqual([0, 10, 0, 0, 10]);
});

test("a hole between readings counts a minute at most, the last one too", () => {
  expect(MAX_GAP_MS).toBe(60_000);
  const samples = [at(0, 130), at(600, 150)];
  expect(zoneSeconds(samples, ZONES, T0 + 1200 * S)).toEqual([0, 60, 60, 0, 0]);
  expect(zoneSeconds([], ZONES, T0)).toEqual([0, 0, 0, 0, 0]);
});
