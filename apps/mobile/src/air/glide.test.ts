import {
  DEFAULT_AIRSPEED_MPS,
  DEFAULT_LD,
  glideOf,
  glideWith,
  groundRatio,
  heightForM,
} from "./glide";
import type { Wind } from "./wind";

function wind(fromDeg: number, speedMps: number, airspeedMps = 10): Wind {
  return { fromDeg, speedMps, airspeedMps, atMs: 0 } as Wind;
}

describe("glide", () => {
  it("glides at L/D 8 and trim speed without a wind", () => {
    const glide = glideOf(null);
    expect(glide).toEqual({
      ld: DEFAULT_LD,
      airspeedMps: DEFAULT_AIRSPEED_MPS,
      wind: null,
    });
    expect(groundRatio(glide, 123)).toBe(8);
    expect(heightForM([{ distM: 8000, courseDeg: 0 }], glide)).toBe(1000);
  });

  it("takes the airspeed of the wind's circles when it is a glider's", () => {
    expect(glideOf(wind(0, 3, 11)).airspeedMps).toBe(11);
    expect(glideOf(wind(0, 3, 40)).airspeedMps).toBe(DEFAULT_AIRSPEED_MPS);
  });

  it("goes further with the wind behind, less against it", () => {
    // A wind from the south, 4 m/s: flying north it pushes.
    const glide = glideOf(wind(180, 4));
    expect(groundRatio(glide, 0)).toBeCloseTo(8 * 1.4, 6);
    expect(groundRatio(glide, 180)).toBeCloseTo(8 * 0.6, 6);
    // Across it, the glider crabs: slower over the ground.
    expect(groundRatio(glide, 90)).toBeCloseTo((8 * Math.sqrt(100 - 16)) / 10, 6);
  });

  it("has no glide where the wind is as strong as the glider", () => {
    const glide = glideOf(wind(0, 12));
    expect(groundRatio(glide, 0)).toBeNull();
    expect(heightForM([{ distM: 1000, courseDeg: 0 }], glide)).toBeNull();
  });

  it("adds the legs' heights, each with its own course", () => {
    const glide = glideOf(wind(180, 4));
    const legs = [
      { distM: 11_200, courseDeg: 0 },
      { distM: 4_800, courseDeg: 180 },
      { distM: 0, courseDeg: 90 },
    ];
    expect(heightForM(legs, glide)).toBeCloseTo(2000, 6);
  });
});

describe("glideWith (part D3)", () => {
  it("takes the pilot's glide ratio, and the wind only when they chose it", () => {
    const blowing = wind(180, 4);
    expect(glideWith({ ld: 10, wind: "estimated" }, blowing)).toEqual(
      glideOf(blowing, 10),
    );
    expect(glideWith({ ld: 10, wind: "none" }, blowing)).toEqual(glideOf(null, 10));
  });
});
