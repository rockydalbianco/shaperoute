/**
 * The numbers of the flight screen (TASK-479 part B1): vario now and over
 * 30 s, speed and track, glide ratio, take-off, time in the air.
 */
import { climbOver, glideOver, instrumentNow, STALE_MS } from "./instrument";
import { flightOf, T0 } from "./syntheticFlight";

const glide = (seconds: number, varioMps = -1.25, headingDeg = 90, airspeedMps = 10) =>
  ({ kind: "glide", seconds, airspeedMps, headingDeg, varioMps }) as const;
const circle = (seconds: number, varioMps = 2) =>
  ({ kind: "circle", seconds, airspeedMps: 10, turnSeconds: 20, direction: 1, varioMps }) as const;

const lastMs = (track: { fixes: { timeMs: number }[] }) => track.fixes[track.fixes.length - 1].timeMs;

describe("instrumentNow", () => {
  it("reads a steady glide", () => {
    const track = flightOf([glide(60, -1.25, 90, 10)], { fromAltM: 2000 });
    const now = instrumentNow(track, lastMs(track), T0, false);
    expect(now.altM).toBeCloseTo(1925, 6);
    expect(now.maxAltM).toBe(2000);
    expect(now.varioMps).toBeCloseTo(-1.25, 6);
    expect(now.varioAvgMps).toBeCloseTo(-1.25, 6);
    expect(now.speedMps).toBeCloseTo(10, 1);
    expect(now.trackDeg).toBeCloseTo(90, 0);
    // 10 m forward for each 1.25 m lost.
    expect(now.glideRatio).toBeCloseTo(8, 1);
    expect(now.flightMs).toBe(60_000);
  });

  it("knows the take-off: height above it, distance and the way back", () => {
    const track = flightOf([glide(100, 0.5, 90, 10)], { fromAltM: 1000 });
    const now = instrumentNow(track, lastMs(track), T0, false);
    expect(now.takeoff?.altM).toBe(1000);
    expect(now.aboveTakeoffM).toBeCloseTo(50, 6);
    expect(now.takeoffDistanceM).toBeCloseTo(1000, -1);
    // Flown east: the take-off is west.
    expect(now.takeoffBearingDeg).toBeCloseTo(270, 0);
  });

  it("has no glide ratio climbing, circling or before 15 s", () => {
    const climbing = flightOf([glide(60, 0.5)]);
    expect(instrumentNow(climbing, lastMs(climbing), T0, false).glideRatio).toBeNull();
    const gliding = flightOf([glide(60)]);
    expect(instrumentNow(gliding, lastMs(gliding), T0, true).glideRatio).toBeNull();
    const short = flightOf([glide(10)]);
    expect(instrumentNow(short, lastMs(short), T0, false).glideRatio).toBeNull();
  });

  it("has no take-off before the flight is in the air", () => {
    const track = flightOf([glide(30)]);
    const now = instrumentNow(track, lastMs(track), null, false);
    expect(now.takeoff).toBeNull();
    expect(now.flightMs).toBeNull();
    expect(now.aboveTakeoffM).toBeNull();
  });

  it("goes quiet when the fixes stop", () => {
    const track = flightOf([glide(60)]);
    const now = instrumentNow(track, lastMs(track) + STALE_MS + 1, T0, false);
    expect(now.varioMps).toBeNull();
    expect(now.varioAvgMps).toBeNull();
    expect(now.speedMps).toBeNull();
    // The height stays: the last one known.
    expect(now.altM).not.toBeNull();
  });

  it("averages a circling's climb over 30 s", () => {
    const track = flightOf([glide(20), circle(60, 2)]);
    const now = instrumentNow(track, lastMs(track), T0, true);
    expect(now.varioAvgMps).toBeCloseTo(2, 6);
  });

  it("gives the last fix's accuracy", () => {
    const track = flightOf([glide(5)]);
    expect(instrumentNow(track, lastMs(track), null, false).accuracyM).toBe(4);
  });
});

describe("climbOver", () => {
  it("reads through GPS noise by least squares", () => {
    const track = flightOf([glide(30, 1)]);
    const noisy = track.fixes.map((fix, i) => ({
      ...fix,
      altitudeM: (fix.altitudeM as number) + (i % 2 === 0 ? 3 : -3),
    }));
    expect(climbOver(noisy, 30_000, 10_000)).toBeCloseTo(1, 0);
  });

  it("is null over too short a span", () => {
    const track = flightOf([glide(5, 1)]);
    expect(climbOver(track.fixes, 30_000, 10_000)).toBeNull();
  });
});

describe("glideOver", () => {
  it("is capped at 99", () => {
    const track = flightOf([glide(60, -0.21, 0, 25)]);
    expect(glideOver(track.fixes)).toBe(99);
  });
});
