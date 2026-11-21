/**
 * The wind from the drift while circling (TASK-479 part B1): the centre of
 * the ground velocities is the wind, their radius the airspeed.
 */
import { flightOf } from "./syntheticFlight";
import { circleFit, windNow } from "./wind";

const circle = (seconds: number) =>
  ({ kind: "circle", seconds, airspeedMps: 10, turnSeconds: 20, direction: 1, varioMps: 1.5 }) as const;
const glide = (seconds: number) =>
  ({ kind: "glide", seconds, airspeedMps: 10, headingDeg: 0, varioMps: -1 }) as const;

function angleOff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

describe("circleFit", () => {
  it("finds the centre and the radius of points on a circle", () => {
    const points = Array.from({ length: 12 }, (_, i) => ({
      x: 3 + 7 * Math.cos((i * Math.PI) / 6),
      y: -2 + 7 * Math.sin((i * Math.PI) / 6),
    }));
    const fit = circleFit(points);
    expect(fit?.centre.x).toBeCloseTo(3, 6);
    expect(fit?.centre.y).toBeCloseTo(-2, 6);
    expect(fit?.radius).toBeCloseTo(7, 6);
  });

  it("gives up on points in a line", () => {
    expect(circleFit([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull();
  });
});

describe("windNow", () => {
  it.each([
    [270, 5],
    [0, 3],
    [135, 8],
  ])("reads a wind from %i° at %i m/s from a circling", (fromDeg, mps) => {
    const track = flightOf([glide(20), circle(60)], { wind: { fromDeg, mps } });
    const wind = windNow(track);
    expect(wind).not.toBeNull();
    expect(angleOff(wind!.fromDeg, fromDeg)).toBeLessThan(5);
    expect(wind!.speedMps).toBeCloseTo(mps, 0);
    expect(wind!.airspeedMps).toBeCloseTo(10, 0);
  });

  it("is null without a whole turn", () => {
    expect(windNow(flightOf([glide(120)], { wind: { fromDeg: 270, mps: 5 } }))).toBeNull();
  });

  it("keeps the last circling's wind during a glide after it", () => {
    const track = flightOf([glide(20), circle(60), glide(90)], { wind: { fromDeg: 200, mps: 4 } });
    const wind = windNow(track);
    expect(angleOff(wind!.fromDeg, 200)).toBeLessThan(5);
    expect(wind!.atMs).toBeLessThan(track.fixes[track.fixes.length - 1].timeMs);
  });
});
