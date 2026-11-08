import {
  COMPASS_EVERY_MS,
  COMPASS_OK_ACCURACY,
  COMPASS_STEP_DEG,
  compassDeg,
  type CompassReading,
  degBetween,
  keepReading,
  mapHeading,
  MOVING_FIX_MS,
  normalizeDeg,
  shouldTurn,
  TURN_EVERY_MS,
  TURN_MIN_DEG,
} from "./headingUp";
import { AUTO_PAUSE_AFTER_MS } from "./runControl";

const NOW = 1_700_000_000_000;

function reading(
  trueHeading: number,
  accuracy = 3,
  atMs = NOW,
  magHeading = trueHeading + 3,
): CompassReading {
  return { trueHeading, magHeading, accuracy, atMs };
}

test("degrees are brought into a turn, and the way between two is the short one", () => {
  expect(normalizeDeg(370)).toBe(10);
  expect(normalizeDeg(-10)).toBe(350);
  expect(normalizeDeg(720)).toBe(0);
  expect(degBetween(10, 350)).toBe(20);
  expect(degBetween(350, 10)).toBe(20);
  expect(degBetween(0, 180)).toBe(180);
  expect(degBetween(90, 90)).toBe(0);
});

test("the compass points to true north, or to magnetic north when the phone cannot tell", () => {
  expect(compassDeg(reading(42))).toBe(42);
  expect(compassDeg({ trueHeading: -1, magHeading: 358, accuracy: 3, atMs: NOW })).toBe(
    358,
  );
  expect(compassDeg({ trueHeading: -1, magHeading: 362, accuracy: 3, atMs: NOW })).toBe(
    2,
  );
});

test("standing still the compass says where the runner faces, however poor it is", () => {
  // Still: the last fix is older than the auto-pause's wait.
  const still = NOW - MOVING_FIX_MS - 1;
  expect(MOVING_FIX_MS).toBe(AUTO_PAUSE_AFTER_MS);
  expect(
    mapHeading({
      compass: reading(70, 3),
      trackDeg: 180,
      lastFixMs: still,
      nowMs: NOW,
    }),
  ).toEqual({
    deg: 70,
    source: "compass",
  });
  expect(
    mapHeading({
      compass: reading(70, 0),
      trackDeg: 180,
      lastFixMs: still,
      nowMs: NOW,
    }),
  ).toEqual({
    deg: 70,
    source: "compass",
  });
  // Before the first fix too.
  expect(
    mapHeading({
      compass: reading(70, 1),
      trackDeg: null,
      lastFixMs: null,
      nowMs: NOW,
    }),
  ).toEqual({
    deg: 70,
    source: "compass",
  });
});

test("running, a calibrated compass wins; a poor one gives way to the line run", () => {
  const moving = NOW - 2000;
  expect(
    mapHeading({
      compass: reading(70, COMPASS_OK_ACCURACY),
      trackDeg: 180,
      lastFixMs: moving,
      nowMs: NOW,
    }),
  ).toEqual({ deg: 70, source: "compass" });
  expect(
    mapHeading({
      compass: reading(70, COMPASS_OK_ACCURACY - 1),
      trackDeg: 180,
      lastFixMs: moving,
      nowMs: NOW,
    }),
  ).toEqual({ deg: 180, source: "track" });
  // Exactly at the wait the runner still counts as moving.
  expect(
    mapHeading({
      compass: reading(70, 0),
      trackDeg: 180,
      lastFixMs: NOW - MOVING_FIX_MS,
      nowMs: NOW,
    }),
  ).toEqual({ deg: 180, source: "track" });
});

test("without a compass the line run is taken while moving, and nothing when still", () => {
  expect(
    mapHeading({ compass: null, trackDeg: 180, lastFixMs: NOW - 1000, nowMs: NOW }),
  ).toEqual({
    deg: 180,
    source: "track",
  });
  expect(
    mapHeading({
      compass: null,
      trackDeg: 180,
      lastFixMs: NOW - MOVING_FIX_MS - 1,
      nowMs: NOW,
    }),
  ).toBeNull();
  // A poor compass moving, before the line is long enough to point: still the compass.
  expect(
    mapHeading({
      compass: reading(70, 0),
      trackDeg: null,
      lastFixMs: NOW - 1000,
      nowMs: NOW,
    }),
  ).toEqual({
    deg: 70,
    source: "compass",
  });
  expect(
    mapHeading({ compass: null, trackDeg: null, lastFixMs: null, nowMs: NOW }),
  ).toBeNull();
});

test("the map turns the first time, then for 4° or more, not twice in 400 ms", () => {
  expect(shouldTurn(null, 90, NOW)).toBe(true);
  const last = { deg: 90, atMs: NOW };
  expect(shouldTurn(last, 90 + TURN_MIN_DEG - 0.5, NOW + TURN_EVERY_MS)).toBe(false);
  expect(shouldTurn(last, 90 + TURN_MIN_DEG, NOW + TURN_EVERY_MS)).toBe(true);
  expect(shouldTurn(last, 90 - TURN_MIN_DEG, NOW + TURN_EVERY_MS)).toBe(true);
  expect(shouldTurn(last, 180, NOW + TURN_EVERY_MS - 1)).toBe(false);
  // Across north: 358 to 2 is a 4° change.
  expect(shouldTurn({ deg: 358, atMs: NOW }, 2, NOW + TURN_EVERY_MS)).toBe(true);
});

test("a compass reading is kept for 2° or a calibration change, not more often than 250 ms", () => {
  const kept = reading(100, 3, NOW);
  expect(keepReading(null, kept)).toBe(true);
  expect(
    keepReading(kept, reading(100 + COMPASS_STEP_DEG, 3, NOW + COMPASS_EVERY_MS - 1)),
  ).toBe(false);
  expect(
    keepReading(kept, reading(100 + COMPASS_STEP_DEG, 3, NOW + COMPASS_EVERY_MS)),
  ).toBe(true);
  expect(
    keepReading(kept, reading(100 + COMPASS_STEP_DEG - 0.5, 3, NOW + COMPASS_EVERY_MS)),
  ).toBe(false);
  expect(keepReading(kept, reading(100, 1, NOW + COMPASS_EVERY_MS))).toBe(true);
});
