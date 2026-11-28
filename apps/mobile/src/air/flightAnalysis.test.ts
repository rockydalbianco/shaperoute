import { flightFixesOf } from "./flightArchive";
import { analysisOf, MAX_SAMPLES, trackOfFixes } from "./flightAnalysis";
import { flightOf, T0 } from "./syntheticFlight";

// A made-up flight: glide, thermal, glide, thermal, glide.
const FIXES = flightFixesOf(
  flightOf(
    [
      { kind: "glide", seconds: 120, airspeedMps: 10, headingDeg: 60, varioMps: -1.1 },
      {
        kind: "circle",
        seconds: 240,
        airspeedMps: 10,
        turnSeconds: 22,
        direction: 1,
        varioMps: 2.3,
      },
      { kind: "glide", seconds: 180, airspeedMps: 11, headingDeg: 100, varioMps: -1.3 },
      {
        kind: "circle",
        seconds: 300,
        airspeedMps: 10,
        turnSeconds: 20,
        direction: -1,
        varioMps: 1.6,
      },
      { kind: "glide", seconds: 120, airspeedMps: 10, headingDeg: 200, varioMps: -1.0 },
    ],
    { fromAltM: 2000 },
  ),
);

describe("analysisOf", () => {
  const analysis = analysisOf(FIXES)!;

  it("finds the two thermals, with their climb and their heights", () => {
    expect(analysis.thermals).toHaveLength(2);
    const [first, second] = analysis.thermals;
    expect(first.avgClimbMps).toBeGreaterThan(1.9);
    expect(first.avgClimbMps).toBeLessThan(2.4);
    expect(first.exitAltM).toBeGreaterThan(first.entryAltM + 400);
    expect(second.avgClimbMps).toBeGreaterThan(1.3);
    expect(second.avgClimbMps).toBeLessThan(1.7);
    expect(analysis.bestClimbMps).toBe(first.avgClimbMps);
  });

  it("finds the glides with a glide ratio from distance and height lost", () => {
    expect(analysis.glides.length).toBeGreaterThanOrEqual(3);
    const middle = analysis.glides[1];
    // 11 m/s over a sink of 1.3 m/s, with no wind: some 8.5.
    expect(middle.ld).toBeGreaterThan(7.5);
    expect(middle.ld).toBeLessThan(9.5);
    expect(middle.speedMps).toBeGreaterThan(10.5);
    expect(middle.speedMps).toBeLessThan(11.5);
  });

  it("gives the share of the time in thermals and the flight's numbers", () => {
    // 540 s circling of 960 s.
    expect(analysis.thermalShare).toBeGreaterThan(0.45);
    expect(analysis.thermalShare).toBeLessThan(0.65);
    expect(analysis.durationS).toBe(960);
    expect(analysis.startMs).toBe(T0);
    expect(analysis.maxAltM).toBeGreaterThan(2000 + 240 * 2.3);
  });

  it("samples the charts at most MAX_SAMPLES times, the vario from the heights", () => {
    expect(analysis.samples.length).toBeLessThanOrEqual(MAX_SAMPLES);
    expect(analysis.samples[0].varioMps).toBeNull();
    // In the middle of the first thermal.
    const inFirstThermal = analysis.samples.find((s) => s.atMs >= T0 + 240_000);
    expect(inFirstThermal?.varioMps).toBeCloseTo(2.3, 1);
    expect(inFirstThermal?.speedMps).toBeGreaterThan(9);
  });

  it("has no glide ratio, climb or height without heights", () => {
    const flat = analysisOf(FIXES.map((fix) => ({ ...fix, altM: null })))!;
    expect(flat.thermals).toEqual([]);
    expect(flat.maxAltM).toBeNull();
    expect(flat.bestClimbMps).toBeNull();
    expect(flat.glides.every((g) => g.ld === null)).toBe(true);
    expect(flat.samples.every((s) => s.varioMps === null)).toBe(true);
  });

  it("has no analysis of a single fix", () => {
    expect(analysisOf(FIXES.slice(0, 1))).toBeNull();
  });

  it("makes a track of the fixes, with its length", () => {
    const track = trackOfFixes(FIXES.slice(0, 3));
    expect(track.fixes[1]).toEqual({
      point: FIXES[1].point,
      timeMs: FIXES[1].timeMs,
      accuracyM: null,
      altitudeM: FIXES[1].altM,
    });
    expect(track.distanceM).toBeGreaterThan(15);
    expect(track.distanceM).toBeLessThan(25);
  });
});
