/**
 * Circling and thermals (TASK-479 part B1): a circling is a run of fixes
 * turning at least 6°/s, 270° in all; its average climb and gain; the
 * thermal assistant's picture.
 */
import { flightOf, T0 } from "./syntheticFlight";
import { assistantOf, circlingNow, circlings, thermalNow } from "./thermal";

const glide = (seconds: number, varioMps = -1.2) =>
  ({ kind: "glide", seconds, airspeedMps: 10, headingDeg: 90, varioMps }) as const;
const circle = (seconds: number, varioMps = 2, direction: 1 | -1 = 1) =>
  ({
    kind: "circle",
    seconds,
    airspeedMps: 10,
    turnSeconds: 20,
    direction,
    varioMps,
  }) as const;

describe("circlings", () => {
  it("finds none in a straight glide", () => {
    expect(circlings(flightOf([glide(120)]))).toEqual([]);
  });

  it("finds one circling between two glides, with its climb", () => {
    const track = flightOf([glide(60), circle(120, 2), glide(60)]);
    const found = circlings(track);
    expect(found).toHaveLength(1);
    const [one] = found;
    // It began near 60 s and ended near 180 s.
    expect(one.startMs - T0).toBeGreaterThanOrEqual(55_000);
    expect(one.startMs - T0).toBeLessThanOrEqual(70_000);
    expect(one.endMs - T0).toBeGreaterThanOrEqual(175_000);
    expect(one.endMs - T0).toBeLessThanOrEqual(190_000);
    expect(one.turnDeg).toBeGreaterThan(1500);
    expect(one.avgMps).toBeGreaterThan(1.5);
    expect(one.avgMps).toBeLessThan(2.1);
    expect(one.gainM).toBeGreaterThan(180);
  });

  it("turns − to the left", () => {
    const [one] = circlings(flightOf([glide(30), circle(60, 1, -1)]));
    expect(one.turnDeg).toBeLessThan(-270);
  });

  it("does not count a single slow turn", () => {
    // 180° in 30 s: 6°/s, but not 270° in all.
    const track = flightOf([
      glide(60),
      {
        kind: "circle",
        seconds: 30,
        airspeedMps: 10,
        turnSeconds: 60,
        direction: 1,
        varioMps: 0,
      },
      // On the way the turn left it: no second turn back.
      { kind: "glide", seconds: 60, airspeedMps: 10, headingDeg: 270, varioMps: -1.2 },
    ]);
    expect(circlings(track)).toEqual([]);
  });

  it("holds in a wind", () => {
    const track = flightOf([glide(40), circle(100, 1.5)], {
      wind: { fromDeg: 270, mps: 5 },
    });
    expect(circlings(track)).toHaveLength(1);
  });
});

describe("thermalNow", () => {
  it("is the circling of now while circling", () => {
    const track = flightOf([glide(30), circle(80, 2.5)]);
    const now = track.fixes[track.fixes.length - 1].timeMs;
    const thermal = thermalNow(track, now);
    expect(thermal?.active).toBe(true);
    expect(thermal?.avgMps).toBeGreaterThan(2);
    expect(circlingNow(track)).toBe(true);
  });

  it("is the last thermal after it, not active", () => {
    const track = flightOf([glide(30), circle(80, 2.5), glide(60)]);
    const now = track.fixes[track.fixes.length - 1].timeMs;
    const thermal = thermalNow(track, now);
    expect(thermal?.active).toBe(false);
    expect(thermal?.gainM).toBeGreaterThan(150);
    expect(circlingNow(track)).toBe(false);
  });

  it("skips a circling that lost height", () => {
    const track = flightOf([glide(30), circle(80, -1), glide(30)]);
    expect(thermalNow(track, track.fixes[track.fixes.length - 1].timeMs)).toBeNull();
  });

  it("is null before any", () => {
    expect(thermalNow(flightOf([glide(30)]), T0 + 30_000)).toBeNull();
  });
});

describe("assistantOf", () => {
  it("draws the last minute around the pilot, the best climb marked", () => {
    const track = flightOf([glide(30), circle(30, 1), circle(30, 3)]);
    const { points, best } = assistantOf(track);
    // A fix a second, the last minute: 61 points, the last one here.
    expect(points).toHaveLength(61);
    expect(points[points.length - 1].x).toBeCloseTo(0, 6);
    expect(points[points.length - 1].y).toBeCloseTo(0, 6);
    expect(best?.varioMps).toBeGreaterThan(2.5);
  });

  it("is empty without fixes", () => {
    expect(assistantOf({ fixes: [], distanceM: 0 })).toEqual({
      points: [],
      best: null,
    });
  });
});
