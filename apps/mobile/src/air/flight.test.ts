/**
 * The numbers of a flight (TASK-305 part R2, ADR-0375): the altitude now
 * and the highest, the vario over ten seconds, the speed of the moment,
 * the top speed, and what a live update sends of them.
 */
import type { LatLon } from "@shaperoute/shared-types";

import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import { flightNow, flightStats, isFlight, STALE_FIX_MS, topSpeedMps } from "./flight";

const START: LatLon = [45.73, 10.83];
const METRE = 1 / 111_195;

/** A flight north: every `every` s for `seconds`, at `mps` over the
 * ground, climbing `vario` m/s from `from` metres. */
function flying(
  seconds: number,
  {
    every = 1,
    mps = 10,
    vario = 0,
    from = 1800,
    track = emptyTrack(),
    at = 0,
    north = 0,
  } = {},
): Track {
  let out = track;
  for (let s = 0; s <= seconds; s += every) {
    out = addFix(out, {
      point: [START[0] + (north + mps * s) * METRE, START[1]],
      timeMs: (at + s) * 1000,
      accuracyM: 5,
      altitudeM: from + vario * s,
    });
  }
  return out;
}

test("only paragliding is a flight", () => {
  expect(isFlight("paragliding")).toBe(true);
  expect(isFlight("skiing")).toBe(false);
  expect(isFlight("running")).toBe(false);
  expect(isFlight(null)).toBe(false);
});

test("climbing at 1.5 m/s at 10 m/s: altitude, highest, vario and speed", () => {
  const track = flying(60, { vario: 1.5 });
  const now = flightNow(track, 60_000);
  expect(now.altM).toBe(1890);
  expect(now.maxAltM).toBe(1890);
  expect(now.varioMps).toBe(1.5);
  expect(now.speedMps).toBeCloseTo(10, 0);
});

test("sinking after the top: the vario goes negative, the highest stays", () => {
  const up = flying(60, { vario: 2 });
  const down = flying(60, { vario: -1.2, from: 1920, track: up, at: 61, north: 610 });
  const now = flightNow(down, 121_000);
  expect(now.maxAltM).toBe(1920);
  expect(now.altM).toBe(1848);
  expect(now.varioMps).toBe(-1.2);
});

test("the vario is over ten seconds: one jumpy fix moves it little", () => {
  let track = flying(30, { every: 1 });
  track = addFix(track, {
    point: [START[0] + 310 * METRE, START[1]],
    timeMs: 31_000,
    accuracyM: 5,
    altitudeM: 1810,
  });
  expect(flightNow(track, 31_000).varioMps).toBe(1);
});

test("too few seconds, or a last fix too old: no vario and no speed", () => {
  const short = flying(3);
  expect(flightNow(short, 3000).varioMps).toBeNull();
  const old = flying(60);
  const late = flightNow(old, 60_000 + STALE_FIX_MS + 1);
  expect(late.varioMps).toBeNull();
  expect(late.speedMps).toBeNull();
  // The altitude stays: it is where the flight was last seen.
  expect(late.altM).toBe(1800);
});

test("without heights from the phone, no altitude and no vario", () => {
  let track = emptyTrack();
  for (let s = 0; s <= 20; s += 1) {
    track = addFix(track, {
      point: [START[0] + 10 * s * METRE, START[1]],
      timeMs: s * 1000,
      accuracyM: 5,
      altitudeM: null,
    });
  }
  const now = flightNow(track, 20_000);
  expect(now).toMatchObject({ altM: null, maxAltM: null, varioMps: null });
  expect(now.speedMps).toBeCloseTo(10, 0);
  expect(flightNow(emptyTrack(), 0)).toEqual({
    altM: null,
    maxAltM: null,
    varioMps: null,
    speedMps: null,
  });
});

test("the top speed is the fastest moment of the flight", () => {
  const slow = flying(60, { mps: 8 });
  const fast = flying(30, { mps: 14, track: slow, at: 61, north: 490 });
  expect(topSpeedMps(fast)).toBeCloseTo(14, 0);
  expect(topSpeedMps(emptyTrack())).toBeNull();
});

test("a live update sends the numbers within the API's bounds", () => {
  expect(
    flightStats({ altM: 1840, maxAltM: 1912, varioMps: 1.24, speedMps: 9.46 }),
  ).toEqual({ alt_m: 1840, max_alt_m: 1912, vario_mps: 1.2, speed_mps: 9.5 });
  expect(
    flightStats({ altM: 9500, maxAltM: -900, varioMps: -45, speedMps: 140 }),
  ).toEqual({ alt_m: 9000, max_alt_m: -500, vario_mps: -30, speed_mps: 100 });
  expect(
    flightStats({ altM: null, maxAltM: null, varioMps: null, speedMps: null }),
  ).toEqual({ alt_m: null, max_alt_m: null, vario_mps: null, speed_mps: null });
});
