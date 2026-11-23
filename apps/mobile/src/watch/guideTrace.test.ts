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

  describe("a closed route", () => {
    const joinStep = (t: Trace) => t.steps.findIndex((s) => s.route !== null);

    it("is joined half-way along a side and run round to there", () => {
      const t = trace("square-join-side");
      expect(t.anywhere).toBe(true);
      expect(t.start).toEqual([]);
      const at = joinStep(t);
      expect(at).toBeGreaterThan(0);
      expect(t.steps.slice(0, at).every((s) => s.waiting)).toBe(true);
      const joined = t.steps[at];
      expect(joined.joinedAtM).toBeGreaterThan(600);
      expect(joined.cues[0]).toMatchObject({ kind: "depart", index: 0 });
      expect(joined.route?.directions[0]).toMatchObject({
        turn: "depart",
        street: "Via Est",
      });
      expect(t.steps[t.steps.length - 1].arrived).toBe(true);
      expect(kinds(t)).not.toContain("offRoute");
    });

    it("is followed as drawn when joined near its start", () => {
      const t = trace("square-join-start");
      const joined = t.steps[joinStep(t)];
      expect(joined.joinedAtM).toBe(0);
      expect(joined.route?.directions).toEqual(t.directions);
    });

    it("says off the route, then back on it and where to head, when joined from off it", () => {
      const all = kinds(trace("square-join-from-off"));
      expect(all.slice(0, 2)).toEqual(["offRoute", "routeAt"]);
      expect(all.indexOf("backOnRoute")).toBe(2);
      expect(all[3]).toBe("depart");
      expect(all[all.length - 1]).toBe("arrived");
    });

    it("reads the turn just after where it is joined with the departure", () => {
      const joined = trace("square-join-corner").steps.find((s) => s.route !== null);
      expect(joined?.route?.directions[1]).toMatchObject({
        turn: "left",
        joined: true,
      });
    });

    it("is followed as drawn when joined just before its end", () => {
      const t = trace("square-join-near-end");
      expect(t.steps.find((s) => s.route !== null)?.joinedAtM).toBe(0);
    });

    it("is joined the wrong way round too, and then the runner is off it", () => {
      const t = trace("square-join-against");
      expect(joinStep(t)).toBeGreaterThan(0);
      expect(kinds(t)).toContain("offRoute");
    });

    it("is joined on the water, with no directions", () => {
      const t = trace("swim-join-half");
      const joined = t.steps[joinStep(t)];
      expect(joined.route?.directions).toEqual([]);
      expect(t.steps[t.steps.length - 1].arrived).toBe(true);
    });
  });

  describe("a route in pieces", () => {
    it.each([
      ["word", "O", false, false, false],
      ["parts", null, false, true, false],
      ["ride", "O", true, false, false],
      ["paddle", null, false, true, true],
    ] as const)(
      "lifts the pen and lowers it once, on the %s",
      (name, letter, ride, parts, paddle) => {
        const t = trace(`pen-${name}`);
        expect(t.pen).toMatchObject({ ride, parts, paddle });
        const cues = t.steps.flatMap((s) => s.pen?.cues ?? []);
        expect(cues).toEqual([
          { kind: "penUp", letter, vibrate: true },
          { kind: "penDown", letter, vibrate: true },
        ]);
        expect(t.steps[t.steps.length - 1].arrived).toBe(true);
      },
    );

    it("lowers the pen nearer the next part on the water", () => {
      expect(trace("pen-paddle").pen?.downM).toBeLessThan(
        trace("pen-parts").pen?.downM ?? 0,
      );
    });
  });
});
