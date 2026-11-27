import { EGM96_CM_BASE64, EGM96_COLS, EGM96_ROWS, EGM96_STEP_DEG } from "./egm96Grid";
import { base64Bytes, geoidHeightM, seaLevelAltitudeM } from "./geoid";

describe("the EGM96 table", () => {
  it("covers the world one degree apart, two bytes a node", () => {
    expect(EGM96_STEP_DEG).toBe(1);
    expect(EGM96_ROWS).toBe(181);
    expect(EGM96_COLS).toBe(360);
    expect(base64Bytes(EGM96_CM_BASE64)).toHaveLength(2 * EGM96_ROWS * EGM96_COLS);
  });

  it("reads base64 like the standard does", () => {
    expect(Array.from(base64Bytes("AAEC/w=="))).toEqual([0, 1, 2, 255]);
    expect(Array.from(base64Bytes("TXVX"))).toEqual([77, 117, 87]);
    expect(() => base64Bytes("A!")).toThrow("not base64");
  });
});

describe("geoidHeightM", () => {
  // NGA's EGM96 15' grid at its own nodes, which the 1° table keeps as
  // they are (to the centimetre).
  it.each([
    [46, 11, 49.28],
    [45, 7, 52.96],
    [0, 0, 17.16],
    [-90, 0, -29.53],
    [90, 0, 13.61],
    [64, -19, 67.15],
    [5, 78, -104.68],
    [-8, 147, 84.23],
  ])("is NGA's value on a node: (%p, %p) → %p m", (lat, lon, metres) => {
    expect(geoidHeightM(lat, lon)).toBeCloseTo(metres, 2);
  });

  // NGA's check points of its EGM96 interpolation program (OUTINTPT.DAT,
  // 15' grid); the 1° table stays within half a metre there.
  it.each([
    [38.628155, 269.779155, -31.628],
    [-14.621217, 305.021114, -2.969],
    [46.874319, 102.448729, -43.575],
    [-23.617446, 133.874712, 15.871],
    [38.625473, 359.9995, 50.066],
    [-0.466744, 0.0023, 17.329],
  ])("stays near NGA's check point (%p, %p) → %p m", (lat, lon, metres) => {
    expect(Math.abs(geoidHeightM(lat, lon) - metres)).toBeLessThan(0.5);
  });

  // Flying places: NGA's 15' grid (bilinear) and the most the 1° table is
  // off in the Alps (2.4 m, measured by tools/egm96_grid.py).
  it.each([
    ["Monte Baldo", 45.75, 10.84, 48.15],
    ["Chamonix", 45.9237, 6.8694, 51.18],
    ["Bassano del Grappa", 45.78, 11.73, 47.07],
    ["Interlaken", 46.6863, 7.8632, 49.68],
    ["between nodes", 46.25, 10.75, 49.97],
  ])("is about +47–51 m in the Alps: %s", (_name, lat, lon, metres) => {
    expect(Math.abs(geoidHeightM(lat, lon) - metres)).toBeLessThan(2.5);
  });

  it("goes round the date line and holds at the poles", () => {
    expect(geoidHeightM(10, 180)).toBeCloseTo(geoidHeightM(10, -180), 6);
    expect(geoidHeightM(10, 179.5)).toBeCloseTo(geoidHeightM(10, -180.5), 6);
    expect(geoidHeightM(-90, 123)).toBeCloseTo(-29.53, 1);
    expect(Number.isFinite(geoidHeightM(95, 0))).toBe(true);
  });
});

describe("seaLevelAltitudeM", () => {
  const baldo = (altitude: number | null) => ({
    latitude: 45.75,
    longitude: 10.84,
    altitude,
  });

  it("takes the geoid off the ellipsoid height on Android", () => {
    // Monte Baldo's top, about 2218 m on the map: about 2266 m on the
    // ellipsoid, as an Android phone says it; N there is 47.0 m (NGA's 15'
    // grid: 48.15 m).
    const sea = seaLevelAltitudeM(baldo(2266), "android");
    expect(sea).toBeCloseTo(2266 - geoidHeightM(45.75, 10.84), 2);
    expect(sea).toBeGreaterThan(2215);
    expect(sea).toBeLessThan(2221);
    // Chamonix, the valley at 1035 m: N 51.2 m.
    const chamonix = { latitude: 45.9237, longitude: 6.8694, altitude: 1086.2 };
    expect(seaLevelAltitudeM(chamonix, "android")).toBeCloseTo(1035, 0);
  });

  it("leaves iOS as it is: it already gives the sea", () => {
    expect(seaLevelAltitudeM(baldo(2218), "ios")).toBe(2218);
    expect(seaLevelAltitudeM(baldo(2218), "web")).toBe(2218);
  });

  it("never makes up a height", () => {
    expect(seaLevelAltitudeM(baldo(null), "android")).toBeNull();
    expect(seaLevelAltitudeM(baldo(Number.NaN), "android")).toBeNaN();
    expect(
      seaLevelAltitudeM(
        { latitude: Number.NaN, longitude: 10.84, altitude: 500 },
        "android",
      ),
    ).toBe(500);
  });
});
