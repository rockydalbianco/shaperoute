/**
 * What the flight map draws (TASK-479 part A1): the track in pieces of the
 * same climb, longer for a long flight, broken at a gap; the course for
 * «Heading up», held while circling or standing.
 */
import { courseOf, MAX_PIECES, varioPieces } from "./flightMapData";
import { flightOf, T0 } from "./syntheticFlight";

const glide = (seconds: number, varioMps: number, headingDeg = 90) =>
  ({ kind: "glide", seconds, airspeedMps: 10, headingDeg, varioMps }) as const;
const circle = (seconds: number, varioMps: number) =>
  ({
    kind: "circle",
    seconds,
    airspeedMps: 10,
    turnSeconds: 20,
    direction: 1,
    varioMps,
  }) as const;

describe("varioPieces", () => {
  it("colours each stretch by its climb, in 0.5 m/s steps, one line per climb", () => {
    const pieces = varioPieces(flightOf([glide(60, -1.2), glide(60, 2.1)]));
    expect(pieces.map((piece) => piece.climbMps)).toEqual([-1, 2]);
    // One line each, joined end to start.
    expect(pieces[0].line[pieces[0].line.length - 1]).toEqual(pieces[1].line[0]);
    expect(pieces[0].line.length).toBeGreaterThan(5);
  });

  it("starts at the take-off", () => {
    const track = flightOf([glide(60, -1), glide(60, 3)]);
    const pieces = varioPieces(track, T0 + 60_000);
    expect(pieces.map((piece) => piece.climbMps)).toEqual([3]);
  });

  it("is broken at a gap in the recording", () => {
    const track = flightOf([glide(40, -1), glide(40, -1)]);
    track.fixes[30] = { ...track.fixes[30], gap: true };
    const pieces = varioPieces(track);
    expect(pieces).toHaveLength(2);
    expect(pieces[0].line[pieces[0].line.length - 1]).not.toEqual(pieces[1].line[0]);
  });

  it("keeps to MAX_PIECES on a long flight", () => {
    const track = flightOf([glide(4 * 3600, -1), glide(4 * 3600, 1)], {
      everyMs: 2000,
    });
    const pieces = varioPieces(track);
    const segments = pieces.reduce((sum, piece) => sum + piece.line.length - 1, 0);
    expect(segments).toBeLessThanOrEqual(MAX_PIECES + 2);
  });

  it("has nothing to draw with fewer than two heights", () => {
    expect(varioPieces({ fixes: [], distanceM: 0 })).toEqual([]);
  });
});

describe("courseOf", () => {
  it("is the way of the last 5 s", () => {
    expect(courseOf(flightOf([glide(30, -1, 90)]), false, null)).toBe(90);
    expect(courseOf(flightOf([glide(30, -1, 200)]), false, 90)).toBe(200);
  });

  it("holds the course of before while circling", () => {
    const track = flightOf([glide(30, -1, 90), circle(60, 2)]);
    expect(courseOf(track, true, 90)).toBe(90);
    expect(courseOf(track, true, null)).toBeNull();
  });

  it("holds it when the pilot has hardly moved", () => {
    const still = flightOf([{ ...glide(30, 0), airspeedMps: 0.5 }]);
    expect(courseOf(still, false, 45)).toBe(45);
  });
});
