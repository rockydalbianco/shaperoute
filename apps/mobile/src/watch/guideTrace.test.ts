import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { guideScenarios } from "./guideScenarios";
import { GUIDE_TRACE_DIR, type Trace, traceJson, traceOf } from "./guideTrace";

const DIR = path.join(__dirname, "..", "..", GUIDE_TRACE_DIR);
const traces = guideScenarios().map(traceOf);
const byName = new Map(traces.map((trace) => [trace.name, trace]));

function trace(name: string): Trace {
  const found = byName.get(name);
  if (found === undefined) {
    throw new Error(`No scenario ${name}`);
  }
  return found;
}

function kinds(t: Trace): string[] {
  return t.steps.flatMap((step) => step.cues.map((cue) => cue.kind));
}

describe("the watch's guide traces", () => {
  // scripts/watch-guide.sh sets it: the files are written again, then checked.
  if (process.env.WRITE_WATCH_GUIDE === "1") {
    mkdirSync(DIR, { recursive: true });
    for (const file of readdirSync(DIR)) {
      if (file.endsWith(".json") && !byName.has(file.replace(/\.json$/, ""))) {
        throw new Error(`${file} is of no scenario: remove it by hand`);
      }
    }
    for (const t of traces) {
      writeFileSync(path.join(DIR, `${t.name}.json`), traceJson(t));
    }
  }

  it("are the files the script writes, one for each scenario", () => {
    const files = readdirSync(DIR).filter((file) => file.endsWith(".json"));
    expect(files.sort()).toEqual(traces.map((t) => `${t.name}.json`).sort());
    for (const t of traces) {
      // When this fails, run apps/mobile/scripts/watch-guide.sh.
      const text = readFileSync(path.join(DIR, `${t.name}.json`), "utf8");
      expect(JSON.parse(text)).toEqual(JSON.parse(traceJson(t)));
    }
  });

  describe.each(["levico", "trento"])("on the route of %s", (route) => {
    it("says the departure, every turn and the end, going straight", () => {
      const t = trace(`${route}-straight`);
      expect(t.start.map((cue) => cue.kind)).toEqual(["depart"]);
      const last = t.steps[t.steps.length - 1];
      expect(last.arrived).toBe(true);
      expect(kinds(t)).not.toContain("offRoute");
      expect(kinds(t).filter((kind) => kind === "arrived")).toHaveLength(1);
      const announced = t.steps.flatMap((step) =>
        step.cues.flatMap((cue) =>
          cue.kind === "turn"
            ? Array.from({ length: cue.count }, (_, i) => cue.index + i)
            : [],
        ),
      );
      // Every direction after the departure, once, in order.
      const turns = t.directions.slice(1).map((_, i) => i + 1);
      expect(announced).toEqual(turns.slice(0, announced.length));
      expect(announced.length).toBeGreaterThan(0);
    });

    it("announces a turn further ahead on a bike", () => {
      const aheads = (t: Trace) =>
        t.steps.flatMap((s) =>
          s.cues.flatMap((c) => (c.kind === "turn" ? [c.aheadM] : [])),
        );
      const run = trace(`${route}-straight`);
      const bike = trace(`${route}-bike`);
      expect(Math.max(...aheads(run))).toBeLessThanOrEqual(run.announceM);
      expect(Math.max(...aheads(bike))).toBeGreaterThan(run.announceM);
      expect(Math.max(...aheads(bike))).toBeLessThanOrEqual(bike.announceM);
    });

    it.each(["detour", "detour-ahead", "no-times"])(
      "goes off the route and back on it, on the %s",
      (name) => {
        const t = trace(`${route}-${name}`);
        const all = kinds(t);
        expect(all).toContain("offRoute");
        expect(all).toContain("routeAt");
        expect(all.indexOf("backOnRoute")).toBeGreaterThan(all.indexOf("offRoute"));
        expect(t.steps[t.steps.length - 1].arrived).toBe(true);
      },
    );

    it("gets back on the route further on, after the detour ahead", () => {
      const t = trace(`${route}-detour-ahead`);
      const back = t.steps.findIndex((s) =>
        s.cues.some((c) => c.kind === "backOnRoute"),
      );
      const left = t.steps.findIndex((s) => s.offRoute);
      // Placed beyond where it was looked for when it left (AHEAD_M = 300).
      expect(t.steps[back].alongM - t.steps[left - 1].alongM).toBeGreaterThan(300);
    });

    it("finds the runner further on after a gap in the fixes", () => {
      const t = trace(`${route}-gap`);
      expect(t.steps.some((s) => s.lost)).toBe(true);
      expect(kinds(t)).not.toContain("offRoute");
      expect(t.steps[t.steps.length - 1].arrived).toBe(true);
    });

    it("reads poor fixes as nothing", () => {
      const t = trace(`${route}-poor`);
      expect(kinds(t)).not.toContain("offRoute");
      expect(t.steps[t.steps.length - 1].arrived).toBe(true);
    });
  });
});
