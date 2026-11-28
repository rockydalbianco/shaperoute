import type { LatLon } from "@shaperoute/shared-types";

import { destination, distanceM } from "./taskRoute";
import { xcScoreOf } from "./xcScore";

const ORIGIN: LatLon = [45.7, 10.8];

/** A point `northKm` north and `eastKm` east of ORIGIN. */
const at = (northKm: number, eastKm: number): LatLon =>
  destination(destination(ORIGIN, 0, northKm * 1000), 90, eastKm * 1000);

/** A flight along the corners, a point every 50 m. */
function flown(corners: LatLon[]): LatLon[] {
  const out: LatLon[] = [corners[0]];
  for (let k = 1; k < corners.length; k += 1) {
    const [from, to] = [corners[k - 1], corners[k]];
    const steps = Math.max(1, Math.round(distanceM(from, to, "faiSphere") / 50));
    for (let s = 1; s <= steps; s += 1) {
      const f = s / steps;
      out.push([from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f]);
    }
  }
  return out;
}

const km = (a: LatLon, b: LatLon) => distanceM(a, b, "faiSphere") / 1000;

describe("xcScoreOf", () => {
  it("scores a straight flight as free distance, start to finish", () => {
    const track = flown([at(0, 0), at(0, 20)]);
    const score = xcScoreOf(track);
    expect(score?.kind).toBe("free");
    expect(score?.multiplier).toBe(1);
    expect(score?.distanceKm).toBeCloseTo(km(at(0, 0), at(0, 20)), 1);
    expect(score?.points).toBe(score?.distanceKm);
    expect(score?.closingKm).toBeNull();
    expect(score?.turnpoints).toHaveLength(3);
  });

  it("finds the turnpoints of a zig-zag", () => {
    const corners = [at(0, 0), at(10, 0), at(0, 5), at(10, 10), at(0, 15)];
    const score = xcScoreOf(flown(corners));
    let legs = 0;
    for (let k = 1; k < corners.length; k += 1) {
      legs += km(corners[k - 1], corners[k]);
    }
    expect(score?.kind).toBe("free");
    expect(score?.distanceKm).toBeGreaterThan(legs - 0.1);
    expect(score?.distanceKm).toBeLessThan(legs + 0.01);
  });

  it("scores an equilateral triangle flown back to the start as a closed FAI ×1.6", () => {
    const corners = [at(0, 0), at(0, 10), at(8.66, 5), at(0, 0)];
    const score = xcScoreOf(flown(corners));
    expect(score?.kind).toBe("fai");
    expect(score?.closed).toBe(true);
    expect(score?.multiplier).toBe(1.6);
    expect(score?.distanceKm).toBeGreaterThan(29.8);
    expect(score?.distanceKm).toBeLessThan(30.1);
    expect(score?.points).toBeCloseTo(score!.distanceKm * 1.6, 1);
    expect(score?.closingKm).toBeLessThan(0.1);
  });

  it("takes a triangle's gap off its legs, and picks its multiplier by the gap", () => {
    // Back to 3 km from the start: the best may be a smaller closed
    // triangle; whatever it is, its numbers keep the rules.
    const corners = [at(0, 0), at(0, 10), at(8.66, 5), at(0, 3)];
    const score = xcScoreOf(flown(corners))!;
    expect(score.kind).not.toBe("free");
    const [p, q, r] = score.turnpoints;
    const sides = [km(p, q), km(q, r), km(r, p)];
    const perimeter = sides[0] + sides[1] + sides[2];
    const gap = km(score.start, score.finish);
    expect(score.closingKm).toBeCloseTo(gap, 2);
    expect(gap).toBeLessThan(0.2 * perimeter);
    expect(score.distanceKm).toBeCloseTo(perimeter - gap, 1);
    expect(score.closed).toBe(gap < 0.05 * perimeter);
    if (score.kind === "fai") {
      expect(Math.min(...sides)).toBeGreaterThanOrEqual(0.28 * perimeter - 0.01);
    }
    const multipliers = score.kind === "fai" ? [1.4, 1.6] : [1.2, 1.4];
    expect(score.multiplier).toBe(multipliers[score.closed ? 1 : 0]);
  });

  it("scores a long thin triangle as flat, closed ×1.4", () => {
    // Shortest side some 10 % of the triangle: not FAI.
    const corners = [at(0, 0), at(0, 20), at(3, 10), at(0, 0)];
    const score = xcScoreOf(flown(corners));
    expect(score?.kind).toBe("flat");
    expect(score?.closed).toBe(true);
    expect(score?.multiplier).toBe(1.4);
  });

  it("counts no triangle in a flight that never comes back", () => {
    // An L: any triangle on it leaves a gap of some 40 % of itself.
    const score = xcScoreOf(flown([at(0, 0), at(0, 10), at(10, 10)]));
    expect(score?.kind).toBe("free");
    expect(score?.distanceKm).toBeGreaterThan(19.9);
  });

  it("has no score without two positions, and is the same every time", () => {
    expect(xcScoreOf([])).toBeNull();
    expect(xcScoreOf([ORIGIN])).toBeNull();
    const track = flown([at(0, 0), at(0, 10), at(8.66, 5), at(0, 1)]);
    expect(xcScoreOf(track)).toEqual(xcScoreOf(track));
  });

  it("scores a three-hour flight in reasonable time", () => {
    // 10 800 fixes, one a second.
    const track: LatLon[] = Array.from({ length: 10_800 }, (_, i) => {
      const t = i / 10_800;
      return at(15 * Math.sin(t * Math.PI * 2) + 0.2 * Math.sin(i / 20), 20 * t);
    });
    const began = Date.now();
    expect(xcScoreOf(track)).not.toBeNull();
    expect(Date.now() - began).toBeLessThan(4000);
  });
});
