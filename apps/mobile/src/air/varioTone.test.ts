/**
 * The vario's tone (TASK-479 part C): beeps from the climb threshold, a
 * step every 0.5 m/s up to +5; the low note past the sink threshold; a
 * margin against flicking; silence without fresh fixes.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { flightOf, T0 } from "./syntheticFlight";
import {
  CLIMB_LEVELS,
  climbLevel,
  sameTone,
  SINK_LEVELS,
  sinkLevel,
  SOUND_STALE_MS,
  soundClimbOf,
  toneFor,
  type VarioTone,
} from "./varioTone";

const DEFAULT = { climbFromMps: 0.2, sinkBelowMps: -2.5 };

describe("levels", () => {
  it("go a step every 0.5 m/s of climb, from 0 to +5 and more", () => {
    expect(climbLevel(0)).toBe(0);
    expect(climbLevel(0.49)).toBe(0);
    expect(climbLevel(0.5)).toBe(1);
    expect(climbLevel(2.7)).toBe(5);
    expect(climbLevel(5)).toBe(CLIMB_LEVELS - 1);
    expect(climbLevel(9)).toBe(CLIMB_LEVELS - 1);
  });

  it("go a step every 1 m/s of sink, from 2 to 5 and more", () => {
    expect(sinkLevel(-1.5)).toBe(0);
    expect(sinkLevel(-2.5)).toBe(0);
    expect(sinkLevel(-3)).toBe(1);
    expect(sinkLevel(-4.2)).toBe(2);
    expect(sinkLevel(-8)).toBe(SINK_LEVELS - 1);
  });

  it("each have a tone file", () => {
    const files = readdirSync(join(__dirname, "../../assets/sounds/vario")).filter(
      (name) => name.endsWith(".wav"),
    );
    expect(files.filter((name) => name.startsWith("climb-"))).toHaveLength(
      CLIMB_LEVELS,
    );
    expect(files.filter((name) => name.startsWith("sink-"))).toHaveLength(SINK_LEVELS);
  });
});

describe("toneFor", () => {
  it("beeps from the climb threshold, is silent in between, low below the sink one", () => {
    expect(toneFor(0.19, DEFAULT)).toBeNull();
    expect(toneFor(0.2, DEFAULT)).toEqual({ kind: "climb", level: 0 });
    expect(toneFor(3.1, DEFAULT)).toEqual({ kind: "climb", level: 6 });
    expect(toneFor(-1.2, DEFAULT)).toBeNull();
    expect(toneFor(-2.4, DEFAULT)).toBeNull();
    expect(toneFor(-2.5, DEFAULT)).toEqual({ kind: "sink", level: 0 });
    expect(toneFor(-4.5, DEFAULT)).toEqual({ kind: "sink", level: 2 });
  });

  it("follows the pilot's thresholds, and never sinks with the sink tone off", () => {
    expect(toneFor(0.3, { climbFromMps: 0.5, sinkBelowMps: -2.5 })).toBeNull();
    expect(toneFor(-1.6, { climbFromMps: 0.2, sinkBelowMps: -1.5 })).toEqual({
      kind: "sink",
      level: 0,
    });
    expect(toneFor(-6, { climbFromMps: 0.2, sinkBelowMps: null })).toBeNull();
  });

  it("is silent without a number", () => {
    expect(toneFor(null, DEFAULT)).toBeNull();
    expect(toneFor(Number.NaN, DEFAULT)).toBeNull();
  });

  it("keeps the step within the margin of a boundary", () => {
    const at1: VarioTone = { kind: "climb", level: 1 };
    // Step 1 is 0.5 to 1 m/s. 0.45 is step 0, but within 0.1 of step 1.
    expect(toneFor(0.45, DEFAULT, at1)).toEqual(at1);
    expect(toneFor(0.35, DEFAULT, at1)).toEqual({ kind: "climb", level: 0 });
    // And upwards: 1.05 is step 2, within 0.1 of step 1.
    expect(toneFor(1.05, DEFAULT, at1)).toEqual(at1);
    expect(toneFor(1.15, DEFAULT, at1)).toEqual({ kind: "climb", level: 2 });
  });

  it("keeps beeping or sinking within the margin of a threshold", () => {
    const beeping: VarioTone = { kind: "climb", level: 0 };
    expect(toneFor(0.15, DEFAULT, beeping)).toEqual(beeping);
    expect(toneFor(0.05, DEFAULT, beeping)).toBeNull();
    const sinking: VarioTone = { kind: "sink", level: 0 };
    expect(toneFor(-2.45, DEFAULT, sinking)).toEqual(sinking);
    expect(toneFor(-2.3, DEFAULT, sinking)).toBeNull();
  });

  it("compares tones", () => {
    expect(sameTone(null, null)).toBe(true);
    expect(sameTone({ kind: "climb", level: 2 }, { kind: "climb", level: 2 })).toBe(
      true,
    );
    expect(sameTone({ kind: "climb", level: 2 }, { kind: "sink", level: 2 })).toBe(
      false,
    );
    expect(sameTone(null, { kind: "sink", level: 0 })).toBe(false);
  });
});

describe("soundClimbOf", () => {
  const climbing = flightOf([
    { kind: "glide", seconds: 30, airspeedMps: 10, headingDeg: 90, varioMps: 2 },
  ]);
  const end = T0 + 30_000;

  it("is the climb of the last seconds", () => {
    expect(soundClimbOf(climbing, end)).toBeCloseTo(2, 5);
  });

  it("goes quiet once the fixes stop", () => {
    expect(soundClimbOf(climbing, end + SOUND_STALE_MS)).not.toBeNull();
    expect(soundClimbOf(climbing, end + SOUND_STALE_MS + 1)).toBeNull();
    expect(soundClimbOf({ fixes: [], distanceM: 0 }, end)).toBeNull();
  });
});
